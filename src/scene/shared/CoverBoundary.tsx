// Envoltorio de cada libro de la sala mientras carga su portada (Suspense) y por si no carga (límite de errores):
// una portada que falla (red, 429 de Supabase…) solo quita ese libro, en vez de tumbar toda la escena 3D
import { Component, Suspense } from 'react'
import type { ReactNode } from 'react'

interface CoverBoundaryProps {
  children: ReactNode
}

// Los límites de errores de React solo se pueden escribir como clase
class CoverBoundary extends Component<CoverBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error) {
    console.warn('[sala] No se pudo cargar una portada; ese libro no se muestra:', error.message)
  }

  render() {
    if (this.state.failed) return null
    return <Suspense fallback={null}>{this.props.children}</Suspense>
  }
}

export default CoverBoundary
