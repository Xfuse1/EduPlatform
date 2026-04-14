function sanitizeFileNamePart(value: string) {
  const sanitized = value
    .normalize("NFKC")
    .trim()
    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g, "") // إزالة العربية
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "")
    .replace(/\.+$/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "file";
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts.pop()?.toLowerCase() || "";
}

export function buildStorageFilePath({
  folder,
  file,
  parts,
}: {
  folder: string;
  file: File;
  parts: string[];
}) {
  const extension = getFileExtension(file.name);
  const baseName = sanitizeFileNamePart(parts.filter(Boolean).join(" - "));
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = extension ? `${baseName}.${extension}` : baseName;

  return `${folder}/${uniquePrefix}/${fileName}`;
}
