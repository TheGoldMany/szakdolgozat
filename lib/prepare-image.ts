/**
 * Kép előkészítése feltöltés előtt, a böngészőben.
 *
 * MIÉRT: a mai telefonok kamerája 12–50 megapixeles, egy fotó gyakran 5 MB
 * fölött van, a feltöltő pedig 5 MB-nál megáll. Ráadásul néhány Android a
 * galériából HEIC-et ad, amit a szerver nem fogad. Ezért a nagy, illetve
 * nem támogatott formátumú képet a böngésző átméretezi (hosszabbik oldal
 * legfeljebb 2000 px) és JPEG-be menti. A megjelenítéshez ez bőven elég, és
 * a feltöltés mobilneten is gyors.
 *
 * Ha a böngésző nem tudja dekódolni a képet, az eredetit adja vissza: a
 * szerveroldali ellenőrzés úgyis megmondja, ha nem fogadható.
 */

const MAX_EDGE        = 2000;
const QUALITY         = 0.85;
const KEEP_BELOW      = 1.5 * 1024 * 1024; // ennél kisebb, támogatott képhez nem nyúlunk
const ACCEPTED_TYPES  = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function prepareImage(file: File): Promise<File> {
  const supported = ACCEPTED_TYPES.includes(file.type);
  // GIF-et nem alakítunk: az animáció elveszne.
  if (file.type === "image/gif") return file;
  if (supported && file.size <= KEEP_BELOW) return file;

  try {
    const bitmap = await loadBitmap(file);
    const scale  = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width  = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width  = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    if ("close" in bitmap) bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    if (!blob) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** A kép betöltése rajzoláshoz, a telefon tájolását (EXIF) figyelembe véve. */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* régebbi Safari: lent az <img>-es út */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
