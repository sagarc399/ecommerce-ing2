// Regresión del flujo completo en el navegador (Chromium 1366×768), todo por la interfaz:
// login → carrito → compra aprobada → rechazo (USA-03) y reintento → mis pedidos → salir → admin crea producto.
// Uso (desde la raíz, con npm run dev y datos de db:reset): node pruebas/regresion/flujo.mjs
// Escribe pruebas/regresion/resultados/flujo.txt.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../usabilidad/node_modules/playwright/index.mjs";

const APP = "http://localhost:5173";
const AQUI = dirname(fileURLToPath(import.meta.url));
const lineas = [];
let fallos = 0;
const paso = async (nombre, fn) => {
  try {
    const detalle = await fn();
    lineas.push(`OK    ${nombre}${detalle ? ` (${detalle})` : ""}`);
  } catch (e) {
    fallos++;
    lineas.push(`FALLA ${nombre} (${e.message.split("\n")[0]})`);
  }
  console.log(lineas.at(-1));
};

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 1366, height: 768 }, locale: "es-CO" });
const page = await ctx.newPage();
const erroresConsola = [];
page.on("console", (m) => m.type() === "error" && erroresConsola.push(m.text()));
page.on("pageerror", (e) => erroresConsola.push(e.message));

const tarjeta = (nombre) => page.locator("article").filter({ has: page.getByRole("link", { name: nombre }).first() });
async function iniciarSesion(email, password) {
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();
}
async function pagar(numero) {
  await page.locator("#numero").fill(numero);
  await page.locator("#titular").fill("Juan Perez");
  await page.locator("#vencimiento").fill("1228");
  await page.locator("#cvv").fill("123");
  await page.getByRole("button", { name: /^Pagar \$/ }).click();
}

await page.goto(`${APP}/`);

await paso("1. Login como cliente", async () => {
  await iniciarSesion("cliente@tienda.com", "Cliente123");
  await page.getByRole("link", { name: "Mis pedidos" }).waitFor();
  return "aparece 'Mis pedidos' en el encabezado";
});

await paso("2. Agregar al carrito desde el catálogo", async () => {
  await page.goto(`${APP}/`);
  await page.locator("article").first().waitFor();
  await tarjeta("Mouse inalámbrico").getByRole("button", { name: "Agregar al carrito" }).click();
  await page.getByRole("link", { name: /^Carrito:/ }).click();
  await page.locator("main li").filter({ hasText: "Mouse inalámbrico" }).waitFor();
  return "Mouse inalámbrico en el carrito";
});

let pedidoAprobado;
await paso("3. Compra aprobada (4111…)", async () => {
  await page.getByRole("link", { name: "Proceder al pago" }).click();
  await pagar("4111111111111111");
  await page.getByText("¡Gracias por tu compra!").waitFor();
  pedidoAprobado = page.url().match(/pedidos\/(\d+)/)[1];
  return `pedido #${pedidoAprobado}`;
});

await paso("4. Rechazo (…0000) con USA-03 y reintento", async () => {
  await page.goto(`${APP}/`);
  await page.locator("article").first().waitFor();
  await tarjeta("Camiseta deportiva").getByRole("button", { name: "Agregar al carrito" }).click();
  await page.getByRole("link", { name: /^Carrito:/ }).click();
  await page.getByRole("link", { name: "Proceder al pago" }).click();
  await pagar("4000000000000000");
  await page.getByText("Por seguridad, vuelve a ingresar el CVV.").waitFor();
  const v = await page.evaluate(() => ({ n: document.querySelector("#numero").value, c: document.querySelector("#cvv").value, f: document.activeElement?.id }));
  if (!v.n || v.c || v.f !== "cvv") throw new Error(`estado tras el rechazo: número="${v.n}" cvv="${v.c}" foco=${v.f}`);
  await page.locator("#numero").fill("4111111111111111");
  await page.locator("#cvv").fill("123");
  await page.getByRole("button", { name: /^Pagar \$/ }).click();
  await page.getByText("¡Gracias por tu compra!").waitFor();
  return "número conservado, CVV vacío con foco, reintento aprobado";
});

await paso("5. Mis pedidos", async () => {
  await page.locator("header").getByRole("link", { name: "Mis pedidos" }).click();
  await page.getByRole("heading", { name: "Mis pedidos" }).waitFor();
  const filas = await page.locator("main li").count();
  if (filas < 3) throw new Error(`se esperaban al menos 3 pedidos (aprobado, rechazado, aprobado) y hay ${filas}`);
  await page.locator(`a[href="/pedidos/${pedidoAprobado}"]`).click();
  await page.getByRole("heading", { name: new RegExp(`^Pedido #${pedidoAprobado}`) }).waitFor();
  return `${filas} pedidos; detalle del #${pedidoAprobado} abre`;
});

await paso("6. Salir", async () => {
  await page.getByRole("button", { name: "Salir" }).click();
  await page.getByRole("link", { name: "Iniciar sesión" }).waitFor();
});

const nombreProducto = `Producto regresión ${Date.now() % 100000}`;
await paso("7. Admin crea un producto", async () => {
  await iniciarSesion("admin@tienda.com", "Admin12345");
  await page.getByRole("link", { name: "Panel admin" }).click();
  await page.getByRole("button", { name: "+ Nuevo producto" }).click();
  await page.locator("#p-nombre").fill(nombreProducto);
  await page.locator("#p-precio").fill("99000");
  await page.locator("#p-stock").fill("5");
  await page.locator("#p-categoria").fill("Hogar");
  await page.getByRole("button", { name: "Crear producto" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  // Como en T8: la tabla pagina, así que vale la fila o el aviso de creación.
  await page.locator("tbody").getByText(nombreProducto).or(page.getByText(`"${nombreProducto}" creado`)).first().waitFor({ timeout: 10000 });
  const r = await (await fetch(`http://localhost:3000/api/productos?buscar=${encodeURIComponent(nombreProducto)}`)).json();
  if (!r.datos.some((p) => p.nombre === nombreProducto)) throw new Error("no aparece en el catálogo público");
  return `"${nombreProducto}" creado y visible en el catálogo`;
});

await paso("8. Sin errores de JavaScript en la consola", async () => {
  // Los 402 y 409 del API se registran como errores de red esperados; se ignoran.
  const reales = erroresConsola.filter((e) => !/status of (402|409)/.test(e));
  if (reales.length) throw new Error(reales.slice(0, 3).join(" | "));
  return `${erroresConsola.length} mensajes de red esperados (402)`;
});

await navegador.close();
lineas.push("", fallos === 0 ? "FLUJO COMPLETO SIN REGRESIONES" : `FLUJO CON ${fallos} FALLAS`);
mkdirSync(join(AQUI, "resultados"), { recursive: true });
writeFileSync(join(AQUI, "resultados", "flujo.txt"), `Regresión del flujo en el navegador — ${new Date().toISOString()}\n\n${lineas.join("\n")}\n`);
console.log(lineas.at(-1));
process.exit(fallos ? 1 : 0);
