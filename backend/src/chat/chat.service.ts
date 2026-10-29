import { ApiError } from "@google/genai";
import { chatEnv } from "../config/env";
import { ErrorHttpProveedor, type ContextoChat, type MensajeChat, type NombreProveedor, type ProveedorChat } from "./proveedor";
import { ProveedorGemini } from "./proveedor-gemini";
import { ProveedorGroq } from "./proveedor-groq";
import { ProveedorReglas } from "./proveedor-reglas";

const respaldo = new ProveedorReglas();

// Crea el proveedor externo si están sus dos variables; si falta alguna, avisa y usa reglas.
function crearExterno(
  nombre: "groq" | "gemini",
  apiKey: string | undefined,
  modelo: string | undefined,
  crear: (apiKey: string, modelo: string) => ProveedorChat
): ProveedorChat {
  const prefijo = nombre.toUpperCase();
  if (apiKey && modelo) {
    console.log(`Chat: proveedor ${nombre} (modelo ${modelo})`);
    return crear(apiKey, modelo);
  }
  const faltan = [!apiKey && `${prefijo}_API_KEY`, !modelo && `${prefijo}_MODEL`].filter(Boolean).join(" y ");
  console.warn(`Chat: CHAT_PROVEEDOR=${nombre} pero falta ${faltan} en .env; se usan respuestas por reglas`);
  return respaldo;
}

// Se elige una sola vez al arrancar (CHAT_PROVEEDOR: groq | gemini | reglas).
// Una configuración incompleta nunca impide que la tienda arranque.
function elegirProveedor(): ProveedorChat {
  const { CHAT_PROVEEDOR, GROQ_API_KEY, GROQ_MODEL, GEMINI_API_KEY, GEMINI_MODEL } = chatEnv;

  switch (CHAT_PROVEEDOR) {
    case "groq":
      return crearExterno("groq", GROQ_API_KEY, GROQ_MODEL, (k, m) => new ProveedorGroq(k, m));
    case "gemini":
      return crearExterno("gemini", GEMINI_API_KEY, GEMINI_MODEL, (k, m) => new ProveedorGemini(k, m));
    case "reglas":
      console.log("Chat: proveedor reglas");
      return respaldo;
    default:
      console.warn("Chat: CHAT_PROVEEDOR no definido o no válido (usa groq, gemini o reglas); se usan respuestas por reglas");
      return respaldo;
  }
}

const principal = elegirProveedor();

// Descripción del fallo para el log, sin incluir el contenido de los mensajes ni la key.
function motivoDeFallo(err: unknown): string {
  if (err instanceof ErrorHttpProveedor || err instanceof ApiError) return `HTTP ${err.status}`;
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) return "timeout";
  return err instanceof Error ? err.message || err.name : "error desconocido";
}

// Un solo respaldo: si el proveedor principal falla (timeout, 429, 5xx, key inválida, red, respuesta vacía),
// responde el de reglas. No se encadenan proveedores externos.
export async function responderChat(
  mensajes: MensajeChat[],
  contexto: ContextoChat
): Promise<{ respuesta: string; proveedor: NombreProveedor }> {
  if (principal !== respaldo) {
    try {
      return { respuesta: await principal.responder(mensajes, contexto), proveedor: principal.nombre };
    } catch (err) {
      console.warn(`Chat: ${principal.nombre} falló (${motivoDeFallo(err)}); se responde con reglas`);
    }
  }
  // Las reglas no consultan la BD, así que no necesitan el contexto del usuario.
  return { respuesta: await respaldo.responder(mensajes), proveedor: respaldo.nombre };
}
