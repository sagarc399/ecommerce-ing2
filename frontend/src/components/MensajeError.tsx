interface Props {
  mensaje: string
  onReintentar?: () => void
}

export default function MensajeError({ mensaje, onReintentar }: Props) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
      <p>{mensaje}</p>
      {onReintentar && (
        <button
          type="button"
          onClick={onReintentar}
          className="mt-3 rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
