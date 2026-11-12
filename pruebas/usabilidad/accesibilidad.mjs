// Accesibilidad real con axe-core (WCAG 2.0/2.1/2.2 A y AA + buenas prácticas) en 8 pantallas a 1366×768.
// Uso: node pruebas/usabilidad/accesibilidad.mjs → resultados/accesibilidad.json y accesibilidad.csv
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";
import { APP, prepararSesion, tokenDe } from "./tareas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(AQUI, "resultados"), { recursive: true });

const CARRITO = [{ producto_id: 3, nombre: "Mouse inalámbrico", precio: 45000, imagen_url: "/productos/mouse-inalambrico.jpg", stock: 40, cantidad: 2 }];
const tokenCliente = await tokenDe("cliente@tienda.com", "Cliente123");
const tokenAdmin = await tokenDe("admin@tienda.com", "Admin12345");

const PAGINAS = [
  ["Catálogo", "/", null],
  ["Detalle de producto", "/producto/4", null],
  ["Carrito", "/carrito", null],
  ["Checkout", "/checkout", tokenCliente],
  ["Login", "/login", null],
  ["Mis pedidos", "/pedidos", tokenCliente],
  ["Admin productos", "/admin/productos", tokenAdmin],
  ["Chat abierto", "/", null, true],
];
const IMPACTOS = ["critical", "serious", "moderate", "minor"];

const navegador = await chromium.launch();
const resultado = [];
const filasCsv = ["pagina,impacto,regla,descripcion,nodos,ejemplo"];
const csv = (v) => `"${String(v).replace(/"/g, '""').replace(/\s+/g, " ")}"`;

for (const [nombre, ruta, token, abrirChat] of PAGINAS) {
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 768 }, locale: "es-CO" });
  const page = await ctx.newPage();
  await prepararSesion(page, { token, carrito: CARRITO });
  await page.goto(`${APP}${ruta}`);
  await page.waitForLoadState("networkidle");
  if (abrirChat) await page.getByRole("button", { name: "Abrir chat de ayuda" }).click();
  await page.waitForTimeout(500);

  const analisis = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  const violaciones = analisis.violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    descripcion: v.help,
    nodos: v.nodes.length,
    ejemplo: v.nodes[0]?.target.join(" ") ?? "",
    detalle: v.nodes[0]?.failureSummary?.split("\n").slice(1, 2).join(" ").trim() ?? "",
  }));
  const conteo = Object.fromEntries(IMPACTOS.map((i) => [i, violaciones.filter((v) => v.impacto === i).reduce((s, v) => s + v.nodos, 0)]));
  resultado.push({ pagina: nombre, ruta, conteo, reglasQuePasaron: analisis.passes.length, violaciones });
  for (const v of violaciones) filasCsv.push([nombre, v.impacto, v.regla, v.descripcion, v.nodos, v.ejemplo].map(csv).join(","));
  console.log(`${nombre}: ${IMPACTOS.map((i) => `${i}=${conteo[i]}`).join(" ")} | pasaron ${analisis.passes.length} reglas`);
  for (const v of violaciones) console.log(`   [${v.impacto}] ${v.regla} ×${v.nodos}: ${v.descripcion} | ${v.ejemplo} | ${v.detalle}`);
  await ctx.close();
}

await navegador.close();
writeFileSync(join(AQUI, "resultados", "accesibilidad.json"), JSON.stringify(resultado, null, 2));
writeFileSync(join(AQUI, "accesibilidad.csv"), `${filasCsv.join("\n")}\n`);
