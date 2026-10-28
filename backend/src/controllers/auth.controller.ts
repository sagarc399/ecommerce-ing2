import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db";
import { env } from "../config/env";

const RONDAS_BCRYPT = 10;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

export async function registro(req: Request, res: Response) {
  // Solo se toman estos campos: cualquier "rol" enviado en el body se ignora.
  const { nombre, email, password } = req.body ?? {};

  if (!esTextoNoVacio(nombre) || !esTextoNoVacio(email) || !esTextoNoVacio(password)) {
    return res.status(400).json({ mensaje: "Los campos nombre, email y password son obligatorios" });
  }

  const emailNormalizado = email.trim().toLowerCase();
  if (!FORMATO_EMAIL.test(emailNormalizado)) {
    return res.status(400).json({ mensaje: "El email no tiene un formato válido" });
  }
  if (password.length < 8) {
    return res.status(400).json({ mensaje: "La contraseña debe tener al menos 8 caracteres" });
  }

  const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);

  try {
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, 'cliente')
       RETURNING id, nombre, email, rol`,
      [nombre.trim(), emailNormalizado, passwordHash]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    // 23505 = violación de restricción UNIQUE (email repetido)
    if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
      return res.status(409).json({ mensaje: "El email ya está registrado" });
    }
    throw err;
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body ?? {};

  if (!esTextoNoVacio(email) || !esTextoNoVacio(password)) {
    return res.status(400).json({ mensaje: "Los campos email y password son obligatorios" });
  }

  const { rows } = await pool.query(
    "SELECT id, nombre, email, rol, password_hash FROM usuarios WHERE email = $1",
    [email.trim().toLowerCase()]
  );
  const usuario = rows[0];

  // Mismo mensaje si el email no existe o la contraseña es incorrecta.
  if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
    return res.status(401).json({ mensaje: "Credenciales inválidas" });
  }

  const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });

  return res.status(200).json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  });
}

export async function me(req: Request, res: Response) {
  const { rows } = await pool.query("SELECT id, nombre, email, rol FROM usuarios WHERE id = $1", [req.usuario!.id]);

  if (rows.length === 0) {
    return res.status(404).json({ mensaje: "Usuario no encontrado" });
  }
  return res.status(200).json(rows[0]);
}
