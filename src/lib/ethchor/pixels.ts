/**
 * Pixel art for the portfolio, as bitmaps: one string per row, one character per pixel. The
 * characters name risograph inks (see INKS); a dot is no ink. Pixel.astro turns a bitmap into a
 * crisp SVG at build time.
 */

export const INKS: Record<string, string> = {
  k: 'var(--ink)',
  r: 'var(--red)',
  b: 'var(--blue)',
  y: 'var(--yellow)',
  g: 'var(--green)',
  w: 'var(--paper)',
};

/** A spool of red thread, with the loose end hanging off it: the mark in the bar and the icon. */
export const SPOOL = [
  '.kkkkkkkkk..',
  'kkkkkkkkkkk.',
  '..rrrrrrr...',
  '..rkrrrkr...',
  '..rrrrrrr...',
  '..rrrrrrrr..',
  '..rrrrrrr.r.',
  'kkkkkkkkkk.r',
  '.kkkkkkkk..r',
  '..........r.',
  '.........r..',
  '..........r.',
];

/** A pointer, for the hero's hint. */
export const CURSOR = [
  'k.......',
  'kk......',
  'kwk.....',
  'kwwk....',
  'kwwwk...',
  'kwwwwk..',
  'kwwwwwk.',
  'kwwwkkkk',
  'kwkwk...',
  'kk.kwk..',
  'k...kwk.',
  '.....kk.',
];

/** One icon per capability: a chip, stacked shapes, a bolt and a window. */
export const ICONS: Record<string, string[]> = {
  ai: [
    '..k.k.k.k..',
    '.kkkkkkkkk.',
    'kk.......kk',
    '.k...b...k.',
    'kk..bbb..kk',
    '.k.bbybb.k.',
    'kk..bbb..kk',
    '.k...b...k.',
    'kk.......kk',
    '.kkkkkkkkk.',
    '..k.k.k.k..',
  ],
  architecture: [
    '.....y.....',
    '....yyy....',
    '...yyyyy...',
    '..yyyyyyy..',
    '...rrrrr...',
    '...rrrrr...',
    '...rrrrr...',
    '...rrrrr...',
    '.bbbbbbbbb.',
    '.bbbbbbbbb.',
    '.bbbbbbbbb.',
  ],
  performance: [
    '......kkkk.',
    '.....kyyyk.',
    '....kyyyk..',
    '...kyyyk...',
    '..kyyyyykk.',
    '.kkkkyyyk..',
    '....kyyk...',
    '...kyyk....',
    '..kyyk.....',
    '..kyk......',
    '..kk.......',
  ],
  product: [
    'kkkkkkkkkkk',
    'kwrwywbwwwk',
    'kkkkkkkkkkk',
    'kwwwwwwwwwk',
    'kwbbbbbbwwk',
    'kwwwwwwwwwk',
    'kwrrrwwwwwk',
    'kwwwwwwwwwk',
    'kwyyyyywwwk',
    'kwwwwwwwwwk',
    'kkkkkkkkkkk',
  ],
};

/** A potted plant for the side quest. It grows pixel by pixel, from the soil up. */
export const PLANT = [
  '.......g.......',
  '......ggg......',
  '.....gg.gg.....',
  '...gg..g..gg...',
  '..gggg.g.gggg..',
  '...ggggggggg...',
  '.......g.......',
  '....gg.g.gg....',
  '...gggggggg....',
  '....ggggg......',
  '.......g...gg..',
  '.......g.gggg..',
  '.......gggg....',
  '.......g.......',
  '..rrrrrrrrrrr..',
  '..rrrrrrrrrrr..',
  '...rrrrrrrrr...',
  '...rrwrrrrrr...',
  '...rrrrrrrrr...',
  '....rrrrrrr....',
  '....rrrrrrr....',
];

export interface Run {
  x: number;
  y: number;
  w: number;
  ink: string;
}

/** A bitmap as horizontal runs of one ink, bottom row first (so growth can follow the order). */
export function runs(map: string[]): Run[] {
  const out: Run[] = [];
  for (let y = map.length - 1; y >= 0; y--) {
    const row = map[y];
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === '.' || !INKS[c]) {
        x++;
        continue;
      }
      let e = x + 1;
      while (e < row.length && row[e] === c) e++;
      out.push({ x, y, w: e - x, ink: INKS[c] });
      x = e;
    }
  }
  return out;
}
