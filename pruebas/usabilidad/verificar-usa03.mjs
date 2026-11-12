// Verificación funcional de USA-03 en el navegador (Chromium 1366×768).
// Uso (app en :5173, API en :3000, datos de db:reset): node pruebas/usabilidad/verificar-usa03.mjs
// 1) Pago rechazado (402): se conservan número, titular y vencimiento; el CVV queda vacío y con el foco;
//    se muestra "Por seguridad, vuelve a ingresar el CVV"; nada de la tarjeta en localStorage/sessionStorage.
// 2) Reintento con el CVV: la compra se aprueba.
// 3) Otro resultado (409 por stock: 2 monitores con 1 disponible): se borran todos los datos de la tarjeta.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { APP, prepararSesion, tokenDe } from "./tareas.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const CAMISETA = { producto_id: 11, nombre: "Camiseta deportiva", precio: 49900, imagen_url: "/productos/camiseta-deportiva.jpg", stock: 50, cantidad: 1 };
const MONITOR = { producto_id: 4, nombre: "Monitor 24 pulgadas", precio: 1250000, imagen_url: "/productos/monitor-24.jpg", stock: 1, cantidad: 2 };
const token = await tokenDe("cliente@tienda.com", "Cliente123");

const lineas = [];
let fallos = 0;
const revisar = (nombre, ok, detalle = "") => {
  if (!ok) fallos++;
  lineas.push(`${ok ? "OK   " : "FALLA"} ${nombre}${detalle ? ` (${detalle})` : ""}`);
};

const valores = (page) =>
  page.evaluate(() => ({
    numero: document.querySelector("#numero").value,
    titular: document.querySelector("#titular").value,
    vencimiento: document.querySelector("#vencimiento").value,
    cvv: document.querySelector("#cvv").value,
    foco: document.activeElement?.id ?? "",
    almacenamiento: JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }),
  }));

async function llenar(page, numero) {
  await page.locator("#numero").fill(numero);
  await page.locator("#titular").fill("Juan Perez");
  await page.locator("#vencimiento").fill("1228");
  await page.locator("#cvv").fill("123");
  await page.getByRole("button", { name: /^Pagar \$/ }).click();
}

const navegador = await chromium.launch();

// --- 1 y 2: rechazo y reintento ---
{
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 768 }, locale: "es-CO" });
  const page = await ctx.newPage();
  await prepararSesion(page, { token, carrito: [CAMISETA] });
  await page.goto(`${APP}/checkout`);
  await llenar(page, "4000000000000000");
  await page.getByText("Por seguridad, vuelve a ingresar el CVV.").waitFor();
  const v = await valores(page);
  lineas.push("Escenario 1: pago rechazado (tarjeta terminada en 0000)");
  revisar("número conservado", v.numero === "4000 0000 0000 0000", v.numero);
  revisar("titular conservado", v.titular === "Juan Perez", v.titular);
  revisar("vencimiento conservado", v.vencimiento === "12/28", v.vencimiento);
  revisar("CVV borrado", v.cvv === "");
  revisar("foco en el CVV", v.foco === "cvv", `foco en #${v.foco}`);
  revisar("mensaje de rechazo visible", (await page.getByText("Pago rechazado. Intenta con otra tarjeta.", { exact: true }).count()) > 0);
  const digitos = /4000\s?0000|0000000000000000|Juan Perez|12\/28|"123"/;
  revisar("sin datos de tarjeta en localStorage ni sessionStorage", !digitos.test(v.almacenamiento), `claves: ${Object.keys(JSON.parse(v.almacenamiento.split("}{")[0] + "}")).join(", ")}`);

  lineas.push("Escenario 2: reintento con otra tarjeta (titular y vencimiento conservados; nuevo número y CVV)");
  await page.locator("#numero").fill("4111111111111111");
  await page.locator("#cvv").fill("123");
  await page.getByRole("button", { name: /^Pagar \$/ }).click();
  const aprobada = await page
    .getByText("¡Gracias por tu compra!")
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  revisar("compra aprobada tras el reintento", aprobada, page.url().replace(APP, ""));
  await ctx.close();
}

// --- 3: otro resultado (409 sin stock) borra todo ---
{
  const ctx = await navegador.newContext({ viewport: { width: 1366, height: 768 }, locale: "es-CO" });
  const page = await ctx.newPage();
  await prepararSesion(page, { token, carrito: [MONITOR] });
  await page.goto(`${APP}/checkout`);
  await llenar(page, "4111111111111111");
  await page.getByText("No hay stock suficiente").waitFor();
  const v = await valores(page);
  lineas.push("Escenario 3: otro resultado (409, sin stock suficiente)");
  revisar("número borrado", v.numero === "", v.numero);
  revisar("titular borrado", v.titular === "", v.titular);
  revisar("vencimiento borrado", v.vencimiento === "", v.vencimiento);
  revisar("CVV borrado", v.cvv === "");
  await ctx.close();
}

await navegador.close();
lineas.push("", fallos === 0 ? "USA-03 VERIFICADO" : `USA-03 CON ${fallos} FALLAS`);
const salida = `Verificación USA-03 — ${new Date().toISOString()}\n\n${lineas.join("\n")}\n`;
writeFileSync(join(AQUI, "resultados", "verificacion-usa03.txt"), salida);
console.log(salida);
process.exit(fallos ? 1 : 0);
