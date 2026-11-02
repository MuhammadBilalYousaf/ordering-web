const MAX_EDGE = 960;
const STORE_EDGE = 640;
const STORE_QUALITY = 0.45;
const MAX_STORED_BYTES = 200000;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    image.src = url;
  });
}

function drawToCanvas(image, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

function dataUrlByteLength(dataUrl) {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  return Math.ceil((dataUrl.length - comma - 1) * 0.75);
}

/** Compress a payment screenshot the same way product photos are stored (JPEG data URL in Firestore). */
export async function compressPaymentProof(file) {
  const image = await loadImage(file);
  const canvas = drawToCanvas(image, STORE_EDGE);
  let quality = STORE_QUALITY;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrlByteLength(dataUrl) > MAX_STORED_BYTES && quality > 0.2) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  if (dataUrlByteLength(dataUrl) > MAX_STORED_BYTES) {
    throw new Error('That screenshot is too large. Try a clearer crop of the payment receipt.');
  }
  return dataUrl;
}

function pickReference(text) {
  const normalized = String(text || '').replace(/\r/g, '\n');
  const labeled = [
    /(?:tid|transaction\s*id|txn\s*id|trans(?:action)?\s*(?:id|no|number|#)|reference(?:\s*(?:id|no|number|#))?|ref(?:erence)?(?:\s*(?:id|no|number|#))?|rrn|stan)\s*[:#.\-]?\s*([A-Z0-9\-]{6,24})/i,
  ];
  for (const pattern of labeled) {
    const match = normalized.match(pattern);
    if (match?.[1]) return match[1].replace(/[^A-Z0-9]/gi, '').toUpperCase();
  }

  const tokens = normalized.toUpperCase().match(/[A-Z0-9]{8,20}/g) || [];
  const digitHeavy = tokens
    .map((token) => token.replace(/[^A-Z0-9]/g, ''))
    .filter((token) => {
      const digits = (token.match(/\d/g) || []).length;
      return digits >= 6 && digits / token.length >= 0.6;
    })
    .sort((a, b) => b.length - a.length || b.localeCompare(a));
  if (digitHeavy[0]) return digitHeavy[0];

  const longNumber = normalized.match(/\b\d{8,16}\b/);
  return longNumber ? longNumber[0] : '';
}

/** Run OCR on a payment screenshot and return the best payment reference candidate. */
export async function extractPaymentReference(file) {
  const [{ createWorker }, image] = await Promise.all([
    import('tesseract.js'),
    loadImage(file),
  ]);
  const canvas = drawToCanvas(image, MAX_EDGE);
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(canvas);
    return pickReference(data?.text || '');
  } finally {
    await worker.terminate();
  }
}
