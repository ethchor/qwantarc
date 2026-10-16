/**
 * The Bauhaus shape for each kind of diagram node, centred at (15, 15) in a 30 by 30 box: a yellow
 * triangle for an app, a blue circle for a service, a red square for data and a black half-disc for
 * a system outside the build (inks in ethchor.css). The diagrams and their legend both draw these.
 */
import type { NodeKind } from './profile';

export const GLYPHS: Record<NodeKind, string> = {
  app: '<path class="g-app" d="M15 8.5 21.5 20.5h-13Z"/>',
  service: '<circle class="g-service" cx="15" cy="15" r="6.2"/>',
  data: '<rect class="g-data" x="9.5" y="9.5" width="11" height="11"/>',
  outside: '<path class="g-outside" d="M8.5 19a6.5 6.5 0 0 1 13 0Z"/>',
};

/** The legend, in reading order. */
export const KINDS: { kind: NodeKind; label: string }[] = [
  { kind: 'app', label: 'App' },
  { kind: 'service', label: 'Service' },
  { kind: 'data', label: 'Data' },
  { kind: 'outside', label: 'Outside system' },
];
