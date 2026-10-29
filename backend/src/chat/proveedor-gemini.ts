import { ApiError, GoogleGenAI } from "@google/genai";
import type { MensajeChat, ProveedorChat } from "./proveedor";
import { PROMPT_SISTEMA } from "./prompt-sistema";

// Tiempo TOTAL de Gemini, reintento incluido: pasado este tiempo responde el proveedor de reglas,
// así el usuario nunca espera más de 8 s.
const TIMEOUT_TOTAL_MS = 8_000;
// Un 503 ("high demand") o 500 de Google suele ser momentáneo: se reintenta una vez,
// solo si quedan al menos 4 s dentro del mismo límite total.
const ESTADOS_REINTENTABLES = new Set([500, 503]);
const TIEMPO_MINIMO_REINTENTO_MS = 4_000;

// Rechaza si la promesa no termina antes del límite (respaldo por si el SDK no respeta el abortSignal).
function conLimite<T>(promesa: Promise<T>, limite: number): Promise<T> {
  let temporizador: NodeJS.Timeout | undefined;
  const vencido = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new DOMException("Tiempo agotado", "TimeoutError")), Math.max(0, limite - Date.now()));
  });
  return Promise.race([promesa, vencido]).finally(() => clearTimeout(temporizador));
}

export class ProveedorGemini implements ProveedorChat {
  readonly nombre = "gemini" as const;
  private readonly cliente: GoogleGenAI;
  private readonly modelo: string;

  constructor(apiKey: string, modelo: string) {
    this.cliente = new GoogleGenAI({ apiKey });
    this.modelo = modelo;
  }

  async responder(mensajes: MensajeChat[]): Promise<string> {
    // Gemini espera que la conversación empiece con el usuario: se omiten mensajes iniciales del asistente
    // (p. ej. la bienvenida del frontend).
    const inicio = mensajes.findIndex((m) => m.rol === "usuario");
    const contenidos = mensajes.slice(inicio).map((m) => ({
      role: m.rol === "usuario" ? "user" : "model",
      parts: [{ text: m.texto }],
    }));

    const limite = Date.now() + TIMEOUT_TOTAL_MS;
    try {
      return await conLimite(this.generar(contenidos, limite), limite);
    } catch (err) {
      const reintentable = err instanceof ApiError && ESTADOS_REINTENTABLES.has(err.status);
      if (!reintentable || limite - Date.now() < TIEMPO_MINIMO_REINTENTO_MS) throw err;
      return conLimite(this.generar(contenidos, limite), limite);
    }
  }

  private async generar(contenidos: { role: string; parts: { text: string }[] }[], limite: number): Promise<string> {
    const restante = Math.max(1, limite - Date.now());
    const respuesta = await this.cliente.models.generateContent({
      model: this.modelo,
      contents: contenidos,
      config: {
        systemInstruction: PROMPT_SISTEMA,
        temperature: 0.4,
        maxOutputTokens: 400,
        // El corte es del lado del cliente: no se usa httpOptions.timeout porque Google rechaza
        // (400) plazos menores a 10 s.
        abortSignal: AbortSignal.timeout(restante),
      },
    });

    const texto = respuesta.text?.trim();
    if (!texto) throw new Error("Gemini devolvió una respuesta vacía");
    return texto;
  }
}
