import { createWorker } from 'tesseract.js'
import { readFileSync } from 'node:fs'

const pngPath = process.argv[2]
if (!pngPath) {
  console.error('usage: node ocr-worker.js <image.png>')
  process.exit(2)
}

try {
  const worker = await createWorker('fra')
  const { data } = await worker.recognize(readFileSync(pngPath))
  await worker.terminate()
  console.log(data.text)
  process.exit(0)
} catch (err) {
  console.error('OCR_FAILED:', err.message)
  process.exit(1)
}
