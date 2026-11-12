// Escenario C2: checkout con CONTENCIÓN. Todos los VUs compran el MISMO producto.
// Mide el efecto del bloqueo FOR UPDATE más los 500 ms del pago simulado dentro de la transacción.
import { check, sleep } from "k6";
import { comprar, ESTADISTICAS, prepararCheckout, rampa } from "./comun.js";

export const options = {
  stages: rampa(Number(__ENV.VUS) || 20),
  summaryTrendStats: ESTADISTICAS,
  setupTimeout: "120s",
  thresholds: {
    "http_req_duration{name:checkout}": ["p(95)<1500"],
    "http_req_failed{name:checkout}": ["rate<0.01"],
    "http_reqs{name:checkout}": ["count>0"],
  },
};

export function setup() {
  return prepararCheckout();
}

export default function (datos) {
  const token = datos.tokens[(__VU - 1) % datos.tokens.length];
  const res = comprar(token, datos.productos[0]);
  check(res, {
    "HTTP 201": (r) => r.status === 201,
    "orden PAGADA": (r) => r.status === 201 && r.json("estado") === "PAGADA",
  });
  sleep(1);
}
