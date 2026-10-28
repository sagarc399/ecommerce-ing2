import { Router } from "express";
import { crearOrden, listarOrdenesAdmin, misOrdenes, obtenerOrden } from "../controllers/ordenes.controller";
import { requiereRol, verificarToken } from "../middleware/auth";

// /api/ordenes
const router = Router();

router.post("/", verificarToken, requiereRol("cliente"), crearOrden);
// /mias va antes de /:id para que no se tome como un id.
router.get("/mias", verificarToken, requiereRol("cliente"), misOrdenes);
router.get("/:id", verificarToken, obtenerOrden);

// /api/admin/ordenes
export const adminOrdenesRouter = Router();
adminOrdenesRouter.get("/", verificarToken, requiereRol("admin"), listarOrdenesAdmin);

export default router;
