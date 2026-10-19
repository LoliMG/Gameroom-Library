// Colores de subrayado del lector (mismas claves que guarda la base de datos)
import type { AnnotationColor } from '@/types'

// Record<AnnotationColor, …> obliga a dar un valor para cada color: si se añade uno a AnnotationColor, falta aquí
export const ANNOTATION_FILL: Record<AnnotationColor, string> = {
  yellow: '#f2d16b',
  pink: '#f29bb5',
  green: '#9fd18b',
  blue: '#8ec5f0',
}

export const ANNOTATION_LABELS: Record<AnnotationColor, string> = { yellow: 'Amarillo', pink: 'Rosa', green: 'Verde', blue: 'Azul' }
