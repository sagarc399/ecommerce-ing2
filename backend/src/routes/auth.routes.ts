import { Router } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { registro, login, me } from "../controllers/auth.controller";
import { verificarToken } from "../middleware/auth";

// SEG-02: 5 intentos FALLIDOS de login por combinación IP + email en 15 minutos.
// Los logins exitosos no cuentan (skipSuccessfulRequests), así no se afecta a los usuarios legítimos.
const limitadorLogin = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${ipKeyGenerator(req.ip ?? "")}|${email}`;
  },
  message: { mensaje: "Demasiados intentos fallidos de inicio de sesión. Espera 15 minutos e intenta de nuevo." },
});

const router = Router();

router.post("/registro", registro);
router.post("/login", limitadorLogin, login);
router.get("/me", verificarToken, me);

export default router;
