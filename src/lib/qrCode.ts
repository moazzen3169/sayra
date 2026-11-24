/**
 * Lightweight, zero-dependency ISO/IEC 18004 QR Code SVG generator
 * Supports Byte mode with Error Correction Level M (Versions 1-10, up to 213 UTF-8 bytes).
 * Used as a crisp client-side fallback when the authenticated backend QR endpoint is unavailable.
 */

interface VersionSpec {
  version: number;
  size: number;
  totalDataCodewords: number;
  ecCodewordsPerBlock: number;
  blocks: Array<{ count: number; dataCodewords: number }>;
  alignmentPositions: number[];
}

// ISO/IEC 18004 Table 9 — Error Correction Level M (Versions 1..10)
const VERSION_SPECS_M: VersionSpec[] = [
  { version: 1, size: 21, totalDataCodewords: 16, ecCodewordsPerBlock: 10, blocks: [{ count: 1, dataCodewords: 16 }], alignmentPositions: [] },
  { version: 2, size: 25, totalDataCodewords: 28, ecCodewordsPerBlock: 16, blocks: [{ count: 1, dataCodewords: 28 }], alignmentPositions: [6, 18] },
  { version: 3, size: 29, totalDataCodewords: 44, ecCodewordsPerBlock: 26, blocks: [{ count: 1, dataCodewords: 44 }], alignmentPositions: [6, 22] },
  { version: 4, size: 33, totalDataCodewords: 64, ecCodewordsPerBlock: 18, blocks: [{ count: 2, dataCodewords: 32 }], alignmentPositions: [6, 26] },
  { version: 5, size: 37, totalDataCodewords: 86, ecCodewordsPerBlock: 24, blocks: [{ count: 2, dataCodewords: 43 }], alignmentPositions: [6, 30] },
  { version: 6, size: 41, totalDataCodewords: 108, ecCodewordsPerBlock: 16, blocks: [{ count: 4, dataCodewords: 27 }], alignmentPositions: [6, 34] },
  { version: 7, size: 45, totalDataCodewords: 124, ecCodewordsPerBlock: 18, blocks: [{ count: 4, dataCodewords: 31 }], alignmentPositions: [6, 22, 38] },
  { version: 8, size: 49, totalDataCodewords: 154, ecCodewordsPerBlock: 22, blocks: [{ count: 2, dataCodewords: 38 }, { count: 2, dataCodewords: 39 }], alignmentPositions: [6, 24, 42] },
  { version: 9, size: 53, totalDataCodewords: 182, ecCodewordsPerBlock: 22, blocks: [{ count: 3, dataCodewords: 36 }, { count: 2, dataCodewords: 37 }], alignmentPositions: [6, 26, 46] },
  { version: 10, size: 57, totalDataCodewords: 216, ecCodewordsPerBlock: 26, blocks: [{ count: 4, dataCodewords: 43 }, { count: 1, dataCodewords: 44 }], alignmentPositions: [6, 28, 50] },
];

// GF(256) log/exp tables with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], factor);
    }
    poly = next;
  }
  return poly;
}

function rsComputeEcc(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const rem = new Uint8Array(ecCount);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecCount - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecCount; j++) {
        rem[j] ^= gfMul(gen[j + 1], factor);
      }
    }
  }
  return rem;
}

function encodeDataCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Mode indicator: Byte mode = 0100
  pushBits(0b0100, 4);
  // Character count indicator: 8 bits for versions 1-9, 16 bits for version 10+
  const countBits = spec.version <= 9 ? 8 : 16;
  pushBits(bytes.length, countBits);

  for (let i = 0; i < bytes.length; i++) {
    pushBits(bytes[i], 8);
  }

  const maxBits = spec.totalDataCodewords * 8;
  // Terminator (up to 4 zero bits)
  const termLen = Math.min(4, maxBits - bits.length);
  for (let i = 0; i < termLen; i++) bits.push(0);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0);

  const out = new Uint8Array(spec.totalDataCodewords);
  let idx = 0;
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i + b];
    }
    out[idx++] = byte;
  }

  // Pad codewords 0xEC, 0x11 alternating
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (idx < spec.totalDataCodewords) {
    out[idx++] = padBytes[padIdx % 2];
    padIdx++;
  }

  return out;
}

function interleaveBlocks(data: Uint8Array, spec: VersionSpec): Uint8Array {
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (const group of spec.blocks) {
    for (let c = 0; c < group.count; c++) {
      const slice = data.slice(offset, offset + group.dataCodewords);
      offset += group.dataCodewords;
      dataBlocks.push(slice);
      ecBlocks.push(rsComputeEcc(slice, spec.ecCodewordsPerBlock));
    }
  }

  const maxDataLen = Math.max(...dataBlocks.map((b) => b.length));
  const totalLen =
    spec.totalDataCodewords + ecBlocks.length * spec.ecCodewordsPerBlock;
  const result = new Uint8Array(totalLen);
  let pos = 0;

  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) result[pos++] = block[i];
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      result[pos++] = block[i];
    }
  }

  return result;
}

function computeFormatBits(mask: number): number {
  // ECC Level M = 00
  const data = (0b00 << 3) | (mask & 0b111);
  let rem = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((rem >>> (i + 10)) & 1) {
      rem ^= 0x537 << i;
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function computeVersionBits(version: number): number {
  let rem = version << 12;
  for (let i = 5; i >= 0; i--) {
    if ((rem >>> (i + 12)) & 1) {
      rem ^= 0x1f25 << i;
    }
  }
  return (version << 12) | rem;
}

function createMatrix(spec: VersionSpec, codewords: Uint8Array): boolean[][] {
  const n = spec.size;
  const modules: boolean[][] = Array.from({ length: n }, () =>
    new Array<boolean>(n).fill(false)
  );
  const isFunction: boolean[][] = Array.from({ length: n }, () =>
    new Array<boolean>(n).fill(false)
  );

  const setFunc = (r: number, c: number, val: boolean) => {
    if (r < 0 || r >= n || c < 0 || c >= n) return;
    modules[r][c] = val;
    isFunction[r][c] = true;
  };

  // Finder patterns + separators
  const drawFinder = (top: number, left: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = top + dr;
        const c = left + dc;
        if (r < 0 || r >= n || c < 0 || c >= n) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(r, c, inOuter && (onBorder || inCore));
      }
    }
  };
  drawFinder(0, 0);
  drawFinder(0, n - 7);
  drawFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const pos = spec.alignmentPositions;
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      const r = pos[i];
      const c = pos[j];
      // Skip corners overlapping finder patterns
      if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setFunc(r + dr, c + dc, dist !== 1);
        }
      }
    }
  }

  // Reserve format info areas & dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFunc(8, i, false);
      setFunc(i, 8, false);
    }
  }
  for (let i = n - 8; i < n; i++) {
    setFunc(8, i, false);
    setFunc(i, 8, false);
  }
  setFunc(n - 8, 8, true); // dark module

  // Version info areas (versions >= 7)
  if (spec.version >= 7) {
    const vBits = computeVersionBits(spec.version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >>> i) & 1) === 1;
      const a = Math.floor(i / 3);
      const b = n - 11 + (i % 3);
      setFunc(a, b, bit);
      setFunc(b, a, bit);
    }
  }

  // Place data bits in upward/downward zigzag
  let bitIndex = 0;
  const totalBits = codewords.length * 8;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      const upward = ((right + 1) & 2) === 0;
      const r = upward ? n - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isFunction[r][c]) {
          let dark = false;
          if (bitIndex < totalBits) {
            dark = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1;
            bitIndex++;
          }
          modules[r][c] = dark;
        }
      }
    }
  }

  // Evaluate 8 mask patterns and select the lowest penalty score
  const maskFns: Array<(r: number, c: number) => boolean> = [
    (r, c) => (r + c) % 2 === 0,
    (r) => r % 2 === 0,
    (_, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  const applyFormat = (grid: boolean[][], mask: number) => {
    const bits = computeFormatBits(mask);
    for (let i = 0; i <= 5; i++) grid[i][8] = ((bits >>> i) & 1) === 1;
    grid[7][8] = ((bits >>> 6) & 1) === 1;
    grid[8][8] = ((bits >>> 7) & 1) === 1;
    grid[8][7] = ((bits >>> 8) & 1) === 1;
    for (let i = 9; i < 15; i++) grid[8][14 - i] = ((bits >>> i) & 1) === 1;

    for (let i = 0; i < 8; i++) grid[8][n - 1 - i] = ((bits >>> i) & 1) === 1;
    for (let i = 8; i < 15; i++) grid[n - 15 + i][8] = ((bits >>> i) & 1) === 1;
  };

  let bestPenalty = Infinity;
  let bestGrid = modules;

  for (let m = 0; m < 8; m++) {
    const fn = maskFns[m];
    const candidate = modules.map((row, r) =>
      row.map((val, c) => (isFunction[r][c] ? val : fn(r, c) ? !val : val))
    );
    applyFormat(candidate, m);
    const penalty = evaluatePenalty(candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestGrid = candidate;
    }
  }

  return bestGrid;
}

function evaluatePenalty(grid: boolean[][]): number {
  const n = grid.length;
  let penalty = 0;

  // Rule 1: adjacent runs of 5+ same-color modules
  for (let r = 0; r < n; r++) {
    let runColor = grid[r][0];
    let runLen = 1;
    for (let c = 1; c < n; c++) {
      if (grid[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = grid[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < n; c++) {
    let runColor = grid[0][c];
    let runLen = 1;
    for (let r = 1; r < n; r++) {
      if (grid[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = grid[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  // Rule 2: 2x2 blocks of same color
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = grid[r][c];
      if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  // Rule 4: dark ratio deviation from 50%
  let darkCount = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c]) darkCount++;
    }
  }
  const percent = (darkCount * 100) / (n * n);
  const k = Math.floor(Math.abs(percent - 50) / 5);
  penalty += k * 10;

  return penalty;
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const spec = VERSION_SPECS_M.find((s) => {
    const headerBits = 4 + (s.version <= 9 ? 8 : 16);
    const maxBytes = Math.floor((s.totalDataCodewords * 8 - headerBits) / 8);
    return bytes.length <= maxBytes;
  });

  if (!spec) {
    throw new Error("متن برای ساخت QR کد بیش از حد طولانی است.");
  }

  const data = encodeDataCodewords(bytes, spec);
  const interleaved = interleaveBlocks(data, spec);
  return createMatrix(spec, interleaved);
}

export interface GenerateQrSvgOptions {
  margin?: number;
  foreground?: string;
  background?: string;
}

export function generateQrSvg(
  text: string,
  options: GenerateQrSvgOptions = {}
): string {
  const { margin = 2, foreground = "#101014", background = "#ffffff" } = options;
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const viewSize = n + margin * 2;

  const parts: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        parts.push(`M${c + margin},${r + margin}h1v1h-1z`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="${viewSize}" height="${viewSize}" fill="${background}"/><path d="${parts.join("")}" fill="${foreground}"/></svg>`;
}
