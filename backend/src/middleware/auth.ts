import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type Rol = "admin" | "cliente";

export interface UsuarioToken {
  id: number;
  rol: Rol;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

export function verificarToken(req: Request, res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization;
  if (!encabezado || !encabezado.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  const token = encabezado.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ mensaje: "Token no proporcionado" });
  }

  const usuario = leerUsuarioDelToken(token);
  if (!usuario) {
    return res.status(401).json({ mensaje: "Token inválido o expirado" });
  }
  req.usuario = usuario;
  next();
}

// Devuelve { id, rol } si el token es válido y no ha expirado; si no, null.
function leerUsuarioDelToken(token: string): UsuarioToken | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === "string" || typeof payload.id !== "number" || typeof payload.rol !== "string") {
      return null;
    }
    return { id: payload.id, rol: payload.rol as Rol };
  } catch {
    return null;
  }
}

// Autenticación opcional (chat): si hay un token válido guarda req.usuario; si no hay o es inválido,
// sigue como anónimo sin responder 401.
export function autenticacionOpcional(req: Request, _res: Response, next: NextFunction) {
  const encabezado = req.headers.authorization;
  const token = encabezado?.startsWith("Bearer ") ? encabezado.slice("Bearer ".length).trim() : "";
  const usuario = token ? leerUsuarioDelToken(token) : null;
  if (usuario) req.usuario = usuario;
  next();
}

export function requiereRol(...roles: Rol[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(401).json({ mensaje: "Token no proporcionado" });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: "No tiene permisos para esta acción" });
    }
    next();
  };
}
