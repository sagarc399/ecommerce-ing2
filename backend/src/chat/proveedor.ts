// Patrón Strategy: cada proveedor sabe responder una conversación; chat.service elige cuál usar.
// En la v2 (consultas a productos y pedidos) se agregará aquí el contexto/herramientas que reciba el proveedor.

export type RolChat = "usuario" | "asistente";

export interface MensajeChat {
  rol: RolChat;
  texto: string;
}

export type NombreProveedor = "gemini" | "reglas";

export interface ProveedorChat {
  nombre: NombreProveedor;
  responder(mensajes: MensajeChat[]): Promise<string>;
}
