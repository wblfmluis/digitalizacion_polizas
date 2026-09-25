/**
 * Extrae el número de póliza embebido en nombres tipo "34. DOC 3000000645 TERYTER".
 * Devuelve el número como string (para comparar contra poliza.numero) o null.
 */
export function extractPolizaNumeroFromFilename(name: string): string | null {
  if (!name) return null;
  // Captura los dígitos que siguen a "DOC" (case-insensitive, espacios flexibles).
  const m = name.match(/\bDOC\s+(\d+)\b/i);
  return m ? m[1] : null;
}
