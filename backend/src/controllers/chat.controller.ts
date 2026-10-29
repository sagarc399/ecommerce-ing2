import type { Request, Response } from "express";
import { responderChat } from "../chat/chat.service";
import { validarChat } from "../validators/chat.validator";

// No se registra en logs el contenido de los mensajes.
export async function chat(req: Request, res: Response) {
  const validacion = validarChat(req.body);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje });
  }

  const resultado = await responderChat(validacion.datos);
  return res.status(200).json(resultado);
}
