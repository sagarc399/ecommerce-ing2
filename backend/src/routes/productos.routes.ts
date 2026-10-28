import { Router } from "express";
import {
  activar,
  actualizar,
  crear,
  desactivar,
  listarAdmin,
  listarCategorias,
  listarPublico,
  obtenerPorId,
} from "../controllers/productos.controller";
import { requiereRol, verificarToken } from "../middleware/auth";

const soloAdmin = [verificarToken, requiereRol("admin")];

// /api/productos
const router = Router();

// Públicas. /categorias va antes de /:id para que no se tome como un id.
router.get("/", listarPublico);
router.get("/categorias", listarCategorias);
router.get("/:id", obtenerPorId);

// Solo admin
router.post("/", ...soloAdmin, crear);
router.put("/:id", ...soloAdmin, actualizar);
router.delete("/:id", ...soloAdmin, desactivar);
router.patch("/:id/activar", ...soloAdmin, activar);

// /api/admin/productos
export const adminProductosRouter = Router();
adminProductosRouter.get("/", ...soloAdmin, listarAdmin);

export default router;
