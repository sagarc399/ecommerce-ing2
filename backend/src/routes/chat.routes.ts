import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { chat } from "../controllers/chat.controller";

// 10 peticiones por minuto por IP: protege la cuota de la API de Gemini.
const limitador = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { mensaje: "Demasiados mensajes, espera un momento" },
});

// /api/chat (público, no requiere login)
const router = Router();

router.post("/", limitador, chat);

export default router;
