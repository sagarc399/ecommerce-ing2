// Simulador de pasarela de pago. No guarda ni registra el número de tarjeta ni el CVV.
import { randomInt } from "node:crypto";

export type EstadoPago = "APROBADO" | "RECHAZADO";

export interface ResultadoPago {
  estado: EstadoPago;
  referencia: string;
  ultimos4: string;
}

const LATENCIA_MS = 500;
const CARACTERES_REFERENCIA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generarReferencia(): string {
  let codigo = "";
  for (let i = 0; i < 10; i++) {
    codigo += CARACTERES_REFERENCIA[randomInt(CARACTERES_REFERENCIA.length)];
  }
  return `PAY-${codigo}`;
}

// Regla de la simulación: tarjeta que termina en 0000 → RECHAZADO; cualquier otra → APROBADO.
export async function procesarPago(numeroTarjeta: string): Promise<ResultadoPago> {
  await esperar(LATENCIA_MS);
  const ultimos4 = numeroTarjeta.slice(-4);
  return {
    estado: ultimos4 === "0000" ? "RECHAZADO" : "APROBADO",
    referencia: generarReferencia(),
    ultimos4,
  };
}
