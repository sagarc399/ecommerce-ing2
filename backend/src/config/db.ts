import { Pool } from "pg";
import { env } from "./env";

// Tamaño del pool (el valor por defecto de pg) y espera máxima por una conexión libre.
// Sin connectionTimeoutMillis, una petición esperaba para siempre si el pool se agotaba (REN-01).
// Con 5 s, si algún día se agota, la petición falla con 503 y un mensaje claro (ver errorHandler).
export const POOL_MAXIMO = 10;
export const POOL_ESPERA_MS = 5_000;

export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  max: POOL_MAXIMO,
  connectionTimeoutMillis: POOL_ESPERA_MS,
});
