import { useEffect, useState, type FormEvent } from 'react'
import QRCode from 'qrcode'
import { useTables } from '../hooks/useTables'

function TableQR({ url, label }: { url: string; label: string }) {
  const [qr, setQr] = useState('')
  useEffect(() => {
    let active = true
    QRCode.toDataURL(url, { width: 180, margin: 1 })
      .then((data) => { if (active) setQr(data) })
      .catch(() => { if (active) setQr('') })
    return () => { active = false }
  }, [url])

  return (
    <div className="table-qr-card">
      {qr && <img src={qr} alt={`QR Code da mesa ${label}`} />}
      <strong>Mesa {label}</strong>
      <small>Escaneie para pedir</small>
    </div>
  )
}

export default function TableQRManager({ slug }: { slug: string }) {
  const { tables, error, addTable, deleteTable } = useTables()
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  async function run(action: () => Promise<void>, key: string) {
    setBusy(key)
    setMessage('')
    try {
      await action()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setBusy('')
    }
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    if (!label.trim()) return
    void run(async () => {
      await addTable(label.trim())
      setLabel('')
      setMessage('Mesa adicionada.')
    }, 'add')
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>QR Code por mesa</h2>
        <span className="muted">Cada QR leva o cliente ao cardápio já identificado pela mesa.</span>
      </div>

      {(error || message) && <div className={`banner ${error ? 'error' : 'success'}`}>{error || message}</div>}

      <form onSubmit={handleAdd} className="category-add no-print">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Número ou nome da mesa (ex.: 1, A2, Balcão)"
          maxLength={30}
        />
        <button className="secondary" type="submit" disabled={busy === 'add'}>Adicionar mesa</button>
        {tables.length > 0 && (
          <button className="primary" type="button" onClick={() => window.print()}>Imprimir todos</button>
        )}
      </form>

      {tables.length === 0 && <p className="empty">Nenhuma mesa cadastrada. O QR geral do restaurante continua funcionando sem mesa.</p>}

      <div className="table-qr-grid print-area">
        {tables.map((table) => {
          const url = `${window.location.origin}/cardapio/${slug}?mesa=${encodeURIComponent(table.label)}`
          return (
            <div className="table-qr-item" key={table.id}>
              <TableQR url={url} label={table.label} />
              <button
                className="danger no-print"
                disabled={busy === table.id}
                onClick={() => void run(() => deleteTable(table.id), table.id)}
              >
                Excluir
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
