// Texto para buscar sin distinguir mayúsculas ni tildes ("idhun" encuentra "Idhún"). Lo usan las búsquedas de la
// consola (portadas y libro de una lectura del diario)
export const normalize = (text: string | null | undefined) => (text ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
