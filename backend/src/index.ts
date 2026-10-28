import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { pool } from "./config/db";
import authRoutes from "./routes/auth.routes";
import { errorHandler, rutaNoEncontrada } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.status(200).json({ estado: "ok" });
});

app.use("/api/auth", authRoutes);

app.use(rutaNoEncontrada);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${env.PORT}`);
});
