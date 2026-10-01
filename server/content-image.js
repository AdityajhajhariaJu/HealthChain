export function decodeContentImage(payload) {
  const mime = payload?.mimeType;
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
  if (!ext || typeof payload?.data !== 'string' || !payload.data.length || payload.data.length > 2800000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.data)) throw new Error('invalid_image');
  const bytes = Buffer.from(payload.data, 'base64');
  if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new Error('invalid_image');
  const signature = mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!signature) throw new Error('invalid_image');
  return { bytes, mime, ext };
}
