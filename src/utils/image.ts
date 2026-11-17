const MAX_SIZE = 900
const QUALITY = 0.8

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    image.src = url
  })
}

/** Reduz a imagem no navegador antes de enviar, para não inflar o banco. */
export async function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Escolha um arquivo de imagem.')
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error('A imagem precisa ter menos de 12 MB.')
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const scale = Math.min(1, MAX_SIZE / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível processar a imagem.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', QUALITY)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
