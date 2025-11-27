// charts/base.js
// Shared helpers to standardize how charts handle sizing and animation options
import { d3 } from '../deps.js';
import { dur as _dur, dly as _dly, globalReveal } from '../core/utils.js';

/**
 * Normalize animation options with sensible defaults and support for string easings.
 * @param {object} props  - Slide/chart props, may contain `anim` key.
 * @param {object} defaults - Defaults for fadeMs, drawMs, delayMs, ease, threshold
 */
export function animOpts(props = {}, defaults = {}){
  const A = props.anim || props.animation || {};
  const easeMap = {
    linear: d3.easeLinear, quad: d3.easeQuadOut, cubic: d3.easeCubicOut,
    cubicIn: d3.easeCubicIn, cubicOut: d3.easeCubicOut, cubicInOut: d3.easeCubicInOut,
    sine: d3.easeSinOut, exp: d3.easeExpOut, back: d3.easeBackOut
  };
  const ease = typeof A.ease === 'function' ? A.ease : easeMap[A.ease] || defaults.ease || d3.easeCubicOut;
  const fadeMs = _dur(A.fadeMs != null ? A.fadeMs : (defaults.fadeMs != null ? defaults.fadeMs : 700));
  const drawMs = _dur(A.drawMs != null ? A.drawMs : (defaults.drawMs != null ? defaults.drawMs : 1200));
  const delayMs = _dly(A.delayMs != null ? A.delayMs : (defaults.delayMs != null ? defaults.delayMs : 0));
  const threshold = A.threshold != null ? A.threshold : (defaults.threshold != null ? defaults.threshold : 0.45);
  return { ease, fadeMs, drawMs, delayMs, threshold };
}

/**
 * A small wrapper around globalReveal that reads animation from `props.anim`.
 * @param {HTMLElement|string} sel
 * @param {d3.Selection} fadeSel
 * @param {object} props - may include `anim` with fadeMs/ease/threshold
 * @param {Function} animateFinal - callback executed after global fade-in
 */
export function revealWithAnim(sel, fadeSel, props, animateFinal){
  const { ease, fadeMs, threshold } = animOpts(props);
  globalReveal({ container: sel, fadeSel, fadeMs, ease, threshold, animateFinal });
}
