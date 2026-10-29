import dotenv from "dotenv";

// override: el .env del proyecto manda sobre variables globales del sistema con el mismo nombre.
dotenv.config({ quiet: true, override: true });

// Lee una variable obligatoria; si falta, detiene el proceso indicando cuál.
export function requerirVariable(nombre: string): string {
  const valor = process.env[nombre];
  if (valor === undefined || valor.trim() === "") {
    console.error(`Error de configuración: falta la variable de entorno ${nombre} en el archivo .env`);
    process.exit(1);
  }
  return valor;
}

function requerirEntero(nombre: string): number {
  const valor = Number(requerirVariable(nombre));
  if (!Number.isInteger(valor) || valor <= 0) {
    console.error(`Error de configuración: la variable ${nombre} debe ser un número entero positivo`);
    process.exit(1);
  }
  return valor;
}

export const env = {
  PORT: requerirEntero("PORT"),
  DB_HOST: requerirVariable("DB_HOST"),
  DB_PORT: requerirEntero("DB_PORT"),
  DB_USER: requerirVariable("DB_USER"),
  DB_PASSWORD: requerirVariable("DB_PASSWORD"),
  DB_NAME: requerirVariable("DB_NAME"),
  JWT_SECRET: requerirVariable("JWT_SECRET"),
  JWT_EXPIRES_IN: requerirVariable("JWT_EXPIRES_IN"),
  CORS_ORIGIN: requerirVariable("CORS_ORIGIN"),
};

// Variable opcional: undefined si no está o está vacía (sin valores por defecto).
function leerOpcional(nombre: string): string | undefined {
  const valor = process.env[nombre]?.trim();
  return valor ? valor : undefined;
}

// Configuración del chatbot. Es opcional: si falta, el chat usa respuestas por reglas
// y la tienda arranca igual.
export const chatEnv = {
  CHAT_PROVEEDOR: leerOpcional("CHAT_PROVEEDOR"),
  GEMINI_API_KEY: leerOpcional("GEMINI_API_KEY"),
  GEMINI_MODEL: leerOpcional("GEMINI_MODEL"),
};
