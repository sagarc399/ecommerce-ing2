// Patrón Strategy: cada proveedor sabe responder una conversación; chat.service elige cuál usar.
// En la v2 (consultas a productos y pedidos) se agregará aquí el contexto/herramientas que reciba el proveedor.

export type RolChat = "usuario" | "asistente";

export interface MensajeChat {
  rol: RolChat;
  texto: string;
}

export type NombreProveedor = "groq" | "gemini" | "reglas";

export interface ProveedorChat {
  nombre: NombreProveedor;
  responder(mensajes: MensajeChat[]): Promise<string>;
}

// Error HTTP de un proveedor externo (401 key inválida, 429 límite, 5xx caída...).
export class ErrorHttpProveedor extends Error {
  readonly status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.name = "ErrorHttpProveedor";
    this.status = status;
  }
}
