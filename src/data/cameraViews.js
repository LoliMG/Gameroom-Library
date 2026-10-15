// Puntos de vista fijos de la cámara (Fase 10): posición de la cámara y objetivo al que mira, en metros.
// Referencias de la habitación: suelo Y = -1.0, techo Y = +1.8, pared d en Z = -2.0, ventanal (c) en Z = +4.0,
// pared a en X = -2.6 (frente de sus estanterías en -2.25) y pared b (sofá) en X = +2.6.
export const CAMERA_VIEWS = [
  {
    id: 'overview',
    label: 'Vista general',
    // Desde fuera, por encima del muro del ventanal (el techo solo se ve desde dentro)
    position: [2.6, 3.6, 7.2],
    target: [0, -0.5, 0.8],
  },
  {
    id: 'shelvesD',
    label: 'Estanterías d',
    position: [0.2, 0.25, 2.0],
    target: [0.2, 0.15, -1.8],
  },
  {
    id: 'shelvesA',
    label: 'Estanterías a',
    position: [0.95, 0.25, 1.2],
    target: [-2.35, 0.15, 1.2],
  },
  {
    id: 'sofa',
    label: 'Rincón del sofá',
    position: [-0.55, 0.35, 2.3],
    target: [1.95, -0.55, 2.1],
  },
  {
    id: 'window',
    label: 'Ventanal',
    // Desde dentro, mirando hacia la pared c
    position: [0, 0.2, -0.6],
    target: [0, 0.2, 4.0],
  },
]

// Vista con la que arranca la escena
export const DEFAULT_VIEW_ID = 'overview'
