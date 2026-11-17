import { useState, type FormEvent } from 'react'
import type { useCategories } from '../hooks/useCategories'

type Props = ReturnType<typeof useCategories>

export default function CategoryManager({ categories, error, addCategory, renameCategory, moveCategory, deleteCategory }: Props) {
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')

  async function run(action: () => Promise<void>, label: string) {
    setBusy(label)
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
    if (!newName.trim()) return
    void run(async () => {
      await addCategory(newName.trim())
      setNewName('')
      setMessage('Categoria adicionada.')
    }, 'adicionar')
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Categorias do cardápio</h2>
        <span className="muted">Definem a ordem de exibição no site dos clientes.</span>
      </div>

      {(error || message) && <div className={`banner ${error ? 'error' : 'success'}`}>{error || message}</div>}

      <form onSubmit={handleAdd} className="category-add">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome da categoria (ex.: Sobremesas)"
          maxLength={40}
        />
        <button className="secondary" type="submit" disabled={busy === 'adicionar'}>Adicionar</button>
      </form>

      {categories.length === 0 && <p className="empty">Nenhuma categoria criada ainda. Use "Geral" ou adicione uma acima.</p>}

      <ul className="category-list">
        {categories.map((category, index) => (
          <CategoryRow
            key={category.id}
            name={category.name}
            index={index}
            total={categories.length}
            busy={busy === category.id}
            onRename={(name) => run(async () => {
              await renameCategory(category.id, name)
              setMessage('Categoria renomeada. Pratos foram atualizados.')
            }, category.id)}
            onMove={(direction) => run(() => moveCategory(index, direction), category.id)}
            onDelete={() => run(async () => {
              await deleteCategory(category.id)
              setMessage('Categoria removida. Seus pratos foram para "Geral".')
            }, category.id)}
          />
        ))}
      </ul>
    </section>
  )
}

type RowProps = {
  name: string
  index: number
  total: number
  busy: boolean
  onRename: (name: string) => Promise<void>
  onMove: (direction: -1 | 1) => Promise<void>
  onDelete: () => Promise<void>
}

function CategoryRow({ name, index, total, busy, onRename, onMove, onDelete }: RowProps) {
  const [draft, setDraft] = useState(name)
  return (
    <li className="category-row">
      <span className="category-position">{index + 1}</span>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { if (draft.trim() && draft.trim() !== name) void onRename(draft.trim()); else setDraft(name) }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        disabled={busy}
      />
      <div className="category-row-actions">
        <button disabled={busy || index === 0} onClick={() => void onMove(-1)} title="Subir">↑</button>
        <button disabled={busy || index === total - 1} onClick={() => void onMove(1)} title="Descer">↓</button>
        <button className="danger" disabled={busy} onClick={() => void onDelete()}>Excluir</button>
      </div>
    </li>
  )
}
