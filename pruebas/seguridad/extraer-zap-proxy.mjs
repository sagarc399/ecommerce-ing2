// Paso 2.3.1: extrae de un ZAP en modo daemon (proxy en 127.0.0.1:8090) el árbol de sitios y las alertas pasivas
// que generó la navegación por el proxy (pruebas/regresion/flujo.mjs con PROXY=...) y el AJAX spider.
// Uso: node pruebas/seguridad/extraer-zap-proxy.mjs  → pruebas/seguridad/proxy/
// Separa: rutas de la app (frontend), recursos del servidor de desarrollo de Vite (/src, /node_modules, /@vite…)
// y endpoints del backend (/api). Las URL se guardan sin query string; la evidencia de las alertas se recorta y se
// descarta si parece un token.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ZAP = process.env.ZAP_API || "http://127.0.0.1:8090";
const SALIDA = join(dirname(fileURLToPath(import.meta.url)), "proxy");
mkdirSync(SALIDA, { recursive: true });
const api = async (ruta) => (await fetch(`${ZAP}${ruta}`)).json();

const RIESGOS = ["High", "Medium", "Low", "Informational"];
const esVite = (p) => /^\/(src|node_modules|@vite|@react-refresh|@fs|@id)\b/.test(p) || /\.(tsx?|jsx?)$/.test(p) && p.startsWith("/src");
const clasificar = (u) => {
  const url = new URL(u);
  if (url.port === "3000") return "api";
  return esVite(url.pathname) ? "vite" : "frontend";
};

// Árbol de sitios: todas las URL que pasaron por ZAP (flujo + AJAX spider).
const { urls } = await api("/JSON/core/view/urls/?baseurl=");
const grupos = { frontend: new Set(), vite: new Set(), api: new Set() };
for (const u of urls) {
  const url = new URL(u);
  if (!["5173", "3000"].includes(url.port)) continue;
  grupos[clasificar(u)].add(`${url.origin}${url.pathname}`);
}
// Endpoints del API con método, a partir de los mensajes registrados.
const metodos = new Set();
const conRespuesta = new Set();
const total = Number((await api("/JSON/core/view/numberOfMessages/?baseurl=")).numberOfMessages);
for (let inicio = 0; inicio < total; inicio += 500) {
  const { messages } = await api(`/JSON/core/view/messages/?baseurl=http://localhost:3000&start=${inicio}&count=500`);
  for (const m of messages) {
    // Los nodos intermedios del árbol (/api, /api/auth…) no tienen respuesta: no son peticiones reales.
    if (!/^HTTP\/\S+ \d{3}/.test(m.responseHeader)) continue;
    const [metodo, uri] = m.requestHeader.split("\r\n")[0].split(" ");
    const url = new URL(uri);
    metodos.add(`${metodo} ${url.pathname.replace(/\/\d+(?=\/|$)/g, "/:id")}`);
    conRespuesta.add(`${url.origin}${url.pathname}`);
  }
}
const apiReales = [...grupos.api].filter((u) => conRespuesta.has(u));

const ordenar = (s) => [...s].sort();
const arbol = {
  generado: new Date().toISOString(),
  mensajesRegistrados: total,
  totales: { frontend: grupos.frontend.size, vite: grupos.vite.size, api: apiReales.length, apiEndpoints: [...metodos].filter((e) => !e.startsWith("OPTIONS")).length },
  frontend: ordenar(grupos.frontend),
  api: ordenar(apiReales),
  apiEndpoints: ordenar(metodos),
  vite: ordenar(grupos.vite),
};
writeFileSync(join(SALIDA, "arbol-sitios.json"), JSON.stringify(arbol, null, 2) + "\n");

// Alertas pasivas agrupadas por regla y por destino (frontend / vite / api).
const alertas = [];
for (let inicio = 0; ; inicio += 1000) {
  const { alerts } = await api(`/JSON/alert/view/alerts/?baseurl=&start=${inicio}&count=1000`);
  alertas.push(...alerts);
  if (alerts.length < 1000) break;
}
const porRegla = new Map();
for (const a of alertas) {
  const clave = `${a.pluginId}|${a.alert}|${a.risk}`;
  const g = porRegla.get(clave) ?? { regla: a.alert, pluginId: a.pluginId, riesgo: a.risk, confianza: a.confidence, cwe: a.cweid, instancias: { frontend: 0, vite: 0, api: 0 }, ejemplos: [], evidencia: "" };
  const destino = clasificar(a.url);
  g.instancias[destino]++;
  if (g.ejemplos.length < 3) g.ejemplos.push(`${a.method ?? ""} ${new URL(a.url).pathname}`.trim());
  const ev = String(a.evidence ?? "");
  if (!g.evidencia && ev && !/eyJ[A-Za-z0-9_-]{10,}/.test(ev)) g.evidencia = ev.replace(/\s+/g, " ").slice(0, 120);
  porRegla.set(clave, g);
}
const resumen = [...porRegla.values()].sort((x, y) => RIESGOS.indexOf(x.riesgo) - RIESGOS.indexOf(y.riesgo) || x.regla.localeCompare(y.regla));
writeFileSync(join(SALIDA, "alertas-pasivas.json"), JSON.stringify({ generado: arbol.generado, total: alertas.length, reglas: resumen }, null, 2) + "\n");

// Resumen legible.
const lineas = [
  `Paso 2.3.1 — ZAP como proxy + AJAX spider — ${arbol.generado}`,
  `Mensajes HTTP registrados por ZAP: ${total}`,
  "",
  `URL únicas (sin query): frontend ${arbol.totales.frontend}, recursos de Vite ${arbol.totales.vite}, API ${arbol.totales.api} (${arbol.totales.apiEndpoints} endpoints distintos sin contar OPTIONS)`,
  "",
  "Frontend (rutas y archivos de la app):",
  ...arbol.frontend.map((u) => `  ${u}`),
  "",
  "API (método y ruta, ids como :id):",
  ...arbol.apiEndpoints.map((u) => `  ${u}`),
  "",
  `Alertas pasivas: ${alertas.length} instancias en ${resumen.length} reglas`,
  ...resumen.map((g) => `  [${g.riesgo}] ${g.regla} (plugin ${g.pluginId}, CWE ${g.cwe}) — frontend ${g.instancias.frontend}, vite ${g.instancias.vite}, api ${g.instancias.api} — ej.: ${g.ejemplos[0]}${g.evidencia ? ` — evidencia: ${g.evidencia}` : ""}`),
];
writeFileSync(join(SALIDA, "resumen.txt"), lineas.join("\n") + "\n");
console.log(lineas.join("\n"));
