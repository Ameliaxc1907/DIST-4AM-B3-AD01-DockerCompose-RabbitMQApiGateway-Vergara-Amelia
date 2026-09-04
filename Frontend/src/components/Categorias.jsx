import { useState } from 'react'
import { api } from '../api/client.js'
import Icon from './Icons.jsx'
import { ConfirmDialog, Modal } from './Modal.jsx'

const emptyCategory = { idCategoria: 0, nombre: '', descripcion: '' }

export default function Categorias({ items, loading, onReload, notify }) {
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const openForm = (category = emptyCategory) => {
    setErrors({})
    setForm({ ...category })
  }

  const openEdit = async (category) => {
    setErrors({})
    try {
      setForm({ ...await api.categorias.get(category.idCategoria) })
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const validate = () => {
    const nextErrors = {}
    if (!form.nombre.trim()) nextErrors.nombre = 'Ingrese el nombre.'
    if (form.nombre.length > 100) nextErrors.nombre = 'Máximo 100 caracteres.'
    if (form.descripcion.length > 250) nextErrors.descripcion = 'Máximo 250 caracteres.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      idCategoria: Number(form.idCategoria) || 0,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
    }

    setSaving(true)
    try {
      if (payload.idCategoria) {
        await api.categorias.update(payload.idCategoria, payload)
        notify('Categoría actualizada correctamente.', 'success')
        await onReload(false)
      } else {
        await api.categorias.create(payload)
        notify('Categoría creada. RabbitMQ está actualizando los vehículos.', 'success')
        await onReload(true)
      }
      setForm(null)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      await api.categorias.remove(deleting.idCategoria)
      notify('Categoría eliminada correctamente.', 'success')
      setDeleting(null)
      await onReload(false)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div><span className="eyebrow">Organización</span><h1>Categorías</h1><p>Organice los vehículos por tipo y propósito.</p></div>
        <div className="header-actions">
          <button className="button button--secondary" type="button" onClick={() => onReload(false)} disabled={loading}><Icon name="refresh" /> Actualizar</button>
          <button className="button button--primary" type="button" onClick={() => openForm()}><Icon name="plus" /> Nueva categoría</button>
        </div>
      </header>

      <div className="table-card">
        <div className="table-summary"><strong>Listado general</strong><span>{loading ? 'Cargando…' : `${items.length} registro${items.length === 1 ? '' : 's'}`}</span></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>ID</th><th>Nombre</th><th>Descripción</th><th className="actions-cell">Acciones</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 4 }).map((_, index) => <tr key={index} className="skeleton-row"><td colSpan="4"><span /></td></tr>) : items.length ? items.map((category) => (
                <tr key={category.idCategoria}>
                  <td data-label="ID"><span className="id-chip">#{category.idCategoria}</span></td>
                  <td data-label="Nombre"><strong>{category.nombre}</strong></td>
                  <td data-label="Descripción" className="description-cell">{category.descripcion || 'Sin descripción'}</td>
                  <td className="actions-cell" data-label="Acciones">
                    <button className="icon-button" type="button" onClick={() => openEdit(category)} aria-label={`Editar ${category.nombre}`}><Icon name="edit" /></button>
                    <button className="icon-button icon-button--danger" type="button" onClick={() => setDeleting(category)} aria-label={`Eliminar ${category.nombre}`}><Icon name="trash" /></button>
                  </td>
                </tr>
              )) : <tr><td colSpan="4"><div className="empty-state"><Icon name="tag" size={30} /><strong>No hay categorías registradas</strong><span>Use “Nueva categoría” para crear la primera.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Modal title={form.idCategoria ? 'Editar categoría' : 'Nueva categoría'} onClose={() => !saving && setForm(null)}>
          <form onSubmit={submit} noValidate>
            <div className="form-grid">
              <label className="field field--full"><span>Nombre</span><input autoFocus value={form.nombre} maxLength="100" onChange={(event) => setForm({ ...form, nombre: event.target.value })} disabled={saving} />{errors.nombre && <small className="field-error">{errors.nombre}</small>}</label>
              <label className="field field--full"><span>Descripción</span><textarea rows="4" value={form.descripcion} maxLength="250" onChange={(event) => setForm({ ...form, descripcion: event.target.value })} disabled={saving} /><small className={errors.descripcion ? 'field-error' : 'field-hint'}>{errors.descripcion || `${form.descripcion.length}/250 caracteres`}</small></label>
            </div>
            <footer className="modal__actions"><button className="button button--secondary" type="button" onClick={() => setForm(null)} disabled={saving}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar categoría'}</button></footer>
          </form>
        </Modal>
      )}

      {deleting && <ConfirmDialog title="Eliminar categoría" message={<>¿Desea eliminar la categoría <strong>{deleting.nombre}</strong>? Esta acción no se puede deshacer.</>} busy={deleteBusy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
    </section>
  )
}
