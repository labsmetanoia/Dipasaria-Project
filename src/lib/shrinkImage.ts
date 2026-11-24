// Browser only: a photo from the camera or gallery, resized to at most 1280 px and saved as a JPEG data URL under
// about 700 kB (guarantee photos, refund receipts). The server checks the format and size again.
export async function shrinkImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    let q = 0.72, out = c.toDataURL("image/jpeg", q);
    while (out.length > 700_000 && q > 0.35) { q -= 0.12; out = c.toDataURL("image/jpeg", q); }
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}
