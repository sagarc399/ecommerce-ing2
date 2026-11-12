import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import { pool } from "./config/db";
import authRoutes from "./routes/auth.routes";
import productosRoutes, { adminProductosRouter } from "./routes/productos.routes";
import ordenesRoutes, { adminOrdenesRouter } from "./routes/ordenes.routes";
import chatRoutes from "./routes/chat.routes";
import { errorHandler, rutaNoEncontrada } from "./middleware/errorHandler";

const app = express();

// SEG-04/05: cabeceras de seguridad. La API solo responde JSON (las imágenes las sirve el frontend),
// así que la CSP puede ser la más estricta: nada se carga ni se embebe desde sus respuestas.
// helmet también quita X-Powered-By; disable() lo asegura aunque cambie la configuración.
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  })
);
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.status(200).json({ estado: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/admin/productos", adminProductosRouter);
app.use("/api/ordenes", ordenesRoutes);
app.use("/api/admin/ordenes", adminOrdenesRouter);
app.use("/api/chat", chatRoutes);

app.use(rutaNoEncontrada);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${env.PORT}`);
});
