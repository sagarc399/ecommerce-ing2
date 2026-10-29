// Validación del cuerpo de POST /api/chat.
import type { MensajeChat } from "../chat/proveedor";
import type { Resultado } from "./comunes";

const MAXIMO_CARACTERES = 500;
const MAXIMO_MENSAJES_RECIBIDOS = 50;
const MENSAJES_AL_MODELO = 10;

export function validarChat(body: unknown): Resultado<MensajeChat[]> {
  const mensajes = typeof body === "object" && body !== null ? (body as Record<string, unknown>).mensajes : undefined;

  if (!Array.isArray(mensajes) || mensajes.length === 0) {
    return { ok: false, mensaje: "El campo mensajes debe ser un arreglo con al menos un mensaje" };
  }
  if (mensajes.length > MAXIMO_MENSAJES_RECIBIDOS) {
    return { ok: false, mensaje: `El campo mensajes admite máximo ${MAXIMO_MENSAJES_RECIBIDOS} elementos` };
  }

  const limpios: MensajeChat[] = [];
  for (const [i, m] of mensajes.entries()) {
    const { rol, texto } = (typeof m === "object" && m !== null ? m : {}) as Record<string, unknown>;
    if (rol !== "usuario" && rol !== "asistente") {
      return { ok: false, mensaje: `mensajes[${i}].rol debe ser "usuario" o "asistente"` };
    }
    if (typeof texto !== "string" || texto.trim().length < 1 || texto.trim().length > MAXIMO_CARACTERES) {
      return { ok: false, mensaje: `mensajes[${i}].texto debe tener entre 1 y ${MAXIMO_CARACTERES} caracteres` };
    }
    limpios.push({ rol, texto: texto.trim() });
  }

  if (limpios[limpios.length - 1].rol !== "usuario") {
    return { ok: false, mensaje: "El último mensaje debe ser del usuario" };
  }

  // Al modelo solo se envían los últimos 10 mensajes.
  return { ok: true, datos: limpios.slice(-MENSAJES_AL_MODELO) };
}
