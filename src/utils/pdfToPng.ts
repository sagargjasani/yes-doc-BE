/** The slice of mupdf's API used here; its own types are only reachable through package `exports`. */
interface Mupdf {
  Document: { openDocument(data: Buffer, magic: string): MupdfDocument };
  Matrix: { scale(sx: number, sy: number): unknown };
  ColorSpace: { DeviceRGB: unknown };
}
interface MupdfDocument {
  countPages(): number;
  loadPage(index: number): {
    toPixmap(matrix: unknown, colorspace: unknown, alpha: boolean): { asPNG(): Uint8Array };
  };
}

// mupdf is ESM-only (with top-level await). A plain import() would be compiled to require()
// under our CommonJS build, so it is hidden from the compiler inside a Function.
const importEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<Mupdf>;
let mupdf: Promise<Mupdf> | null = null;

/** PDF points are 1/72 inch; render at 150 DPI so scanned certificates stay legible. */
const RENDER_SCALE = 150 / 72;

export interface RenderedPdfPage {
  png: Buffer;
  pageCount: number;
}

/** Renders the first page of a PDF to a PNG. */
export const renderPdfFirstPage = async (pdf: Buffer): Promise<RenderedPdfPage> => {
  mupdf ??= importEsm('mupdf');
  const { Document, Matrix, ColorSpace } = await mupdf;

  const document = Document.openDocument(pdf, 'application/pdf');
  const pixmap = document
    .loadPage(0)
    .toPixmap(Matrix.scale(RENDER_SCALE, RENDER_SCALE), ColorSpace.DeviceRGB, false);

  return { png: Buffer.from(pixmap.asPNG()), pageCount: document.countPages() };
};
