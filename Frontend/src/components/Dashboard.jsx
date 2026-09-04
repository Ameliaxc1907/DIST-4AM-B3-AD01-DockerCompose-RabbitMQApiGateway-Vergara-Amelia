import Icon from './Icons.jsx'

export default function Dashboard({ vehiculos, categorias, loading, onNavigate }) {
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
          <h2>Administre el inventario</h2>
          <p>Consulte y mantenga actualizados los registros principales.</p>
        </div>
        <div className="quick-actions">
          <button className="quick-action" type="button" onClick={() => onNavigate('vehiculos')}>
            <span><Icon name="car" /></span>
            <div><strong>Gestionar vehículos</strong><small>Consultar, crear y editar</small></div>
            <Icon name="arrow" />
          </button>
          <button className="quick-action" type="button" onClick={() => onNavigate('categorias')}>
            <span><Icon name="tag" /></span>
            <div><strong>Gestionar categorías</strong><small>Organizar el catálogo</small></div>
            <Icon name="arrow" />
          </button>
        </div>
      </article>
    </section>
  )
}
