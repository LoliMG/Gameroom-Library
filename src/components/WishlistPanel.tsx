// Lista de deseos de la consola: libros que se quieren tener. Se añaden desde la búsqueda (botón ♡ de AddBookPanel) y,
// al conseguirlos, "Ya lo tengo" los pasa a la colección (como añadirlos desde la búsqueda) y los quita de la lista
import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { WishItem } from '@/types'
import { addBookToCollection, addedMessage } from '@/utils/catalogApi'

interface WishlistPanelProps {
  wishlist: WishItem[]
  onSetWishlist: Dispatch<SetStateAction<WishItem[]>>
  /** Abre la búsqueda para añadir más deseos */
  onSearch: () => void
}

function WishlistPanel({ wishlist, onSetWishlist, onSearch }: WishlistPanelProps) {
  const [messages, setMessages] = useState<Record<string, string>>({}) // Por ISBN: 'adding' | mensaje de error o de añadido

  // Con la lista del momento (no la de cuando se pulsó): si se pasan dos libros a la vez, no vuelve el primero
  const remove = (isbn: string) => onSetWishlist((list) => list.filter((item) => item.isbn !== isbn))

  async function own(item: WishItem) {
    setMessages((current) => ({ ...current, [item.isbn]: 'adding' }))
    try {
      const entry = await addBookToCollection({ ...item, source: 'lista de deseos' })
      setMessages((current) => ({ ...current, [item.isbn]: addedMessage(entry) }))
      remove(item.isbn)
    } catch (error) {
      setMessages((current) => ({ ...current, [item.isbn]: (error as Error).message }))
    }
  }

  return (
    <section className="add-book" aria-label="Lista de deseos">
      <div className="add-book-form">
        <button type="button" className="dashboard-action" onClick={onSearch}>
          Buscar libros que quiero
        </button>
      </div>
      {wishlist.length === 0 && <p className="add-book-message">Aún no hay libros en tu lista de deseos. Búscalos y pulsa ♡.</p>}
      {/* Mensajes de los que ya se han pasado a la colección (ya no están en la lista) */}
      {Object.entries(messages)
        .filter(([isbn, message]) => message !== 'adding' && !wishlist.some((item) => item.isbn === isbn))
        .map(([isbn, message]) => (
          <p key={isbn} className="add-book-message">
            {message}
          </p>
        ))}
      <ul className="add-book-results">
        {wishlist.map((item) => {
          const message = messages[item.isbn]
          return (
            <li key={item.isbn} className="add-book-result">
              <img src={item.coverUrl} alt="" className="add-book-cover" loading="lazy" />
              <div className="add-book-info">
                <strong>{item.title}</strong>
                <span>{item.author ?? 'Autor desconocido'}</span>
                <span className="add-book-meta">{[item.publisher, `ISBN ${item.isbn}`].filter(Boolean).join(' · ')}</span>
                {message && message !== 'adding' && (
                  <span className="add-book-message is-error" role="alert">
                    {message}
                  </span>
                )}
              </div>
              <div className="add-book-actions">
                <button type="button" className="dashboard-action" disabled={message === 'adding'} onClick={() => own(item)}>
                  {message === 'adding' ? 'Añadiendo…' : 'Ya lo tengo'}
                </button>
                <button type="button" className="dashboard-action is-quiet" disabled={message === 'adding'} onClick={() => remove(item.isbn)}>
                  Quitar
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default WishlistPanel
