import { ApiError } from "@google/genai";
import { chatEnv } from "../config/env";
import type { MensajeChat, NombreProveedor, ProveedorChat } from "./proveedor";
import { ProveedorGemini } from "./proveedor-gemini";
import { ProveedorReglas } from "./proveedor-reglas";

const respaldo = new ProveedorReglas();

// Se elige una sola vez al arrancar. Una configuración incompleta nunca impide que la tienda arranque.
function elegirProveedor(): ProveedorChat {
  const { CHAT_PROVEEDOR, GEMINI_API_KEY, GEMINI_MODEL } = chatEnv;

  if (CHAT_PROVEEDOR === "gemini") {
    if (GEMINI_API_KEY && GEMINI_MODEL) {
      console.log(`Chat: proveedor gemini (modelo ${GEMINI_MODEL})`);
      return new ProveedorGemini(GEMINI_API_KEY, GEMINI_MODEL);
    }
    const faltan = [!GEMINI_API_KEY && "GEMINI_API_KEY", !GEMINI_MODEL && "GEMINI_MODEL"].filter(Boolean).join(" y ");
    console.warn(`Chat: CHAT_PROVEEDOR=gemini pero falta ${faltan} en .env; se usan respuestas por reglas`);
    return respaldo;
  }

  if (CHAT_PROVEEDOR !== "reglas") {
    console.warn(`Chat: CHAT_PROVEEDOR no definido o no válido; se usan respuestas por reglas`);
  } else {
    console.log("Chat: proveedor reglas");
  }
  return respaldo;
}

const principal = elegirProveedor();

// Descripción del fallo para el log, sin incluir el contenido de los mensajes ni la key.
function motivoDeFallo(err: unknown): string {
  if (err instanceof ApiError) return `HTTP ${err.status}`;
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) return "timeout";
  return err instanceof Error ? err.name : "error desconocido";
}

export async function responderChat(
  mensajes: MensajeChat[]
): Promise<{ respuesta: string; proveedor: NombreProveedor }> {
  if (principal !== respaldo) {
    try {
      return { respuesta: await principal.responder(mensajes), proveedor: principal.nombre };
    } catch (err) {
      console.warn(`Chat: ${principal.nombre} falló (${motivoDeFallo(err)}); se responde con reglas`);
    }
  }
  return { respuesta: await respaldo.responder(mensajes), proveedor: respaldo.nombre };
}
