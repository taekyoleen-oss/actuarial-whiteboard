export async function recognizeHandwriting(imageBase64: string): Promise<string> {
  const response = await fetch('/api/handwriting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64 }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error ?? `서버 오류 ${response.status}`)
  }

  const data = await response.json()
  return data.text as string
}
