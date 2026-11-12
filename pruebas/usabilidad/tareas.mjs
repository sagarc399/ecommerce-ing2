// Las 9 tareas de la prueba de usabilidad, con su criterio de éxito y su automatización.
// Cada acción pasa por el Medidor, que cuenta clics, campos, caracteres, cambios de página y decisiones.

export const APP = process.env.APP_URL || "http://localhost:5173";
export const API = process.env.API_URL || "http://localhost:3000/api";

export const TAREAS = [
  { id: "T1", nombre: "Registrarse como cliente nuevo", exito: "Queda con la sesión iniciada en el catálogo y su nombre aparece en el encabezado" },
  { id: "T2", nombre: "Buscar un producto por nombre y filtrar por categoría", exito: "El catálogo muestra 'Camiseta deportiva' y todos los resultados son de la categoría Ropa" },
  { id: "T3", nombre: "Agregar 2 productos al carrito y cambiar la cantidad de uno", exito: "El carrito tiene 2 productos distintos y uno de ellos con cantidad 2" },
  { id: "T4", nombre: "Completar una compra con tarjeta válida", exito: "Llega a la confirmación del pedido ('¡Gracias por tu compra!')" },
  { id: "T5", nombre: "Recibir un pago rechazado (0000) y reintentar con otra tarjeta", exito: "Ve el mensaje de rechazo y, con otra tarjeta, llega a la confirmación del pedido" },
  { id: "T6", nombre: "Consultar el detalle de un pedido en 'Mis pedidos'", exito: "Ve el detalle de un pedido con sus productos, total y pago" },
  { id: "T7", nombre: "Preguntarle al chatbot el precio de un producto", exito: "El chatbot responde con el precio real del monitor ($1.250.000)" },
  { id: "T8", nombre: "(Admin) Crear un producto nuevo", exito: "El producto aparece en la tabla del panel admin" },
  { id: "T9", nombre: "(Admin) Desactivar un producto y volver a activarlo", exito: "El producto queda activo de nuevo después de haber estado inactivo" },
];

// Registra las acciones de una tarea para contar operaciones y calcular el KLM.
export class Medidor {
  constructor(page) {
    this.page = page;
    this.acciones = [];
    this.rutas = new Set();
    this.cambiosDePagina = 0;
    this.ultimaRuta = null;
  }

  async iniciar() {
    this.ultimaRuta = new URL(this.page.url()).pathname;
    this.inicio = performance.now();
  }

  revisarRuta() {
    const ruta = new URL(this.page.url()).pathname;
    if (ruta !== this.ultimaRuta) {
      this.cambiosDePagina++;
      this.ultimaRuta = ruta;
    }
  }

  decision(texto) {
    this.acciones.push({ tipo: "decision", texto });
  }

  async clic(locator, texto) {
    await locator.click();
    this.acciones.push({ tipo: "clic", texto });
    this.revisarRuta();
  }

  // Clic en el campo y escritura del texto.
  async escribir(locator, valor, texto) {
    await locator.click();
    this.acciones.push({ tipo: "clic", texto: `campo ${texto}` });
    await locator.fill(valor);
    this.acciones.push({ tipo: "escribir", caracteres: valor.length, texto });
    this.revisarRuta();
  }

  // Un <select> nativo: un clic para abrirlo y otro para elegir la opción.
  async seleccionar(locator, valor, texto) {
    await locator.selectOption(valor);
    this.acciones.push({ tipo: "clic", texto: `abrir ${texto}` }, { tipo: "clic", texto: `elegir ${valor}` });
    this.revisarRuta();
  }

  async tecla(locator, tecla, texto) {
    await locator.press(tecla);
    this.acciones.push({ tipo: "tecla", texto: `${tecla} (${texto})` });
    this.revisarRuta();
  }

  terminar() {
    this.revisarRuta();
    return performance.now() - this.inicio;
  }

  conteo() {
    const escribir = this.acciones.filter((a) => a.tipo === "escribir");
    return {
      clics: this.acciones.filter((a) => a.tipo === "clic").length,
      campos: escribir.length,
      caracteres: escribir.reduce((s, a) => s + a.caracteres, 0),
      teclas: this.acciones.filter((a) => a.tipo === "tecla").length,
      cambiosDePagina: this.cambiosDePagina,
      decisiones: this.acciones.filter((a) => a.tipo === "decision").length,
    };
  }
}

// KLM: K=0,28 s por tecla, P=1,1 s apuntar, B=0,1 s clic, H=0,4 s cambiar de dispositivo, M=1,35 s preparación mental.
export const KLM = { K: 0.28, P: 1.1, B: 0.1, H: 0.4, M: 1.35 };

// La mano empieza en el mouse. Clic = P + B; escribir = K por carácter; tecla = K; decisión = M;
// cada cambio entre mouse y teclado suma H.
export function calcularKLM(acciones) {
  const n = { K: 0, P: 0, B: 0, H: 0, M: 0 };
  let mano = "mouse";
  const usar = (dispositivo) => {
    if (mano !== dispositivo) {
      n.H++;
      mano = dispositivo;
    }
  };
  for (const a of acciones) {
    if (a.tipo === "decision") n.M++;
    else if (a.tipo === "clic") {
      usar("mouse");
      n.P++;
      n.B++;
    } else if (a.tipo === "escribir") {
      usar("teclado");
      n.K += a.caracteres;
    } else if (a.tipo === "tecla") {
      usar("teclado");
      n.K++;
    }
  }
  const segundos = Object.entries(n).reduce((s, [op, cant]) => s + cant * KLM[op], 0);
  return { operadores: n, segundos: Math.round(segundos * 100) / 100 };
}

// --- Utilidades de preparación (no cuentan en la medición) ---

export async function tokenDe(email, password) {
  const res = await fetch(`${API}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  return (await res.json()).token;
}

export async function prepararSesion(page, { token = null, carrito = [] } = {}) {
  await page.goto(`${APP}/`);
  await page.evaluate(
    ({ token, carrito }) => {
      localStorage.clear();
      if (token) localStorage.setItem("token", token);
      if (carrito.length) localStorage.setItem("carrito", JSON.stringify(carrito));
    },
    { token, carrito }
  );
}

const CAMISETA = { producto_id: 11, nombre: "Camiseta deportiva", precio: 49900, imagen_url: "/productos/camiseta-deportiva.jpg", stock: 50, cantidad: 1 };

// --- Automatización de cada tarea. Devuelve true si se cumplió el criterio de éxito. ---

export const EJECUTAR = {
  async T1(page, m, corrida) {
    await prepararSesion(page);
    await page.goto(`${APP}/`);
    await m.iniciar();
    m.decision("buscar cómo crear una cuenta");
    await m.clic(page.getByRole("link", { name: "Registrarse" }), "Registrarse");
    m.decision("llenar el formulario");
    await m.escribir(page.locator("#nombre"), "Laura Gómez", "nombre");
    await m.escribir(page.locator("#email"), `laura.gomez${Date.now() % 100000}${corrida}@correo.com`, "email");
    await m.escribir(page.locator("#password"), "Segura2026", "contraseña");
    m.decision("revisar y enviar");
    await m.clic(page.getByRole("button", { name: "Registrarme" }), "Registrarme");
    await page.waitForURL(`${APP}/`);
    await page.locator("header").getByText("Laura Gómez").waitFor();
    return true;
  },

  async T2(page, m) {
    await prepararSesion(page);
    await page.goto(`${APP}/`);
    await page.locator("article").first().waitFor();
    await m.iniciar();
    m.decision("decidir qué buscar");
    await m.escribir(page.getByRole("searchbox", { name: "Buscar productos" }), "camiseta", "buscador");
    await page.waitForURL(/buscar=camiseta/);
    m.decision("elegir la categoría");
    await m.seleccionar(page.getByRole("combobox", { name: "Filtrar por categoría" }), "Ropa", "filtro de categoría");
    await page.waitForURL(/categoria=Ropa/);
    // Cada tarjeta tiene dos enlaces con el mismo nombre (imagen y título): se espera el primero.
    await page.getByRole("link", { name: "Camiseta deportiva" }).first().waitFor();
    m.decision("revisar los resultados");
    const categorias = await page.locator("article p.uppercase").allInnerTexts();
    return categorias.length > 0 && categorias.every((c) => c.toLowerCase() === "ropa");
  },

  async T3(page, m) {
    await prepararSesion(page);
    await page.goto(`${APP}/`);
    await page.locator("article").first().waitFor();
    await m.iniciar();
    const tarjeta = (nombre) => page.locator("article").filter({ has: page.getByRole("link", { name: nombre }).first() });
    m.decision("elegir el primer producto");
    await m.clic(tarjeta("Mouse inalámbrico").getByRole("button", { name: "Agregar al carrito" }), "Agregar Mouse");
    m.decision("elegir el segundo producto");
    await m.clic(tarjeta("Camiseta deportiva").getByRole("button", { name: "Agregar al carrito" }), "Agregar Camiseta");
    m.decision("ir al carrito");
    await m.clic(page.getByRole("link", { name: /^Carrito:/ }), "ícono del carrito");
    await page.getByRole("heading", { name: "Carrito" }).waitFor();
    m.decision("cambiar la cantidad");
    const fila = page.locator("main li").filter({ hasText: "Mouse inalámbrico" });
    await m.clic(fila.getByRole("button", { name: "Aumentar cantidad" }), "+ en Mouse");
    await fila.getByText("2", { exact: true }).waitFor();
    const carrito = await page.evaluate(() => JSON.parse(localStorage.getItem("carrito")));
    return carrito.length === 2 && carrito.some((i) => i.cantidad === 2);
  },

  async T4(page, m) {
    await prepararSesion(page, { token: await tokenDe("cliente@tienda.com", "Cliente123"), carrito: [CAMISETA] });
    await page.goto(`${APP}/carrito`);
    await page.getByRole("heading", { name: "Carrito" }).waitFor();
    await m.iniciar();
    m.decision("decidir pagar");
    await m.clic(page.getByRole("link", { name: "Proceder al pago" }), "Proceder al pago");
    m.decision("llenar los datos de la tarjeta");
    await m.escribir(page.locator("#numero"), "4111111111111111", "número de tarjeta");
    await m.escribir(page.locator("#titular"), "Juan Perez", "titular");
    await m.escribir(page.locator("#vencimiento"), "1228", "vencimiento");
    await m.escribir(page.locator("#cvv"), "123", "CVV");
    m.decision("revisar y pagar");
    await m.clic(page.getByRole("button", { name: /^Pagar \$/ }), "Pagar");
    await page.waitForURL(/\/pedidos\/\d+/);
    m.revisarRuta();
    await page.getByText("¡Gracias por tu compra!").waitFor();
    return true;
  },

  async T5(page, m) {
    await prepararSesion(page, { token: await tokenDe("cliente@tienda.com", "Cliente123"), carrito: [CAMISETA] });
    await page.goto(`${APP}/carrito`);
    await page.getByRole("heading", { name: "Carrito" }).waitFor();
    await m.iniciar();
    m.decision("decidir pagar");
    await m.clic(page.getByRole("link", { name: "Proceder al pago" }), "Proceder al pago");
    m.decision("llenar los datos de la tarjeta");
    await m.escribir(page.locator("#numero"), "4000000000000000", "número de tarjeta (termina en 0000)");
    await m.escribir(page.locator("#titular"), "Juan Perez", "titular");
    await m.escribir(page.locator("#vencimiento"), "1228", "vencimiento");
    await m.escribir(page.locator("#cvv"), "123", "CVV");
    m.decision("revisar y pagar");
    await m.clic(page.getByRole("button", { name: /^Pagar \$/ }), "Pagar");
    await page.getByText("Pago rechazado. Intenta con otra tarjeta.", { exact: true }).first().waitFor();
    m.decision("entender el rechazo y decidir usar otra tarjeta");
    // Tras el intento, la app borra el número y el CVV: hay que escribirlos de nuevo.
    await m.escribir(page.locator("#numero"), "4111111111111111", "número de otra tarjeta");
    await m.escribir(page.locator("#cvv"), "123", "CVV de nuevo");
    m.decision("revisar y pagar de nuevo");
    await m.clic(page.getByRole("button", { name: /^Pagar \$/ }), "Pagar de nuevo");
    await page.waitForURL(/\/pedidos\/\d+/);
    m.revisarRuta();
    await page.getByText("¡Gracias por tu compra!").waitFor();
    return true;
  },

  async T6(page, m) {
    await prepararSesion(page, { token: await tokenDe("cliente@tienda.com", "Cliente123") });
    await page.goto(`${APP}/`);
    await page.locator("article").first().waitFor();
    await m.iniciar();
    m.decision("buscar dónde están los pedidos");
    await m.clic(page.getByRole("link", { name: "Mis pedidos" }), "Mis pedidos");
    await page.getByRole("heading", { name: "Mis pedidos" }).waitFor();
    m.decision("elegir el pedido");
    await m.clic(page.locator("main li a").first(), "primer pedido");
    await page.getByRole("heading", { name: /^Pedido #\d+/ }).waitFor();
    m.decision("leer el detalle");
    return (await page.locator("main").innerText()).includes("Total");
  },

  async T7(page, m, _corrida, extra) {
    await prepararSesion(page);
    await page.goto(`${APP}/`);
    await page.locator("article").first().waitFor();
    await m.iniciar();
    m.decision("buscar la ayuda");
    await m.clic(page.getByRole("button", { name: "Abrir chat de ayuda" }), "botón del chat");
    m.decision("formular la pregunta");
    const entrada = page.getByRole("textbox", { name: "Mensaje para el asistente" });
    await m.escribir(entrada, "¿Cuánto cuesta el monitor?", "pregunta");
    const enviado = performance.now();
    await m.tecla(entrada, "Enter", "enviar");
    const burbujas = page.locator('section[aria-label="Chat de ayuda"] div.flex-col');
    await page.waitForFunction(
      () => {
        const v = document.querySelector('section[aria-label="Chat de ayuda"]');
        return v && v.querySelectorAll("div.flex-col").length >= 3 && ![...v.querySelectorAll("p")].some((p) => p.innerText === "Escribiendo...");
      },
      null,
      { timeout: 20000 }
    );
    extra.chatMs = Math.round(performance.now() - enviado);
    const ultima = burbujas.last();
    const texto = await ultima.innerText();
    extra.automatica = texto.includes("Respuesta automática");
    extra.respuesta = texto.split("\n")[0].slice(0, 160);
    m.decision("leer la respuesta");
    return /1\.250\.000/.test(texto) && !extra.automatica;
  },

  async T8(page, m, corrida) {
    await prepararSesion(page, { token: await tokenDe("admin@tienda.com", "Admin12345") });
    await page.goto(`${APP}/`);
    await page.locator("article").first().waitFor();
    await m.iniciar();
    m.decision("ir al panel admin");
    await m.clic(page.getByRole("link", { name: "Panel admin" }), "Panel admin");
    await page.getByRole("button", { name: "+ Nuevo producto" }).waitFor();
    m.decision("iniciar la creación");
    await m.clic(page.getByRole("button", { name: "+ Nuevo producto" }), "+ Nuevo producto");
    m.decision("llenar el formulario");
    const nombre = `Lámpara de pie ${corrida}`;
    await m.escribir(page.locator("#p-nombre"), nombre, "nombre");
    await m.escribir(page.locator("#p-precio"), "120000", "precio");
    await m.escribir(page.locator("#p-stock"), "10", "stock");
    await m.escribir(page.locator("#p-categoria"), "Hogar", "categoría");
    m.decision("revisar y guardar");
    await m.clic(page.getByRole("button", { name: "Crear producto" }), "Crear producto");
    await page.getByRole("dialog").waitFor({ state: "detached" });
    m.revisarRuta();
    return (await page.locator("tbody").innerText()).includes(nombre) || (await page.getByText(`"${nombre}" creado`).count()) > 0;
  },

  async T9(page, m) {
    await prepararSesion(page, { token: await tokenDe("admin@tienda.com", "Admin12345") });
    await page.goto(`${APP}/admin/productos`);
    await page.locator("tbody tr").first().waitFor();
    await m.iniciar();
    m.decision("buscar el producto");
    await m.escribir(page.getByRole("searchbox", { name: "Buscar productos" }), "sábanas", "buscador del admin");
    const fila = page.locator("tbody tr").filter({ hasText: "Juego de sábanas" });
    await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 1);
    m.decision("desactivarlo");
    await m.clic(fila.getByRole("button", { name: "Desactivar", exact: true }), "Desactivar");
    m.decision("confirmar en el modal");
    await m.clic(page.getByRole("button", { name: "Sí, desactivar" }), "Sí, desactivar");
    await fila.getByRole("button", { name: "Activar", exact: true }).waitFor();
    m.decision("volver a activarlo");
    await m.clic(fila.getByRole("button", { name: "Activar", exact: true }), "Activar");
    await fila.getByRole("button", { name: "Desactivar", exact: true }).waitFor();
    const r = await (await fetch(`${API}/productos?buscar=${encodeURIComponent("sábanas")}`)).json();
    return r.datos.some((p) => p.nombre === "Juego de sábanas");
  },
};
