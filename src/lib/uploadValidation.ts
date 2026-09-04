// Validação de uploads no cliente (complementa os limites do bucket).

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

/** Extensão segura derivada do MIME (nunca confiar no nome do arquivo). */
export function safeImageExtension(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "jpg";
  }
}

export function validateImageFile(
  file: File,
  maxBytes: number = MAX_IMAGE_BYTES,
): UploadValidationResult {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Formato não permitido. Use JPG, PNG ou WebP." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext && !(IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: "Extensão de arquivo não permitida." };
  }

  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { ok: false, error: `Arquivo muito grande. O limite é ${mb} MB.` };
  }

  if (file.size === 0) {
    return { ok: false, error: "Arquivo vazio." };
  }

  return { ok: true };
}
