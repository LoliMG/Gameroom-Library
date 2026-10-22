// Lo que comparten el corcho de la pared (dibujado en un lienzo, Corkboard) y su editor en grande (HTML, BoardEditor):
// las pegatinas que hay, los colores de los pósits y el tamaño de cada cosa
import type { NoteColor } from '@/types'

/** Pegatinas de serie: emojis (los dibuja el sistema, no hay que descargar nada) */
export const EMOJI_STICKERS = ['🌙', '⭐', '✨', '💖', '📚', '🐈', '☕', '🌸', '🍂', '🕯️', '🔮', '🗝️', '🦋', '🍄', '🌧️', '⚔️', '🐉', '👑', '🌹', '🧸', '🍵', '🪄', '🌻', '❄️']

/** Pegatinas de imagen: las que haya en src/assets/stickers ({ nombre del archivo: dirección }; import.meta.glob es de Vite) */
export const STICKER_IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('@/assets/stickers/*.{png,webp,svg,jpg,jpeg}', { eager: true, import: 'default' })).map(([path, url]) => [
    path.split('/').pop()!,
    url,
  ])
)

/** Dirección de la imagen de una pegatina "img:archivo" (o null si es un emoji o la imagen ya no está) */
export const stickerImage = (sticker: string) => (sticker.startsWith('img:') ? (STICKER_IMAGES[sticker.slice(4)] ?? null) : null)

/** Color de cada pósit */
export const NOTE_FILL: Record<NoteColor, string> = {
  yellow: '#fbe78a',
  pink: '#f7b7c8',
  mint: '#b9e6c9',
  blue: '#b5d5f5',
  lilac: '#d6c2f0',
}

/** Ancho de cada cosa en fracción del ancho del corcho (el pósit es cuadrado; la frase crece hacia abajo con el texto) */
export const ITEM_WIDTH = { note: 0.17, sticker: 0.1, quote: 0.32 }

/** Proporción del corcho (ancho / alto) */
export const BOARD_ASPECT = 1.5
