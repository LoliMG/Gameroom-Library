// Editar un libro de la colección desde la consola: sus datos (se guardan en booksMeta.json y la sala se actualiza sola),
// sus etiquetas y, si hace falta, quitarlo de la colección
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { Book, BookFormat } from '@/types'
import { updateBook, deleteBook } from '@/utils/catalogApi'

// Al editar se puede elegir también bolsillo (al añadir solo novela o manga)
const EDIT_FORMAT_LABELS: Record<BookFormat, string> = { book: 'Novela', manga: 'Manga', bolsillo: 'Bolsillo' }

/** Lo escrito en el formulario: todo texto, tal como está en los campos (los números se convierten al guardar) */
interface Fields {
  title: string
  author: string
  publisher: string
  pages: string
  format: BookFormat
  saga: string
  sagaIndex: string
  tags: string
}

interface BookEditFormProps {
  book: Book
  tags: string[]
  onSetTags: (isbn: string, tags: string[]) => void
  /** Vuelve a las portadas (tras guardar, quitar o cancelar) */
  onDone: () => void
}

const toInteger = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : null)

function BookEditForm({ book, tags, onSetTags, onDone }: BookEditFormProps) {
  const [fields, setFields] = useState<Fields>({
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    pages: book.pages ? String(book.pages) : '',
    format: book.format,
    saga: book.saga ?? '',
    sagaIndex: book.saga_index ? String(book.saga_index) : '',
    tags: tags.join(', '),
  })
  const [status, setStatus] = useState<string | null>(null) // null | 'saving' | mensaje de error

  const set = (field: keyof Fields) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((current) => ({ ...current, [field]: event.target.value }))

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('saving')
    try {
      await updateBook(book.isbn, {
        title: fields.title,
        author: fields.author,
        publisher: fields.publisher,
        pages: toInteger(fields.pages),
        format: fields.format,
        saga: fields.saga,
        saga_index: toInteger(fields.sagaIndex),
      })
      onSetTags(book.isbn, [...new Set(fields.tags.split(',').map((tag) => tag.trim()).filter(Boolean))])
      onDone()
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  async function remove() {
    if (!window.confirm(`¿Quitar «${book.title}» de la colección? También se borran sus subrayados, marcadores y estado de lectura.`)) return
    setStatus('saving')
    try {
      await deleteBook(book.isbn)
      onSetTags(book.isbn, [])
      onDone()
    } catch (error) {
      setStatus((error as Error).message)
    }
  }

  const busy = status === 'saving'
  return (
    <form className="manual-book" onSubmit={save} aria-label={`Editar ${book.title}`}>
      <div className="manual-book-cover">
        <img src={book.cover} alt={`Portada de ${book.title}`} />
        <span>ISBN {book.isbn}</span>
      </div>
      <div className="manual-book-fields">
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
              {Object.entries(EDIT_FORMAT_LABELS).map(([value, label]) => (
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
            <input maxLength={300} value={fields.saga} onChange={set('saga')} disabled={busy} />
          </label>
          <label>
            Tomo
            <input inputMode="numeric" maxLength={3} value={fields.sagaIndex} onChange={set('sagaIndex')} disabled={busy} />
          </label>
        </div>
        <label>
          Etiquetas (separadas por comas)
          <input maxLength={400} placeholder="Favorito, Para releer…" value={fields.tags} onChange={set('tags')} disabled={busy} />
        </label>
        {status && status !== 'saving' && (
          <p className="add-book-message is-error" role="alert">
            {status}
          </p>
        )}
        <div className="manual-book-row">
          <button type="submit" className="dashboard-action" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" className="dashboard-action is-quiet" onClick={onDone} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="dashboard-action is-danger" onClick={remove} disabled={busy}>
            Quitar de la colección
          </button>
        </div>
      </div>
    </form>
  )
}

export default BookEditForm
