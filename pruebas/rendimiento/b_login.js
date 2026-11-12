// Escenario B: login con los 25 clientes de carga. 0→30 VUs.
// No escribe en la BD, pero se evalúa con el umbral de escrituras: bcrypt consume CPU a propósito.
import http from "k6/http";
import { check, sleep } from "k6";
import { API, CLAVE, emailCarga, ESTADISTICAS, JSON_HEADERS, rampa } from "./comun.js";

export const options = {
  stages: rampa(30),
  summaryTrendStats: ESTADISTICAS,
  thresholds: {
    "http_req_duration{name:login}": ["p(95)<1500"],
    "http_req_failed{name:login}": ["rate<0.01"],
    "http_reqs{name:login}": ["count>0"],
  },
};

export default function () {
  const res = http.post(`${API}/auth/login`, JSON.stringify({ email: emailCarga(__VU + __ITER), password: CLAVE }), {
    headers: JSON_HEADERS,
    tags: { name: "login" },
    timeout: "60s",
  });
  check(res, {
    "HTTP 200": (r) => r.status === 200,
    "trae token": (r) => r.status === 200 && !!r.json("token"),
  });
  sleep(1);
}
