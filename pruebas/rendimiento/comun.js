// Configuración compartida de los escenarios de k6.
import http from "k6/http";

export const API = __ENV.API_URL || "http://host.docker.internal:3000/api";
export const CLAVE = "Cliente123";
export const TARJETA_APROBADA = { numero_tarjeta: "4111 1111 1111 1111", titular: "Prueba Carga", vencimiento: "12/30", cvv: "123" };
export const JSON_HEADERS = { "Content-Type": "application/json" };
export const ESTADISTICAS = ["min", "avg", "med", "p(90)", "p(95)", "p(99)", "max"];

// Rampa común: subida en 30 s, 60 s sostenido y 15 s de bajada.
export function rampa(vus) {
  return [
    { duration: "30s", target: vus },
    { duration: "60s", target: vus },
    { duration: "15s", target: 0 },
  ];
}

export function emailCarga(indice) {
  return `carga${String((indice % 25) + 1).padStart(2, "0")}@tienda.com`;
}

// setup() de los checkouts: un token por cada uno de los 25 clientes e ids de los productos de carga.
export function prepararCheckout() {
  const tokens = [];
  for (let i = 0; i < 25; i++) {
    const res = http.post(`${API}/auth/login`, JSON.stringify({ email: emailCarga(i), password: CLAVE }), {
      headers: JSON_HEADERS,
      tags: { name: "setup" },
    });
    if (res.status !== 200) throw new Error(`Login de ${emailCarga(i)} falló: HTTP ${res.status}`);
    tokens.push(res.json("token"));
  }
  const productos = http
    .get(`${API}/productos?buscar=${encodeURIComponent("Producto carga")}&limite=10`, { tags: { name: "setup" } })
    .json("datos");
  if (productos.length !== 3) throw new Error(`Se esperaban 3 productos de carga y hay ${productos.length}`);
  return { tokens, productos: productos.map((p) => p.id) };
}

export function comprar(token, productoId) {
  return http.post(
    `${API}/ordenes`,
    JSON.stringify({ items: [{ producto_id: productoId, cantidad: 1 }], pago: TARJETA_APROBADA }),
    {
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` },
      tags: { name: "checkout" },
      timeout: "60s",
    }
  );
}
