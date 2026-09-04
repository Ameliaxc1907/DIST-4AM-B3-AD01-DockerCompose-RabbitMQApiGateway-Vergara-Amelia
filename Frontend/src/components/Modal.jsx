import { useEffect } from 'react'
import Icon from './Icons.jsx'

export function Modal({ title, children, onClose, size = 'medium' }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}

export function ConfirmDialog({ title, message, busy, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={busy ? () => {} : onCancel} size="small">
      <div className="confirm-copy">{message}</div>
      <footer className="modal__actions">
        <button className="button button--secondary" type="button" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button className="button button--danger" type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Eliminando…' : 'Eliminar'}
        </button>
      </footer>
    </Modal>
  )
}
