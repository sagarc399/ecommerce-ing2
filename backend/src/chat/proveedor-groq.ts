// Proveedor Groq: API compatible con OpenAI, con fetch directo (sin SDK).
import { ErrorHttpProveedor, type MensajeChat, type ProveedorChat } from "./proveedor";
import { PROMPT_SISTEMA } from "./prompt-sistema";

const URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 8_000;
// gpt-oss es un modelo de razonamiento: el razonamiento también consume max_tokens,
// por eso el margen es amplio (con 300 la respuesta final puede llegar vacía).
const MAX_TOKENS = 800;

interface RespuestaGroq {
  choices?: { message?: { content?: string | null } }[];
}

export class ProveedorGroq implements ProveedorChat {
  readonly nombre = "groq" as const;
  private readonly apiKey: string;
  private readonly modelo: string;

  constructor(apiKey: string, modelo: string) {
    this.apiKey = apiKey;
    this.modelo = modelo;
  }

  async responder(mensajes: MensajeChat[]): Promise<string> {
    const respuesta = await fetch(URL_GROQ, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.modelo,
        messages: [
          { role: "system", content: PROMPT_SISTEMA },
          ...mensajes.map((m) => ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.texto })),
        ],
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
        reasoning_effort: "low", // menos razonamiento = menos latencia
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!respuesta.ok) {
      throw new ErrorHttpProveedor(respuesta.status, `Groq respondió HTTP ${respuesta.status}`);
    }

    // Solo se usa content: el campo de razonamiento (message.reasoning) nunca se muestra al usuario.
    const datos = (await respuesta.json()) as RespuestaGroq;
    const texto = datos.choices?.[0]?.message?.content?.trim();
    if (!texto) throw new Error("Groq devolvió una respuesta vacía");
    return texto;
  }
}
