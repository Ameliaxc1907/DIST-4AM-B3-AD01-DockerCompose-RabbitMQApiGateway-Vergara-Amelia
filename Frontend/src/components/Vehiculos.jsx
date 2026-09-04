import { useMemo, useState } from 'react'
import { api } from '../api/client.js'
import Icon from './Icons.jsx'
import { ConfirmDialog, Modal } from './Modal.jsx'

const emptyVehicle = {
  idVehiculo: 0,
  idCategoria: '',
  marca: '',
  modelo: '',
  precio: '',
  stock: '',
  estado: true,
}

export default function Vehiculos({ items, categorias, loading, onReload, notify }) {
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const categoryNames = useMemo(
    () => Object.fromEntries(categorias.map((item) => [item.idCategoria, item.nombre])),
    [categorias],
  )

  const openNew = () => {
    setErrors({})
    setForm({ ...emptyVehicle, idCategoria: categorias[0]?.idCategoria || '' })
  }

  const openEdit = async (vehicle) => {
    setErrors({})
    try {
      setForm({ ...await api.vehiculos.get(vehicle.idVehiculo) })
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const validate = () => {
    const nextErrors = {}
    if (!Number(form.idCategoria)) nextErrors.idCategoria = 'Seleccione una categoría.'
    if (!form.marca.trim()) nextErrors.marca = 'Ingrese la marca.'
    if (!form.modelo.trim()) nextErrors.modelo = 'Ingrese el modelo.'
    if (form.marca.length > 100) nextErrors.marca = 'Máximo 100 caracteres.'
    if (form.modelo.length > 100) nextErrors.modelo = 'Máximo 100 caracteres.'
    if (form.precio === '' || Number(form.precio) < 0) nextErrors.precio = 'Ingrese un precio válido.'
    if (form.stock === '' || !Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) nextErrors.stock = 'Ingrese un stock entero válido.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    const payload = {
      idVehiculo: Number(form.idVehiculo) || 0,
      idCategoria: Number(form.idCategoria),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      precio: Number(form.precio),
      stock: Number(form.stock),
      estado: Boolean(form.estado),
    }

    setSaving(true)
    try {
      if (payload.idVehiculo) {
        await api.vehiculos.update(payload.idVehiculo, payload)
        notify('Vehículo actualizado correctamente.', 'success')
      } else {
        await api.vehiculos.create(payload)
        notify('Vehículo creado correctamente.', 'success')
      }
      setForm(null)
      await onReload()
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      await api.vehiculos.remove(deleting.idVehiculo)
      notify('Vehículo eliminado correctamente.', 'success')
      setDeleting(null)
      await onReload()
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <section className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Inventario</span>
          <h1>Vehículos</h1>
          <p>Administre los vehículos registrados en el sistema.</p>
        </div>
        <div className="header-actions">
          <button className="button button--secondary" type="button" onClick={onReload} disabled={loading}>
            <Icon name="refresh" /> Actualizar
          </button>
          <button className="button button--primary" type="button" onClick={openNew} disabled={!categorias.length}>
            <Icon name="plus" /> Nuevo vehículo
          </button>
        </div>
      </header>

      {!categorias.length && !loading && (
        <div className="inline-notice">Debe crear al menos una categoría antes de registrar vehículos.</div>
      )}

      <div className="table-card">
        <div className="table-summary">
          <strong>Listado general</strong>
          <span>{loading ? 'Cargando…' : `${items.length} registro${items.length === 1 ? '' : 's'}`}</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>ID</th><th>Vehículo</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Estado</th><th className="actions-cell">Acciones</th></tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="skeleton-row"><td colSpan="7"><span /></td></tr>
                ))
              ) : items.length ? items.map((vehicle) => (
                <tr key={vehicle.idVehiculo}>
                  <td data-label="ID"><span className="id-chip">#{vehicle.idVehiculo}</span></td>
                  <td data-label="Vehículo"><strong>{vehicle.marca}</strong><small>{vehicle.modelo}</small></td>
                  <td data-label="Categoría">{categoryNames[vehicle.idCategoria] || `Categoría ${vehicle.idCategoria}`}</td>
                  <td data-label="Precio">{Number(vehicle.precio).toLocaleString('es-CO', { style: 'currency', currency: 'USD' })}</td>
                  <td data-label="Stock">{vehicle.stock}</td>
                  <td data-label="Estado"><span className={`status ${vehicle.estado ? 'status--active' : 'status--inactive'}`}>{vehicle.estado ? 'Activo' : 'Inactivo'}</span></td>
                  <td className="actions-cell" data-label="Acciones">
                    <button className="icon-button" type="button" onClick={() => openEdit(vehicle)} aria-label={`Editar ${vehicle.marca} ${vehicle.modelo}`}><Icon name="edit" /></button>
                    <button className="icon-button icon-button--danger" type="button" onClick={() => setDeleting(vehicle)} aria-label={`Eliminar ${vehicle.marca} ${vehicle.modelo}`}><Icon name="trash" /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="7"><div className="empty-state"><Icon name="car" size={30} /><strong>No hay vehículos registrados</strong><span>Use “Nuevo vehículo” para crear el primero.</span></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <Modal title={form.idVehiculo ? 'Editar vehículo' : 'Nuevo vehículo'} onClose={() => !saving && setForm(null)}>
          <form onSubmit={submit} noValidate>
            <div className="form-grid">
              <label className="field field--full"><span>Categoría</span>
                <select value={form.idCategoria} onChange={(event) => setForm({ ...form, idCategoria: event.target.value })} disabled={saving}>
                  <option value="">Seleccione una categoría</option>
                  {categorias.map((category) => <option key={category.idCategoria} value={category.idCategoria}>{category.nombre}</option>)}
                </select>
                {errors.idCategoria && <small className="field-error">{errors.idCategoria}</small>}
              </label>
              <label className="field"><span>Marca</span><input value={form.marca} maxLength="100" onChange={(event) => setForm({ ...form, marca: event.target.value })} disabled={saving} />{errors.marca && <small className="field-error">{errors.marca}</small>}</label>
              <label className="field"><span>Modelo</span><input value={form.modelo} maxLength="100" onChange={(event) => setForm({ ...form, modelo: event.target.value })} disabled={saving} />{errors.modelo && <small className="field-error">{errors.modelo}</small>}</label>
              <label className="field"><span>Precio</span><input type="number" min="0" step="0.01" value={form.precio} onChange={(event) => setForm({ ...form, precio: event.target.value })} disabled={saving} />{errors.precio && <small className="field-error">{errors.precio}</small>}</label>
              <label className="field"><span>Stock</span><input type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} disabled={saving} />{errors.stock && <small className="field-error">{errors.stock}</small>}</label>
              <label className="toggle-field field--full"><input type="checkbox" checked={form.estado} onChange={(event) => setForm({ ...form, estado: event.target.checked })} disabled={saving} /><span><strong>Vehículo activo</strong><small>Disponible para operaciones del catálogo</small></span></label>
            </div>
            <footer className="modal__actions"><button className="button button--secondary" type="button" onClick={() => setForm(null)} disabled={saving}>Cancelar</button><button className="button button--primary" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar vehículo'}</button></footer>
          </form>
        </Modal>
      )}

      {deleting && <ConfirmDialog title="Eliminar vehículo" message={<>¿Desea eliminar <strong>{deleting.marca} {deleting.modelo}</strong>? Esta acción no se puede deshacer.</>} busy={deleteBusy} onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />}
    </section>
  )
}
