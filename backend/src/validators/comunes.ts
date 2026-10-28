// Validaciones compartidas entre recursos (ids, paginación, query string).

export type Resultado<T> = { ok: true; datos: T } | { ok: false; mensaje: string };

export const ENTERO_MAXIMO = 2147483647; // INT de PostgreSQL
const LIMITE_POR_DEFECTO = 12;
const LIMITE_MAXIMO = 50;

export function esEnteroPositivo(texto: string): boolean {
  return /^\d+$/.test(texto) && Number(texto) >= 1 && Number(texto) <= ENTERO_MAXIMO;
}

export function validarId(valor: unknown): number | null {
  return typeof valor === "string" && esEnteroPositivo(valor) ? Number(valor) : null;
}

// Devuelve el parámetro de la query como texto recortado, o undefined si no viene o está vacío.
export function leerQuery(query: Record<string, unknown>, campo: string): string | undefined {
  const valor = query[campo];
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

export function validarPaginacion(query: Record<string, unknown>): Resultado<{ pagina: number; limite: number }> {
  const paginaTexto = leerQuery(query, "pagina");
  if (paginaTexto !== undefined && !esEnteroPositivo(paginaTexto)) {
    return { ok: false, mensaje: "El parámetro pagina debe ser un entero positivo" };
  }

  const limiteTexto = leerQuery(query, "limite");
  if (limiteTexto !== undefined && !/^\d+$/.test(limiteTexto)) {
    return { ok: false, mensaje: "El parámetro limite debe ser un entero positivo" };
  }
  const limite = limiteTexto === undefined ? LIMITE_POR_DEFECTO : Number(limiteTexto);
  if (limite < 1) return { ok: false, mensaje: "El parámetro limite debe ser un entero positivo" };

  return {
    ok: true,
    datos: {
      pagina: paginaTexto === undefined ? 1 : Number(paginaTexto),
      limite: Math.min(limite, LIMITE_MAXIMO),
    },
  };
}
