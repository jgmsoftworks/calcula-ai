import { parseNutritionText } from './nutritionImport';

/** Runs only after a photo is selected. Images stay in the browser during recognition. */
export async function recognizeNutritionPhoto(file: File, signal: AbortSignal, onProgress: (progress: number) => void) {
  const { createWorker } = await import('tesseract.js');
  signal.throwIfAborted();
  const worker = await createWorker('por', 1, {
    logger: message => onProgress(message.status === 'recognizing text' ? Math.round(message.progress * 100) : 0),
  });
  const abort = () => { void worker.terminate(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    const { data } = await worker.recognize(file);
    signal.throwIfAborted();
    return parseNutritionText(data.text);
  } finally {
    signal.removeEventListener('abort', abort);
    await worker.terminate();
  }
}
