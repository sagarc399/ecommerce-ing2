import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { chat } from "../controllers/chat.controller";
import { autenticacionOpcional } from "../middleware/auth";

// 10 peticiones por minuto por IP: protege la cuota del proveedor del chat.
const limitador = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { mensaje: "Demasiados mensajes, espera un momento" },
});

// /api/chat (público; si llega un token válido, el chat puede consultar los pedidos de ese usuario)
const router = Router();

router.post("/", limitador, autenticacionOpcional, chat);

export default router;
