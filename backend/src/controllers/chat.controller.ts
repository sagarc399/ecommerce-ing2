import type { Request, Response } from "express";
import { responderChat } from "../chat/chat.service";
import { validarChat } from "../validators/chat.validator";

// No se registra en logs el contenido de los mensajes ni los resultados de las herramientas.
// req.usuario lo pone autenticacionOpcional solo si el token es válido; si no, el chat sigue como anónimo.
export async function chat(req: Request, res: Response) {
  const validacion = validarChat(req.body);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje });
  }

  const resultado = await responderChat(validacion.datos, { usuario: req.usuario ?? null });
  return res.status(200).json(resultado);
}
