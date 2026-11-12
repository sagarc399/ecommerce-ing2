// Escenario A: catálogo con búsqueda y paginación. 0→50 VUs.
import http from "k6/http";
import { check, sleep } from "k6";
import { API, ESTADISTICAS, rampa } from "./comun.js";

const TEXTOS = ["", "", "monitor", "cargador", "algodón", "deportiva", "juego", "usb", "tenis", "xyz-sin-resultado"];
const CATEGORIAS = ["", "", "Tecnología", "Hogar", "Deportes", "Ropa"];

export const options = {
  stages: rampa(50),
  summaryTrendStats: ESTADISTICAS,
  thresholds: {
    "http_req_duration{name:catalogo}": ["p(95)<500"],
    "http_req_failed{name:catalogo}": ["rate<0.01"],
    "http_reqs{name:catalogo}": ["count>0"],
  },
};

const elegir = (lista) => lista[Math.floor(Math.random() * lista.length)];

export default function () {
  const params = [`pagina=${1 + Math.floor(Math.random() * 3)}`];
  const texto = elegir(TEXTOS);
  const categoria = elegir(CATEGORIAS);
  if (texto) params.push(`buscar=${encodeURIComponent(texto)}`);
  if (categoria) params.push(`categoria=${encodeURIComponent(categoria)}`);

  const res = http.get(`${API}/productos?${params.join("&")}`, { tags: { name: "catalogo" } });
  check(res, {
    "HTTP 200": (r) => r.status === 200,
    "trae datos y total": (r) => r.status === 200 && Array.isArray(r.json("datos")) && r.json("total") !== undefined,
  });
  sleep(1);
}
