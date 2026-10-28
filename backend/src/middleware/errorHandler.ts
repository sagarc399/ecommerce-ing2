import type { Request, Response, NextFunction } from "express";

export function rutaNoEncontrada(_req: Request, res: Response) {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
}

// Manejador central: registra el detalle en el servidor y responde sin filtrar información interna.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // JSON mal formado en el body (lo lanza express.json)
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    return res.status(400).json({ mensaje: "El cuerpo de la petición no es un JSON válido" });
  }

  console.error(err);
  res.status(500).json({ mensaje: "Error interno del servidor" });
}
