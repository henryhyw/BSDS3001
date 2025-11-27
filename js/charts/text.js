// text.js
import { d3 } from '../deps.js';
import { dur, globalReveal } from '../core/utils.js';

const SIZE_FALLBACKS = {
  kicker: {
    xs: 'clamp(0.8rem,1.1vw,0.95rem)',
    sm: 'clamp(0.9rem,1.2vw,1.05rem)',
    md: 'clamp(1.0rem,1.3vw,1.1rem)',
    lg: 'clamp(1.05rem,1.4vw,1.15rem)'
  },
  title: {
    xs: 'clamp(1.8rem,3vw,3rem)',
    sm: 'clamp(2.2rem,3.8vw,3.6rem)',
    md: 'clamp(2.8rem,6vw,6rem)',
    lg: 'clamp(3.4rem,7vw,7rem)'
  },
  subtitle: {
    xs: 'clamp(0.9rem,1.3vw,1.1rem)',
    sm: 'clamp(1.0rem,1.6vw,1.25rem)',
    md: 'clamp(1.15rem,1.9vw,1.4rem)',
    lg: 'clamp(1.3rem,2.2vw,1.6rem)'
  },
  body: {
    xs: 'clamp(0.95rem,1.2vw,1.05rem)',
    sm: 'clamp(1.0rem,1.4vw,1.15rem)',
    md: 'clamp(1.08rem,1.6vw,1.25rem)',
    lg: 'clamp(1.2rem,1.9vw,1.35rem)'
  }
};

function cssVarOrFallback(role, token) {
  const varName = `--fs-${role}-${token}`;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  if (v) return `var(${varName})`;
  return SIZE_FALLBACKS[role]?.[token] || SIZE_FALLBACKS[role]?.md;
}

function resolveSize(role, v) {
  if (!v) return cssVarOrFallback(role, 'md');
  const s = String(v);
  if (/\b(px|rem|em|vw|vh)\b|\bclamp\(/.test(s)) return s;
  return cssVarOrFallback(role, s);
}

function enrich(txt) {
  if (!txt) return '';
  let s = String(txt);
  s = s
    .replace(/\*\*(.+?)\*\*/g, '<span class="fx fx-bold">$1</span>')
    .replace(/__(.+?)__/g, '<span class="fx fx-underline">$1</span>')
    .replace(/==(.+?)==/g, '<span class="fx fx-highlight">$1</span>')
    .replace(/\[rise\](.+?)\[\/rise\]/g, '<span class="fx fx-rise">$1</span>')
    .replace(/\[glow\](.+?)\[\/glow\]/g, '<span class="fx fx-glow">$1</span>')
    .replace(
      /\[c:([#a-zA-Z0-9(),\-\s]+)\](.+?)\[\/c\]/g,
      (_m, col, inner) =>
        `<span class="fx fx-color" data-color="${col.trim()}">${inner}</span>`
    );
  return s;
}

export function build(sel, props) {
  const box = document.querySelector(sel);
  if (!box) return;

  const scene = box.closest('.scene');

  // alignment inside the text box
  box.style.textAlign = props.align || 'center';

  const titleSize  = resolveSize('title', props.sizes?.title || 'md');
  const subSize    = resolveSize('subtitle', props.sizes?.subtitle || 'md');
  const bodySize   = resolveSize('body', props.sizes?.body || 'md');
  const kickerSize = resolveSize('kicker', props.sizes?.kicker || 'xs');

  const titleRaw = props.titleHTML ?? (props.title || '');
  const subRaw   = props.subtitleHTML ?? (props.subtitle || '');
  const bodyRaw  = props.bodyHTML || '';

  const kickerHTML = props.kicker
    ? `<div class="text-kicker" style="font-size:${kickerSize}">${enrich(props.kicker)}</div>`
    : '';

  const titleHTML = titleRaw
    ? `<h1 class="text-title" style="font-size:${titleSize}">${enrich(titleRaw)}</h1>`
    : '';

  const subHTML = subRaw
    ? `<p class="text-sub" style="font-size:${subSize}">${enrich(subRaw)}</p>`
    : '';

  const bodyHTML = bodyRaw
    ? `<div class="text-body" style="font-size:${bodySize}">${enrich(bodyRaw)}</div>`
    : '';

  box.innerHTML = `${kickerHTML}${titleHTML}${subHTML}${bodyHTML}`;

  // Reveal: flip scene chrome ON at the same time (so label/caption animate with text)
  globalReveal({
    container: sel,
    fadeSel: d3.select(box),
    fadeMs: dur(450),
    ease: d3.easeCubicOut,
    animateFinal() {
      if (scene) scene.classList.add('fx-on');
      box.classList.add('revealed');
      box.classList.add('fx-on');

      // smooth color transitions
      box.querySelectorAll('.fx-color[data-color]').forEach(el => {
        el.style.transition = 'color 600ms cubic-bezier(.2,.7,.2,1)';
        requestAnimationFrame(() => {
          el.style.color = el.getAttribute('data-color');
        });
      });

      const rising = Array.from(
        box.querySelectorAll(
          '.fx-rise, .fx-highlight, .fx-underline, .fx-bold, .fx-glow'
        )
      );
      rising.forEach((el, i) => {
        el.style.transitionDelay = 80 * i + 'ms';
      });
    }
  });
}
