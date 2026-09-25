import { extractPolizaNumeroFromFilename } from './policy-filename';

describe('extractPolizaNumeroFromFilename', () => {
  it('extrae el número de nombres con patrón "DOC <numero>"', () => {
    expect(extractPolizaNumeroFromFilename('34. DOC 3000000645 TERYTER')).toBe(
      '3000000645',
    );
    expect(
      extractPolizaNumeroFromFilename(
        '5. DOC 3000000165 PODER JUDICIAL DEL ESTADO DE GUANAJUATO',
      ),
    ).toBe('3000000165');
    expect(
      extractPolizaNumeroFromFilename('1. DOC 100000150 SINDICATO AUTONOMO'),
    ).toBe('100000150');
  });

  it('acepta el prefijo "DOC." con punto', () => {
    expect(
      extractPolizaNumeroFromFilename(
        '92. DOC. 3000002605 YESICA DENIS MACIEL RANGEL',
      ),
    ).toBe('3000002605');
  });

  it('es insensible a mayúsculas/minúsculas y a espacios múltiples', () => {
    expect(extractPolizaNumeroFromFilename('doc   3000000645   x')).toBe(
      '3000000645',
    );
  });

  it('devuelve null cuando no hay patrón DOC (no interfiere con nomenclatura)', () => {
    expect(extractPolizaNumeroFromFilename('PZ-2026-000123')).toBeNull();
    expect(extractPolizaNumeroFromFilename('34. TERYTER 3000000645')).toBeNull();
  });

  it('devuelve null para cadena vacía o nula', () => {
    expect(extractPolizaNumeroFromFilename('')).toBeNull();
    expect(extractPolizaNumeroFromFilename(undefined as unknown as string)).toBeNull();
  });
});
