/**
 * A pictogram for each capability, built from Bauhaus primitives on a 120 by 120 grid: a mind with a
 * thought in orbit, a building of blocks, an arrow with speed lines, and an interface. Each part is a
 * .p that knows where it flies in from (--x, --y, --r, --s) and in what order (--i): the range sets
 * the parts loose and puts them together as each capability arrives. Inks are in bauhaus.css.
 */
export const PICTOGRAMS: Record<string, string> = {
  ai: [
    '<circle class="p b-blue" cx="54" cy="64" r="38" style="--i:0;--x:-30px;--y:16px"/>',
    '<circle class="p b-yellow" cx="41" cy="51" r="11" style="--i:1;--s:0"/>',
    '<g class="p p-orbit" style="--i:2;--r:-80deg;--s:.4"><ellipse class="b-line" cx="58" cy="60" rx="54" ry="18" transform="rotate(-26 58 60)"/>',
    '<circle class="b-red" cx="104" cy="38" r="8"/></g>',
  ].join(''),
  architecture: [
    '<rect class="p b-black" x="8" y="100" width="104" height="10" style="--i:0;--y:30px"/>',
    '<rect class="p b-red" x="16" y="54" width="46" height="46" style="--i:1;--x:-40px"/>',
    '<rect class="p b-blue" x="70" y="26" width="32" height="74" style="--i:2;--x:40px"/>',
    '<path class="p p-roof b-yellow" d="M16 54 39 20 62 54Z" style="--i:3;--y:-40px"/>',
  ].join(''),
  performance: [
    '<path class="p p-arrow b-yellow" d="M56 20 112 60 56 100Z" style="--i:0;--x:-50px"/>',
    '<g class="p p-lines" style="--i:1;--x:-40px"><rect class="b-black" x="8" y="34" width="40" height="8"/>',
    '<rect class="b-black" x="18" y="56" width="30" height="8"/><rect class="b-black" x="28" y="78" width="20" height="8"/></g>',
    '<circle class="p b-red" cx="104" cy="60" r="6" style="--i:2;--s:0"/>',
  ].join(''),
  product: [
    '<rect class="p b-frame" x="11" y="15" width="98" height="90" style="--i:0;--s:.6"/>',
    '<rect class="p b-black" x="11" y="15" width="98" height="16" style="--i:1;--y:-24px"/>',
    '<circle class="p b-blue" cx="38" cy="58" r="14" style="--i:2;--x:-24px"/>',
    '<g class="p p-ui" style="--i:3;--x:24px"><rect class="b-red" x="60" y="48" width="38" height="8"/>',
    '<rect class="b-yellow" x="60" y="63" width="26" height="8"/></g>',
    '<rect class="p b-black" x="24" y="84" width="74" height="7" style="--i:4;--y:20px"/>',
  ].join(''),
};
