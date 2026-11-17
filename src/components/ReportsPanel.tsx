import { useState } from 'react'
import { useReports } from '../hooks/useReports'

const money = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`
const periods = [7, 30, 90]

export default function ReportsPanel() {
  const [days, setDays] = useState(7)
  const { report, loading, error, refresh } = useReports(days)

  const max = Math.max(1, ...(report?.daily.map((day) => day.revenue) ?? []))

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Relatórios</h2>
        <span className="muted">Resumo de vendas por período.</span>
      </div>

      <div className="period-tabs no-print">
        {periods.map((period) => (
          <button
            key={period}
            className={days === period ? 'active' : ''}
            onClick={() => setDays(period)}
          >
            Últimos {period} dias
          </button>
        ))}
        <button onClick={() => void refresh()}>Atualizar</button>
      </div>

      {error && <div className="banner error">{error}</div>}
      {loading && <p className="muted">Carregando relatório…</p>}

      {report && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>Faturamento</span>
              <strong>{money(report.totals.revenue)}</strong>
            </div>
            <div className="stat-card">
              <span>Pedidos</span>
              <strong>{report.totals.orders}</strong>
            </div>
            <div className="stat-card">
              <span>Ticket médio</span>
              <strong>{money(report.totals.avgTicket)}</strong>
            </div>
          </div>

          <h3>Faturamento por dia</h3>
          {report.totals.orders === 0 ? (
            <p className="empty">Nenhum pedido nesse período.</p>
          ) : (
            <div className="revenue-chart">
              {report.daily.map((day) => (
                <div className="chart-column" key={day.day} title={`${day.day}: ${day.orders} pedido(s), ${money(day.revenue)}`}>
                  <div className="chart-bar-wrap">
                    <div className="chart-bar" style={{ height: `${Math.max(2, (day.revenue / max) * 100)}%` }} />
                  </div>
                  <small>{day.day.slice(5)}</small>
                </div>
              ))}
            </div>
          )}

          <h3>Pratos mais vendidos</h3>
          {report.topDishes.length === 0 ? (
            <p className="empty">Nenhum prato vendido nesse período.</p>
          ) : (
            <ol className="top-dishes">
              {report.topDishes.map((dish) => (
                <li key={dish.name}>
                  <span>{dish.name}</span>
                  <span className="muted">{dish.qty} × · {money(dish.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
