// Capturas de las pantallas clave en escritorio (1366×768) y celular (375×812): docs/pruebas/capturas/
// Uso: node pruebas/usabilidad/capturas.mjs
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { APP, prepararSesion, tokenDe } from "./tareas.mjs";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs", "pruebas", "capturas");
mkdirSync(DIR, { recursive: true });

const CARRITO = [
  { producto_id: 3, nombre: "Mouse inalámbrico", precio: 45000, imagen_url: "/productos/mouse-inalambrico.jpg", stock: 40, cantidad: 2 },
  { producto_id: 11, nombre: "Camiseta deportiva", precio: 49900, imagen_url: "/productos/camiseta-deportiva.jpg", stock: 50, cantidad: 1 },
];

const DISPOSITIVOS = [
  ["escritorio", { width: 1366, height: 768 }],
  ["movil", { width: 375, height: 812 }],
];

const tokenCliente = await tokenDe("cliente@tienda.com", "Cliente123");
const tokenAdmin = await tokenDe("admin@tienda.com", "Admin12345");
const navegador = await chromium.launch();

for (const [dispositivo, viewport] of DISPOSITIVOS) {
  const ctx = await navegador.newContext({ viewport, locale: "es-CO", isMobile: dispositivo === "movil", hasTouch: dispositivo === "movil" });
  const page = await ctx.newPage();
  const foto = async (nombre, completa = false) => {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(DIR, `${nombre}-${dispositivo}.png`), fullPage: completa });
    console.log(`${nombre}-${dispositivo}.png`);
  };

  // Visitante
  await prepararSesion(page, { carrito: CARRITO });
  await page.goto(`${APP}/`);
  await foto("01-catalogo");
  await page.goto(`${APP}/?buscar=camiseta&categoria=Ropa`);
  await foto("02-busqueda-filtro");
  await page.goto(`${APP}/producto/4`);
  await foto("03-detalle-producto");
  await page.goto(`${APP}/carrito`);
  await foto("04-carrito", true);
  await page.goto(`${APP}/registro`);
  await foto("05-registro");
  await page.goto(`${APP}/login`);
  await foto("06-login");
  await page.goto(`${APP}/`);
  await page.getByRole("button", { name: "Abrir chat de ayuda" }).click();
  await foto("07-chat-abierto");

  // Cliente
  await prepararSesion(page, { token: tokenCliente, carrito: CARRITO });
  await page.goto(`${APP}/checkout`);
  await foto("08-checkout", true);
  await page.locator("#numero").fill("4000000000000000");
  await page.locator("#titular").fill("Juan Perez");
  await page.locator("#vencimiento").fill("1228");
  await page.locator("#cvv").fill("123");
  await page.getByRole("button", { name: /^Pagar \$/ }).click();
  await page.getByText("Pago rechazado. Intenta con otra tarjeta.", { exact: true }).first().waitFor();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(DIR, `09-pago-rechazado-${dispositivo}.png`), fullPage: true });
  console.log(`09-pago-rechazado-${dispositivo}.png`);
  await page.goto(`${APP}/pedidos`);
  await foto("10-mis-pedidos", true);
  await page.locator("main li a").first().click();
  await page.getByRole("heading", { name: /^Pedido #\d+/ }).waitFor();
  await foto("11-detalle-pedido", true);

  // Admin
  await prepararSesion(page, { token: tokenAdmin });
  await page.goto(`${APP}/admin/productos`);
  await page.locator("tbody tr").first().waitFor();
  await foto("12-admin-productos");
  await page.getByRole("button", { name: "+ Nuevo producto" }).click();
  await foto("13-admin-nuevo-producto");
  await page.keyboard.press("Escape");
  await page.locator("tbody tr").first().getByRole("button", { name: "Desactivar", exact: true }).click();
  await foto("14-admin-confirmar-desactivar");
  await page.keyboard.press("Escape");

  await ctx.close();
}
await navegador.close();
