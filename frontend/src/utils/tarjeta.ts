// Formato y validación de tarjeta con los mismos criterios que backend/src/validators/orden.validator.ts.

export interface FormularioTarjeta {
  numero: string // con espacios: "4111 1111 1111 1111"
  titular: string
  vencimiento: string // "MM/AA"
  cvv: string
}

export type ErroresTarjeta = Partial<Record<keyof FormularioTarjeta, string>>

export function formatearNumeroTarjeta(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 16)
  return digitos.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export function formatearVencimiento(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 4)
  return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos
}

export function soloDigitos(valor: string, maximo: number): string {
  return valor.replace(/\D/g, '').slice(0, maximo)
}

export function validarTarjeta(f: FormularioTarjeta, ahora = new Date()): ErroresTarjeta {
  const errores: ErroresTarjeta = {}

  if (!/^\d{16}$/.test(f.numero.replace(/\s/g, ''))) {
    errores.numero = 'El número debe tener exactamente 16 dígitos'
  }

  if (!f.titular.trim()) errores.titular = 'El titular es obligatorio'
  else if (f.titular.trim().length > 100) errores.titular = 'El titular no puede superar 100 caracteres'

  const partes = /^(\d{2})\/(\d{2})$/.exec(f.vencimiento)
  if (!partes) {
    errores.vencimiento = 'Usa el formato MM/AA'
  } else {
    const mes = Number(partes[1])
    const anio = 2000 + Number(partes[2])
    if (mes < 1 || mes > 12) {
      errores.vencimiento = 'El mes debe estar entre 01 y 12'
    } else if (anio * 12 + mes < ahora.getFullYear() * 12 + ahora.getMonth() + 1) {
      // La tarjeta es válida hasta el último día del mes de vencimiento.
      errores.vencimiento = 'La tarjeta está vencida'
    }
  }

  if (!/^\d{3}$/.test(f.cvv)) errores.cvv = 'El CVV debe tener 3 dígitos'

  return errores
}
