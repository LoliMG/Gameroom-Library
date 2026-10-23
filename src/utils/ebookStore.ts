// Libros electrónicos (PDF y EPUB) guardados en el navegador de cada persona (IndexedDB): no se suben a ningún
// servidor. Cada archivo va con el id de la cuenta, para que en un navegador compartido cada cuenta vea solo los suyos.
import type { EbookFormat } from '@/types'

const DB_NAME = 'fantasy-bookroom-ebooks'
const STORE = 'files'
// Tamaño máximo de un archivo (los PDF escaneados pueden ser grandes; el navegador tiene su propio límite de espacio)
export const MAX_EBOOK_BYTES = 300 * 1024 * 1024

/** Lo que se guarda de cada libro electrónico */
interface EbookRecord {
  key: string // '<id de la cuenta>/<isbn>'
  format: EbookFormat
  data: Blob
}

let opening: Promise<IDBDatabase> | null = null
function openDb(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      opening = null
      reject(new Error('No se pudo abrir el almacén de libros electrónicos del navegador'))
    }
  })
  return opening
}

// Una operación sobre el almacén, como promesa
async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE, mode).objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error(request.error?.message ?? 'Error del almacén del navegador'))
  })
}

const keyOf = (userId: string, isbn: string) => `${userId}/${isbn}`

/** Libros electrónicos de la cuenta en este navegador: { isbn: 'epub' | 'pdf' } */
export async function listEbooks(userId: string): Promise<Record<string, EbookFormat>> {
  // Todas las claves que empiezan por '<id>/' ('￿' va después de cualquier carácter de un ISBN)
  const records = await run('readonly', (store) => store.getAll(IDBKeyRange.bound(`${userId}/`, `${userId}/￿`)) as IDBRequest<EbookRecord[]>)
  return Object.fromEntries(records.map((record) => [record.key.slice(userId.length + 1), record.format]))
}

/** El archivo del libro electrónico, o un error si en este navegador no está */
export async function getEbook(userId: string, isbn: string): Promise<Blob> {
  const record = await run('readonly', (store) => store.get(keyOf(userId, isbn)) as IDBRequest<EbookRecord | undefined>)
  if (!record) throw new Error('Este libro no tiene su PDF o EPUB en este navegador')
  return record.data
}

/**
 * Comprueba que el archivo es de verdad un PDF o un EPUB (por sus primeros bytes, no solo por el nombre) y lo guarda.
 * Devuelve su formato.
 */
export async function saveEbook(userId: string, isbn: string, file: File): Promise<EbookFormat> {
  if (file.size > MAX_EBOOK_BYTES) throw new Error(`El archivo es demasiado grande (máximo ${MAX_EBOOK_BYTES / 1024 / 1024} MB)`)
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer())
  const startsWith = (text: string) => [...text].every((char, i) => head[i] === char.charCodeAt(0))
  // Un PDF empieza por "%PDF"; un EPUB es un ZIP ("PK\x03\x04"), pero un ZIP cualquiera no vale
  const format: EbookFormat | null = startsWith('%PDF')
    ? 'pdf'
    : startsWith('PK\u0003\u0004') && /\.epub$/i.test(file.name)
      ? 'epub'
      : null
  if (!format) throw new Error('Solo se pueden añadir archivos PDF o EPUB')
  await run('readwrite', (store) => store.put({ key: keyOf(userId, isbn), format, data: file } satisfies EbookRecord))
  // Pide al navegador que no borre este almacén aunque le falte espacio (puede decir que no: entonces solo se avisa)
  navigator.storage?.persist?.().catch(() => undefined)
  return format
}

/** Quita el libro electrónico de este navegador (si no estaba, no pasa nada) */
export async function deleteEbook(userId: string, isbn: string): Promise<void> {
  await run('readwrite', (store) => store.delete(keyOf(userId, isbn)))
}
