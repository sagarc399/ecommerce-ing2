// Respuestas por palabras clave, sin internet. Se usa si no hay Gemini configurado o si Gemini falla.
import type { MensajeChat, ProveedorChat } from "./proveedor";
import { NOMBRE_TIENDA } from "./prompt-sistema";

interface Regla {
  claves: string[]; // ya normalizadas: minúsculas y sin tildes
  respuesta: string;
}

// El orden importa: gana la primera regla que coincida (lo más específico va primero).
const REGLAS: Regla[] = [
  {
    claves: ["rechaz", "no paso el pago", "fallo el pago", "pago fallido", "no me deja pagar"],
    respuesta:
      "Si el pago fue rechazado, revisa los datos e intenta con otra tarjeta. Recuerda que el pago es simulado: las tarjetas que terminan en 0000 siempre se rechazan. La orden rechazada queda registrada en \"Mis pedidos\" y tu carrito no se pierde.",
  },
  {
    claves: ["mis pedidos", "pedido", "orden", "historial", "compras anteriores", "mis compras"],
    respuesta:
      "Puedes ver tus pedidos en la sección \"Mis pedidos\", en la parte superior, después de iniciar sesión. Ahí aparece cada pedido con su fecha, total y estado (PAGADA o RECHAZADA).",
  },
  {
    claves: ["registr", "crear cuenta", "cuenta", "iniciar sesion", "inicio sesion", "login", "contrasena", "ingresar", "entrar"],
    respuesta:
      "Para crear una cuenta usa \"Registrarse\" en la parte superior; la contraseña debe tener al menos 8 caracteres. Si ya tienes cuenta, entra con \"Iniciar sesión\". Necesitas sesión para pagar, pero puedes llenar el carrito sin ella.",
  },
  {
    claves: ["precio", "cuesta", "cuestan", "vale", "valor", "stock", "disponible", "existencia", "agotado", "quedan", "descuento", "oferta"],
    respuesta:
      "En esta versión no tengo acceso al catálogo, así que no puedo darte precios ni existencias. Usa el buscador de la página principal: ahí verás el precio actual y si el producto está disponible o agotado.",
  },
  {
    claves: ["pago", "pagar", "tarjeta", "cvv", "checkout", "vencimiento"],
    respuesta:
      "El pago es simulado, no se cobra dinero real. Desde el carrito pulsa \"Proceder al pago\" e ingresa cualquier tarjeta de 16 dígitos, una fecha de vencimiento futura y un CVV de 3 dígitos. Si el número termina en 0000 el pago se rechaza.",
  },
  {
    claves: ["comprar", "compro", "carrito", "agregar", "anadir", "como compra"],
    respuesta:
      "Busca el producto en el catálogo y pulsa \"Agregar al carrito\". Luego abre el carrito (arriba a la derecha), ajusta las cantidades y pulsa \"Proceder al pago\". Para pagar necesitas iniciar sesión.",
  },
  {
    claves: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches", "saludos", "hey"],
    respuesta: `¡Hola! Soy el asistente de ${NOMBRE_TIENDA}. Puedo ayudarte a buscar productos, usar el carrito, pagar o revisar tus pedidos. ¿Qué necesitas?`,
  },
];

const RESPUESTA_POR_DEFECTO = `Puedo ayudarte con temas de ${NOMBRE_TIENDA}: buscar productos, usar el carrito, registrarte, pagar o ver tus pedidos. ¿Sobre cuál de estos temas tienes dudas?`;

// Minúsculas y sin tildes, para que "Cómo PAGO" coincida con "como pago".
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export class ProveedorReglas implements ProveedorChat {
  readonly nombre = "reglas" as const;

  async responder(mensajes: MensajeChat[]): Promise<string> {
    const ultimo = [...mensajes].reverse().find((m) => m.rol === "usuario");
    const texto = normalizar(ultimo?.texto ?? "");
    const regla = REGLAS.find((r) => r.claves.some((clave) => texto.includes(clave)));
    return regla?.respuesta ?? RESPUESTA_POR_DEFECTO;
  }
}
