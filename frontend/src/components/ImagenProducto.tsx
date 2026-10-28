import { useState } from 'react'

interface Props {
  src: string | null
  alt: string
  className?: string
}

// Si no hay URL o la imagen no carga, se muestra un placeholder gris.
export default function ImagenProducto({ src, alt, className = '' }: Props) {
  const [fallo, setFallo] = useState(false)

  if (!src || fallo) {
    return (
      <div className={`flex items-center justify-center bg-slate-200 text-slate-400 ${className}`} aria-label={alt} role="img">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.16-5.16a2.25 2.25 0 0 1 3.18 0l5.16 5.16m-1.5-1.5 1.41-1.41a2.25 2.25 0 0 1 3.18 0l2.91 2.91M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5V4.5A1.5 1.5 0 0 0 20.25 3H3.75A1.5 1.5 0 0 0 2.25 4.5v15A1.5 1.5 0 0 0 3.75 21Z" />
        </svg>
      </div>
    )
  }

  // Fondo gris mientras carga, para que una imagen lenta no se vea como un hueco en blanco.
  return <img src={src} alt={alt} loading="lazy" onError={() => setFallo(true)} className={`bg-slate-200 object-cover ${className}`} />
}
