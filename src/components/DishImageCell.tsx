import { useRef, useState, type ChangeEvent } from 'react'
import { fileToDataUrl } from '../utils/image'

type Props = {
  image: string
  name: string
  disabled?: boolean
  onSave: (image: string) => Promise<void>
}

export default function DishImageCell({ image, name, disabled, onSave }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    try {
      await onSave(await fileToDataUrl(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível usar a imagem.')
    }
  }

  return (
    <div className="image-cell">
      {image ? <img src={image} alt={`Foto de ${name}`} /> : <span className="no-image">sem foto</span>}
      <div className="image-actions">
        <button className="mini-button" disabled={disabled} onClick={() => inputRef.current?.click()}>Foto</button>
        {image && (
          <button className="mini-button danger" disabled={disabled} onClick={() => void onSave('')}>Remover</button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => void handleFile(event)}
      />
      {error && <span className="image-error">{error}</span>}
    </div>
  )
}
