import Icon from './Icons.jsx'

export default function Dashboard({ vehiculos, categorias, loading, onNavigate, canManage }) {
  return (
    <section className="page-stack">
      <header className="page-header page-header--welcome">
        <div>
          <span className="eyebrow">Resumen general</span>
          <h1>Estado del catálogo</h1>
          <p>Información actual obtenida mediante el API Gateway.</p>
        </div>
        <span className="date-chip">Sesión activa</span>
      </header>

      <div className="metric-grid">
        <article className="metric-card metric-card--blue">
          <span className="metric-card__icon"><Icon name="car" size={24} /></span>
          <div><small>Vehículos registrados</small><strong>{loading ? '—' : vehiculos.length}</strong></div>
          <button type="button" onClick={() => onNavigate('vehiculos')}>Ver vehículos <Icon name="arrow" size={16} /></button>
        </article>
        <article className="metric-card metric-card--amber">
          <span className="metric-card__icon"><Icon name="tag" size={24} /></span>
          <div><small>Categorías disponibles</small><strong>{loading ? '—' : categorias.length}</strong></div>
          <button type="button" onClick={() => onNavigate('categorias')}>Ver categorías <Icon name="arrow" size={16} /></button>
        </article>
      </div>

      <article className="quick-panel">
        <div>
          <span className="eyebrow">Accesos rápidos</span>
          <h2>{canManage ? 'Administre el inventario' : 'Consulte el inventario'}</h2>
          <p>{canManage ? 'Consulte y mantenga actualizados los registros principales.' : 'Revise los registros disponibles en el sistema.'}</p>
        </div>
        <div className="quick-actions">
          <button className="quick-action" type="button" onClick={() => onNavigate('vehiculos')}>
            <span><Icon name="car" /></span>
            <div><strong>{canManage ? 'Gestionar vehículos' : 'Ver vehículos'}</strong><small>{canManage ? 'Consultar, crear y editar' : 'Consultar registros'}</small></div>
            <Icon name="arrow" />
          </button>
          <button className="quick-action" type="button" onClick={() => onNavigate('categorias')}>
            <span><Icon name="tag" /></span>
            <div><strong>{canManage ? 'Gestionar categorías' : 'Ver categorías'}</strong><small>{canManage ? 'Organizar el catálogo' : 'Consultar registros'}</small></div>
            <Icon name="arrow" />
          </button>
        </div>
      </article>
    </section>
  )
}
