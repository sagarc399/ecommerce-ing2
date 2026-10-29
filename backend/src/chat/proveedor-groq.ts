// Proveedor Groq: API compatible con OpenAI, con fetch directo (sin SDK).
// v2: usa function calling con las herramientas de solo lectura de herramientas.ts.
import { DEFINICIONES_HERRAMIENTAS, ejecutarHerramienta } from "./herramientas";
import { ErrorHttpProveedor, type ContextoChat, type MensajeChat, type ProveedorChat } from "./proveedor";
import { PROMPT_SISTEMA } from "./prompt-sistema";

const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";
// Tiempo TOTAL, rondas de herramientas incluidas: si se pasa, chat.service responde con reglas.
const TIMEOUT_TOTAL_MS = 12_000;
const MAXIMO_RONDAS_HERRAMIENTAS = 3;
// gpt-oss es un modelo de razonamiento: el razonamiento también consume max_tokens,
// por eso el margen es amplio (con 300 la respuesta final puede llegar vacía).
const MAX_TOKENS = 800;

// El chat muestra texto plano: aunque el prompt lo pide, el modelo a veces usa **negritas** de Markdown.
function quitarNegritas(texto: string): string {
  return texto.replace(/\*\*(.+?)\*\*/g, "$1").replace(/__(.+?)__/g, "$1");
}

interface LlamadaHerramienta {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface MensajeGroq {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: LlamadaHerramienta[];
  tool_call_id?: string;
}

interface RespuestaGroq {
  choices?: { message?: { content?: string | null; tool_calls?: LlamadaHerramienta[] } }[];
}

export class ProveedorGroq implements ProveedorChat {
  readonly nombre = "groq" as const;
  private readonly apiKey: string;
  private readonly modelo: string;

  constructor(apiKey: string, modelo: string) {
    this.apiKey = apiKey;
    this.modelo = modelo;
  }

  async responder(mensajes: MensajeChat[], contexto: ContextoChat): Promise<string> {
    const limite = Date.now() + TIMEOUT_TOTAL_MS;
    const conversacion: MensajeGroq[] = [
      { role: "system", content: PROMPT_SISTEMA },
      ...mensajes.map((m): MensajeGroq => ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.texto })),
    ];

    // Hasta 3 rondas en las que el modelo puede pedir herramientas; en la última llamada se le
    // obliga a responder con texto (tool_choice: "none").
    for (let ronda = 0; ronda <= MAXIMO_RONDAS_HERRAMIENTAS; ronda++) {
      const forzarTexto = ronda === MAXIMO_RONDAS_HERRAMIENTAS;
      const mensaje = await this.llamar(conversacion, forzarTexto, limite);
      const llamadas = mensaje.tool_calls ?? [];

      if (llamadas.length === 0 || forzarTexto) {
        // Solo se usa content: el razonamiento del modelo (message.reasoning) nunca se muestra.
        const texto = quitarNegritas(mensaje.content ?? "").trim();
        if (!texto) throw new Error("Groq devolvió una respuesta vacía");
        return texto;
      }

      conversacion.push({ role: "assistant", content: mensaje.content ?? "", tool_calls: llamadas });
      for (const llamada of llamadas) {
        // El usuario de mis_pedidos/estado_pedido viene del contexto (token JWT), nunca del modelo.
        const resultado = await ejecutarHerramienta(llamada.function.name, llamada.function.arguments, contexto);
        conversacion.push({ role: "tool", tool_call_id: llamada.id, content: JSON.stringify(resultado) });
      }
    }
    throw new Error("Groq no terminó dentro del máximo de rondas");
  }

  private async llamar(conversacion: MensajeGroq[], forzarTexto: boolean, limite: number) {
    const restante = limite - Date.now();
    if (restante <= 0) throw new DOMException("Tiempo agotado", "TimeoutError");

    const respuesta = await fetch(URL_GROQ, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelo,
        messages: conversacion,
        tools: DEFINICIONES_HERRAMIENTAS,
        tool_choice: forzarTexto ? "none" : "auto",
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
        reasoning_effort: "low", // menos razonamiento = menos latencia
      }),
      signal: AbortSignal.timeout(restante),
    });

    if (!respuesta.ok) {
      throw new ErrorHttpProveedor(respuesta.status, `Groq respondió HTTP ${respuesta.status}`);
    }
    const datos = (await respuesta.json()) as RespuestaGroq;
    const mensaje = datos.choices?.[0]?.message;
    if (!mensaje) throw new Error("Groq devolvió una respuesta sin mensaje");
    return mensaje;
  }
}
