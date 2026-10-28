import { Router } from "express";
import { registro, login, me } from "../controllers/auth.controller";
import { verificarToken } from "../middleware/auth";

const router = Router();

router.post("/registro", registro);
router.post("/login", login);
router.get("/me", verificarToken, me);

export default router;
