// Alta a mano de un libro que no aparece en la búsqueda: ISBN, título y el resto de datos, y la portada subida desde el
// ordenador (si no se sube, el servidor la busca por el ISBN en Open Library y Amazon)
import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { BookFormat } from '@/types'
import { addBookToCollection, addedMessage, FORMAT_LABELS } from '@/utils/catalogApi'

const COVER_TYPES = ['image/jpeg', 'image/png']
const MAX_COVER_BYTES = 5 * 1024 * 1024

// Imagen como texto "data:image/…;base64,…" (así viaja en el JSON hasta el servidor)
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    // Con readAsDataURL, result siempre es un string
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

/** Lo escrito en el formulario: todo texto, tal como está en los campos (los números se convierten al enviar) */
interface Fields {
  isbn: string
  title: string
  author: string
  publisher: string
  pages: string
  format: BookFormat
  saga: string
  sagaIndex: string
  synopsis: string
}

/**
 * @param initialIsbn - ISBN con el que empieza el formulario (el que se buscó, si se buscó uno)
 * @param onCancel - Vuelve a la búsqueda
 */
function ManualBookForm({ initialIsbn = '', onCancel }: { initialIsbn?: string; onCancel: () => void }) {
  const [fields, setFields] = useState<Fields>({ isbn: initialIsbn, title: '', author: '', publisher: '', pages: '', format: 'book', saga: '', sagaIndex: '', synopsis: '' })
  const [cover, setCover] = useState<File | null>(null) // File elegido
  const [preview, setPreview] = useState<string | null>(null) // Dirección temporal de la imagen elegida, para verla
  const [status, setStatus] = useState<string | null>(null) // null | 'adding' | 'added' | mensaje de error
  const [addedText, setAddedText] = useState('') // Mensaje de "añadido" (con el aviso de la sinopsis)

  // La dirección temporal de la vista previa se libera al cambiar de imagen o al cerrar el formulario
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  // Manejador de cada campo: guarda su texto en fields[field] (keyof Fields: solo nombres de campo que existen)
  const set = (field: keyof Fields) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields((current) => ({ ...current, [field]: event.target.value }))

  function chooseCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (file && !COVER_TYPES.includes(file.type)) return setStatus('La portada tiene que ser una imagen JPEG o PNG')
    if (file && file.size > MAX_COVER_BYTES) return setStatus('La portada es demasiado grande (máximo 5 MB)')
    setStatus(null)
    setCover(file)
    setPreview(file && URL.createObjectURL(file))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('adding')
    const toInteger = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : null)
    try {
      const entry = await addBookToCollection({
        isbn: fields.isbn,
        title: fields.title,
        author: fields.author,
        publisher: fields.publisher,
        pages: toInteger(fields.pages),
        format: fields.format,
        saga: fields.saga,
        saga_index: toInteger(fields.sagaIndex),
        synopsis: fields.synopsis,
        coverData: cover ? await readAsDataUrl(cover) : undefined,
        source: 'a mano',
      })
      setAddedText(addedMessage(entry))
      setStatus('added')
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  const busy = status === 'adding' || status === 'added'
  return (
    <form className="manual-book" onSubmit={submit} aria-label="Añadir un libro a mano">
      <div className="manual-book-cover">
        {preview ? <img src={preview} alt="Portada elegida" /> : <span>Sin portada: se buscará por el ISBN</span>}
        <label className="dashboard-action is-quiet">
          {cover ? 'Cambiar portada' : 'Subir portada'}
          <input type="file" accept={COVER_TYPES.join(',')} onChange={chooseCover} disabled={busy} hidden />
        </label>
      </div>
      <div className="manual-book-fields">
        <label>
          ISBN *
          <input required inputMode="numeric" maxLength={17} placeholder="978…" value={fields.isbn} onChange={set('isbn')} disabled={busy} />
        </label>
        <label>
          Título *
          <input required maxLength={300} value={fields.title} onChange={set('title')} disabled={busy} />
        </label>
        <label>
          Autor
          <input maxLength={300} value={fields.author} onChange={set('author')} disabled={busy} />
        </label>
        <label>
          Editorial
          <input maxLength={300} value={fields.publisher} onChange={set('publisher')} disabled={busy} />
        </label>
        <div className="manual-book-row">
          <label>
            Páginas
            <input inputMode="numeric" maxLength={4} value={fields.pages} onChange={set('pages')} disabled={busy} />
          </label>
          <label>
            Formato
            <select value={fields.format} onChange={set('format')} disabled={busy}>
              {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="manual-book-row">
          <label>
            Saga
            <input maxLength={300} placeholder="Se deduce del título si se deja vacía" value={fields.saga} onChange={set('saga')} disabled={busy} />
          </label>
          <label>
            Tomo
            <input inputMode="numeric" maxLength={3} value={fields.sagaIndex} onChange={set('sagaIndex')} disabled={busy} />
          </label>
        </div>
        <label>
          Sinopsis
          <textarea
            rows={4}
            maxLength={3000}
            placeholder="Si se deja vacía, se busca por el ISBN"
            value={fields.synopsis}
            onChange={set('synopsis')}
            disabled={busy}
          />
        </label>
        {status && status !== 'adding' && status !== 'added' && (
          <p className="add-book-message is-error" role="alert">
            {status}
          </p>
        )}
        {status === 'added' && <p className="add-book-message">{addedText}</p>}
        <div className="manual-book-row">
          <button type="submit" className="dashboard-action" disabled={busy}>
            {status === 'adding' ? 'Añadiendo…' : 'Añadir a la colección'}
          </button>
          <button type="button" className="dashboard-action is-quiet" onClick={onCancel} disabled={status === 'adding'}>
            Volver a la búsqueda
          </button>
        </div>
      </div>
    </form>
  )
}

export default ManualBookForm
