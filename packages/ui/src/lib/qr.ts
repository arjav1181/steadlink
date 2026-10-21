/**
 * QR rendering: module matrix -> SVG.
 *
 * The library gives us the module matrix and the error-correction level.
 * Everything visual - dot patterns, per-corner shapes, colours, the logo
 * plate - is rendered here, because no library does all of it and none of
 * them does it headlessly.
 */

import qrcode from "qrcode-generator";

export const DOT_PATTERNS = [
  "standard",
  "circle",
  "block",
  "blob",
  "rounded",
  "vertical",
  "horizontal",
  "triangle",
  "heart",
  "star",
  "diamond",
] as const;

export const CORNER_SHAPES = [
  "standard",
  "slightly_round",
  "rounded",
  "extra_round",
  "leaf",
  "leaf_inner",
  "leaf_outer",
  "target",
  "concave",
] as const;

export type DotPattern = (typeof DOT_PATTERNS)[number];
export type CornerShape = (typeof CORNER_SHAPES)[number];

/**
 * `string & {}` keeps the literal union's autocomplete while still accepting
 * any string, so a design that came from storage (typed as a plain string)
 * is assignable without a cast at every call site.
 */
export type Loose<T extends string> = T | (string & {});

export interface QrDesign {
  dotPattern?: Loose<DotPattern>;
  backgroundColor?: string;
  dotPatternColor?: string;
  cornerShapes?: {
    topLeft?: Loose<CornerShape>;
    topRight?: Loose<CornerShape>;
    bottomRight?: Loose<CornerShape>;
  };
  transparentBackground?: boolean;
  /**
   * A logo, as a data URL.
   *
   * It is drawn on a plate in the middle of the code, which is why the
   * code is built with the highest error correction: a plate over the
   * middle still leaves the code readable.
   */
  logo?: string;
  /** A line of text under the code. */
  text?: string;
  /** The colour of that text. */
  textColor?: string;
}

export const DEFAULT_DESIGN: Required<
  Pick<QrDesign, "dotPattern" | "backgroundColor" | "dotPatternColor" | "transparentBackground">
> = {
  dotPattern: "standard",
  backgroundColor: "#ffffff",
  dotPatternColor: "#272d36",
  transparentBackground: false,
};

export interface QrMatrix {
  size: number;
  /** module[y][x] is true when the module is dark. */
  modules: boolean[][];
  /** finder-pattern corner positions, so the renderer can replace them. */
  finders: { row: number; col: number }[];
}

/** Build the module matrix for a URL at error-correction level H. */
export function buildMatrix(text: string, typeNumber = 0): QrMatrix {
  // 0 means "pick the smallest version that fits"; the library types it as a
  // numeric enum, so cast through its own parameter type.
  const qr = qrcode(typeNumber as Parameters<typeof qrcode>[0], "H");
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const modules: boolean[][] = [];
  for (let row = 0; row < count; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < count; col += 1) {
      line.push(qr.isDark(row, col));
    }
    modules.push(line);
  }

  return {
    size: count,
    modules,
    finders: [
      { row: 0, col: 0 },
      { row: 0, col: count - 7 },
      { row: count - 7, col: count - 7 },
    ],
  };
}

function isFinderCell(matrix: QrMatrix, row: number, col: number): boolean {
  for (const finder of matrix.finders) {
    if (row >= finder.row && row < finder.row + 7 && col >= finder.col && col < finder.col + 7) {
      return true;
    }
  }
  return false;
}

function cornerFor(
  row: number,
  col: number,
  matrix: QrMatrix,
): "topLeft" | "topRight" | "bottomRight" | null {
  for (const finder of matrix.finders) {
    if (row >= finder.row && row < finder.row + 7 && col >= finder.col && col < finder.col + 7) {
      if (finder.row === 0 && finder.col === 0) return "topLeft";
      if (finder.row === 0) return "topRight";
      return "bottomRight";
    }
  }
  return null;
}

function shapePath(shape: Loose<CornerShape>, size: number): string {
  const r = size;
  switch (shape) {
    case "rounded":
      return `M${r * 0.25},0 h${r * 0.5} a${r * 0.25},${r * 0.25} 0 0 1 ${r * 0.25},${r * 0.25} v${r * 0.5} a${r * 0.25},${r * 0.25} 0 0 1 ${-r * 0.25},${r * 0.25} h${-r * 0.5} a${r * 0.25},${r * 0.25} 0 0 1 ${-r * 0.25},${-r * 0.25} v${-r * 0.5} a${r * 0.25},${r * 0.25} 0 0 1 ${r * 0.25},${-r * 0.25} z`;
    case "extra_round":
      return `M${r * 0.4},0 h${r * 0.2} a${r * 0.4},${r * 0.4} 0 0 1 ${r * 0.4},${r * 0.4} v${r * 0.2} a${r * 0.4},${r * 0.4} 0 0 1 ${-r * 0.4},${r * 0.4} h${-r * 0.2} a${r * 0.4},${r * 0.4} 0 0 1 ${-r * 0.4},${-r * 0.4} v${-r * 0.2} a${r * 0.4},${r * 0.4} 0 0 1 ${r * 0.4},${-r * 0.4} z`;
    case "target":
      return `M0,0 h${r} v${r} h${-r} z M${r * 0.25},${r * 0.25} h${r * 0.5} v${r * 0.5} h${-r * 0.5} z`;
    case "concave":
      return `M0,0 h${r} v${r} h${-r} z M${r * 0.3},${r * 0.3} h${r * 0.4} v${r * 0.4} h${-r * 0.4} z`;
    case "leaf":
      return `M0,${r / 2} a${r / 2},${r / 2} 0 0 1 ${r},0 a${r / 2},${r / 2} 0 0 1 ${-r},0 z`;
    default:
      return `M${r * 0.12},0 h${r * 0.76} a${r * 0.12},${r * 0.12} 0 0 1 ${r * 0.12},${r * 0.12} v${r * 0.76} a${r * 0.12},${r * 0.12} 0 0 1 ${-r * 0.12},${r * 0.12} h${-r * 0.76} a${r * 0.12},${r * 0.12} 0 0 1 ${-r * 0.12},${-r * 0.12} v${-r * 0.76} a${r * 0.12},${r * 0.12} 0 0 1 ${r * 0.12},${-r * 0.12} z`;
  }
}

function dotFor(pattern: Loose<DotPattern>, x: number, y: number, unit: number): string {
  const cx = x * unit + unit / 2;
  const cy = y * unit + unit / 2;
  switch (pattern) {
    case "circle":
      return `<circle cx="${cx}" cy="${cy}" r="${unit * 0.42}" />`;
    case "rounded":
      return `<rect x="${x * unit + unit * 0.1}" y="${y * unit + unit * 0.1}" width="${unit * 0.8}" height="${unit * 0.8}" rx="${unit * 0.3}" />`;
    case "blob":
      return `<circle cx="${cx}" cy="${cy}" r="${unit * 0.46}" />`;
    case "vertical":
      return `<rect x="${x * unit + unit * 0.18}" y="${y * unit + unit * 0.05}" width="${unit * 0.64}" height="${unit * 0.9}" rx="${unit * 0.2}" />`;
    case "horizontal":
      return `<rect x="${x * unit + unit * 0.05}" y="${y * unit + unit * 0.18}" width="${unit * 0.9}" height="${unit * 0.64}" rx="${unit * 0.2}" />`;
    case "triangle":
      return `<path d="M${cx},${y * unit + unit * 0.1} L${x * unit + unit * 0.9},${y * unit + unit * 0.85} L${x * unit + unit * 0.1},${y * unit + unit * 0.85} Z" />`;
    case "heart":
      return `<path d="M${cx},${y * unit + unit * 0.85} C${x * unit},${y * unit + unit * 0.45} ${x * unit + unit * 0.1},${y * unit + unit * 0.05} ${cx},${y * unit + unit * 0.32} C${x * unit + unit * 0.9},${y * unit + unit * 0.05} ${x * unit + unit},${y * unit + unit * 0.45} ${cx},${y * unit + unit * 0.85} Z" />`;
    case "star":
      return `<path d="M${cx},${y * unit + unit * 0.05} L${cx + unit * 0.12},${y * unit + unit * 0.36} L${cx + unit * 0.45},${y * unit + unit * 0.36} L${cx + unit * 0.2},${y * unit + unit * 0.58} L${cx + unit * 0.3},${y * unit + unit * 0.9} L${cx},${y * unit + unit * 0.7} L${cx - unit * 0.3},${y * unit + unit * 0.9} L${cx - unit * 0.2},${y * unit + unit * 0.58} L${cx - unit * 0.45},${y * unit + unit * 0.36} L${cx - unit * 0.12},${y * unit + unit * 0.36} Z" />`;
    case "diamond":
      return `<path d="M${cx},${y * unit + unit * 0.05} L${x * unit + unit * 0.9},${cy} L${cx},${y * unit + unit * 0.9} L${x * unit + unit * 0.1},${cy} Z" />`;
    default:
      return `<rect x="${x * unit}" y="${y * unit}" width="${unit}" height="${unit}" />`;
  }
}

export interface RenderQrOptions {
  text: string;
  design?: QrDesign;
  /** Rendered size in px. */
  size?: number;
  /** Quiet zone in modules. The spec requires 4. */
  quietZone?: number;
  title?: string;
}

/** Escape the characters that would end the markup early. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Render a QR code to an SVG string. */
export function renderQrSvg({
  text,
  design = {},
  size = 200,
  quietZone = 4,
  title,
}: RenderQrOptions): string {
  const matrix = buildMatrix(text);
  const unit = 4;
  const total = (matrix.size + quietZone * 2) * unit;
  const fg = design.dotPatternColor ?? DEFAULT_DESIGN.dotPatternColor;
  const bg = design.transparentBackground
    ? "none"
    : (design.backgroundColor ?? DEFAULT_DESIGN.backgroundColor);
  const pattern = design.dotPattern ?? DEFAULT_DESIGN.dotPattern;
  const shapes = design.cornerShapes ?? {};

  // A line of text under the code makes the picture taller, so the
  // height is the code plus a band for the text.
  const caption = (design.text ?? "").trim();
  const textBand = caption ? Math.max(unit * 7, Math.round(total * 0.14)) : 0;
  const height = total + textBand;

  const parts: string[] = [];
  parts.push(`<rect x="0" y="0" width="${total}" height="${total}" fill="${bg}" />`);

  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (!matrix.modules[row]?.[col]) continue;
      if (isFinderCell(matrix, row, col)) continue;
      // dotFor takes MODULE INDICES and multiplies by the unit itself.
      parts.push(dotFor(pattern, col + quietZone, row + quietZone, unit));
    }
  }

  // Finder patterns, replaced with the chosen corner shape.
  for (const finder of matrix.finders) {
    const corner = cornerFor(finder.row, finder.col, matrix);
    const shape =
      corner === "topLeft"
        ? (shapes.topLeft ?? "standard")
        : corner === "topRight"
          ? (shapes.topRight ?? "standard")
          : (shapes.bottomRight ?? "standard");
    const x = (finder.col + quietZone) * unit;
    const y = (finder.row + quietZone) * unit;
    const outer = shapePath(shape, unit * 7);
    const inner = shapePath(shape === "target" ? "rounded" : "slightly_round", unit * 3);
    parts.push(
      `<g transform="translate(${x} ${y})"><path d="${outer}" fill="${fg}" /><rect x="${unit * 2}" y="${unit * 2}" width="${unit * 3}" height="${unit * 3}" fill="${bg}" /><g transform="translate(${unit * 2} ${unit * 2})"><path d="${inner}" fill="${fg}" /></g></g>`,
    );
  }

  // The logo, on a plate so it does not fight with the code behind it.
  // The plate is white on a transparent background, because a logo on
  // nothing is a logo nobody can see.
  if (design.logo) {
    const plate = total * 0.24;
    const pad = plate * 0.1;
    const inner = plate - pad * 2;
    const x = (total - plate) / 2;
    const y = (total - plate) / 2;
    parts.push(
      `<rect x="${x}" y="${y}" width="${plate}" height="${plate}" rx="${plate * 0.14}" fill="${bg === "none" ? "#ffffff" : bg}" />`,
      `<image href="${escapeXml(design.logo)}" x="${x + pad}" y="${y + pad}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet" />`,
    );
  }

  // The text under the code. A long line is made smaller rather than
  // allowed to run off the edge.
  if (caption) {
    const colour = design.textColor ?? fg;
    const ideal = textBand * 0.46;
    const fitted = (total * 0.88) / Math.max(1, caption.length * 0.56);
    const fontSize = Math.max(unit * 2, Math.min(ideal, fitted));
    parts.push(
      `<text x="${total / 2}" y="${total + textBand * 0.66}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" fill="${colour}">${escapeXml(caption)}</text>`,
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${height}" width="${size}" height="${Math.round((size * height) / total)}" role="img"${title ? ` aria-label="${escapeXml(title)}"` : ""}>`,
    `<g fill="${fg}">${parts.join("")}</g>`,
    `</svg>`,
  ].join("");
}

/**
 * Rough contrast check between the code colour and its background.
 * Returns a ratio; below 3 the code is likely hard to scan.
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const h = hex.replace("#", "");
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const [r, g, b] = [0, 2, 4].map((i) => {
      const c = Number.parseInt(full.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };
  const a = lum(hexA);
  const b = lum(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
