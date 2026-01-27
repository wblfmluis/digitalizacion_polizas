type MySqlDateString = `${number}-${number}-${number}`;
type MySqlDateTimeString =
  `${number}-${number}-${number} ${number}:${number}:${number}`;
import moment from 'moment';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Convierte un Date a "YYYY-MM-DD"
 */
export function toMySqlDate(d: Date): MySqlDateString {
  // OJO: usando componentes locales (no UTC) para evitar corrimientos por zona horaria
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}` as MySqlDateString;
}

export function dateForName(d: string) {
  return moment(d).format('DD-MM-YYYY');
}

/**
 * Convierte un Date a "YYYY-MM-DD HH:mm:ss"
 */
export function toMySqlDateTime(d: Date): MySqlDateTimeString {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}` as MySqlDateTimeString;
}

/**
 * Excel serial date -> Date (modo 1900).
 * Nota: Excel tiene el "leap year bug" de 1900; esta conversión lo maneja de forma estándar.
 */
export function excelSerialToDate(serial: number): Date {
  // Excel: días desde 1899-12-30 (en la práctica)
  const utcDays = Math.floor(serial);
  const utcValue = (utcDays - 25569) * 86400; // seconds since 1970-01-01
  const dateInfo = new Date(utcValue * 1000);

  // Si trae fracción (hora)
  const fractionalDay = serial - utcDays;
  if (fractionalDay) {
    const totalSeconds = Math.round(fractionalDay * 86400);
    dateInfo.setSeconds(dateInfo.getSeconds() + totalSeconds);
  }
  return dateInfo;
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

/**
 * Intenta parsear diferentes representaciones de fecha.
 * Retorna Date o null si no se puede.
 *
 * preferDayFirst=true  => interpreta "01/02/2026" como 1-Feb-2026
 * preferDayFirst=false => interpreta "01/02/2026" como Jan-2-2026
 */
export function parseFlexibleDate(
  value: unknown,
  opts?: { preferDayFirst?: boolean },
): Date | null {
  const preferDayFirst = opts?.preferDayFirst ?? true;

  if (value == null || value === '') return null;

  // 1) Ya es Date
  if (value instanceof Date) return isValidDate(value) ? value : null;

  // 2) Número: puede ser serial de Excel o epoch ms (depende tu input)
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Heurística: serial de Excel suele estar ~ 40000-60000 para fechas modernas
    if (value > 20000 && value < 90000) return excelSerialToDate(value);

    // Si parece epoch ms (13 dígitos) o epoch seconds (10 dígitos)
    if (value > 1e12) {
      const d = new Date(value);
      return isValidDate(d) ? d : null;
    }
    if (value > 1e9) {
      const d = new Date(value * 1000);
      return isValidDate(d) ? d : null;
    }
  }

  // 3) String
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;

    // 3a) ISO "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm:ss..."
    // Nota: new Date("YYYY-MM-DD") puede tratarlo como UTC en algunos entornos,
    // por eso lo parseamos manual si viene exactamente YYYY-MM-DD.
    const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
    const mIso = s.match(isoDateOnly);
    if (mIso) {
      const yyyy = Number(mIso[1]);
      const mm = Number(mIso[2]);
      const dd = Number(mIso[3]);
      const d = new Date(yyyy, mm - 1, dd);
      return isValidDate(d) ? d : null;
    }

    // 3b) "DD/MM/YYYY" o "MM/DD/YYYY" o con "-"
    const dmyOrMdy =
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
    const m = s.match(dmyOrMdy);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const yyyy = Number(m[3]);
      const hh = m[4] ? Number(m[4]) : 0;
      const mi = m[5] ? Number(m[5]) : 0;
      const ss = m[6] ? Number(m[6]) : 0;

      const day = preferDayFirst ? a : b;
      const month = preferDayFirst ? b : a;

      const d = new Date(yyyy, month - 1, day, hh, mi, ss);
      return isValidDate(d) ? d : null;
    }

    // 3c) Último recurso: Date.parse (para strings como "Jan 26 2026", ISO completo, etc.)
    const d = new Date(s);
    return isValidDate(d) ? d : null;
  }

  return null;
}

/**
 * Normaliza a MySQL DATE (YYYY-MM-DD) o lanza error si no se puede.
 */
export function normalizeToMySqlDate(
  value: unknown,
  opts?: { preferDayFirst?: boolean; fieldName?: string },
): MySqlDateString {
  const d = parseFlexibleDate(value, { preferDayFirst: opts?.preferDayFirst });
  if (!d) {
    throw new Error(
      `Fecha inválida${opts?.fieldName ? ` en ${opts.fieldName}` : ''}: ${String(value)}`,
    );
  }
  return toMySqlDate(d);
}

/**
 * Normaliza a MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
 */
export function normalizeToMySqlDateTime(
  value: unknown,
  opts?: { preferDayFirst?: boolean; fieldName?: string },
): MySqlDateTimeString {
  const d = parseFlexibleDate(value, { preferDayFirst: opts?.preferDayFirst });
  if (!d) {
    throw new Error(
      `Fecha inválida${opts?.fieldName ? ` en ${opts.fieldName}` : ''}: ${String(value)}`,
    );
  }
  return toMySqlDateTime(d);
}
