/**
 * Comprime una imagen del lado del cliente antes de enviarla a la API.
 * Retorna base64 sin el prefijo data:...;base64,
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context not available"));
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convierte un File a base64 sin comprimir.
 */
export async function fileToBase64(
  file: File
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Genera un ID único para cada imagen.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Recorta un base64 al ratio dado (w/h) desde el centro.
 * Usado para normalizar el output de Gemini (siempre 1:1) al ratio del input.
 */
export async function cropBase64ToRatio(
  base64: string,
  mimeType: string,
  targetRatio: number
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const srcRatio = srcW / srcH;

      let cropW = srcW;
      let cropH = srcH;
      let offsetX = 0;
      let offsetY = 0;

      if (Math.abs(srcRatio - targetRatio) < 0.05) {
        // Already close enough — skip crop
        resolve({ base64, mimeType });
        return;
      }

      if (srcRatio > targetRatio) {
        // Source wider than target → crop horizontally
        cropW = Math.round(srcH * targetRatio);
        offsetX = Math.round((srcW - cropW) / 2);
      } else {
        // Source taller than target → crop vertically
        cropH = Math.round(srcW / targetRatio);
        offsetY = Math.round((srcH - cropH) / 2);
      }

      const canvas = document.createElement("canvas");
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ base64, mimeType }); return; }
      ctx.drawImage(img, offsetX, offsetY, cropW, cropH, 0, 0, cropW, cropH);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = () => resolve({ base64, mimeType });
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * Detecta el aspect ratio de un File y lo mapea al ratio Gemini más cercano.
 * Gemini soporta: "1:1", "3:4", "4:3", "9:16", "16:9"
 */
export async function getImageAspectRatio(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const r = img.width / img.height;
      URL.revokeObjectURL(img.src);
      if (r > 1.6) resolve("16:9");
      else if (r > 1.1) resolve("4:3");
      else if (r > 0.85) resolve("1:1");
      else if (r > 0.55) resolve("3:4");
      else resolve("9:16");
    };
    img.onerror = () => resolve("4:3");
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Descarga una imagen base64 como archivo.
 */
export function downloadBase64Image(
  base64: string,
  mimeType: string,
  filename: string
) {
  const link = document.createElement("a");
  link.href = `data:${mimeType};base64,${base64}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Descarga múltiples imágenes como ZIP usando JSZip.
 */
export async function downloadAllAsZip(
  images: { base64: string; mimeType: string; filename: string }[]
) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  images.forEach(({ base64, filename }) => {
    zip.file(filename, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "a-interior-renders.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
