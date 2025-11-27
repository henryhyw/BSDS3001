import { d3, topojson, d3Sankey, d3SankeyLinkHorizontal } from '../deps.js';
import { createSVG, dur, dly, clamp, select, showTip, hideTip } from '../core/utils.js';

/**
 * Allow natural inner scrolling, and only stop propagation when
 * the inner viewport can scroll further. At top/bottom, bubble to page.
 */
function chainScroll(vp){
  const onWheel = (e) => {
    const max = vp.scrollHeight - vp.clientHeight;
    const atTop = vp.scrollTop <= 0;
    const atBottom = vp.scrollTop >= max - 1; // tolerate rounding
    const goingDown = e.deltaY > 0;
    const goingUp = e.deltaY < 0;

    if ((goingUp && !atTop) || (goingDown && !atBottom)) {
      // inner can scroll; keep event inside without blocking native scroll
      e.stopPropagation();
    }
    // at boundary -> let it bubble so the page scrolls
  };
  vp.addEventListener('wheel', onWheel, { passive: true });

  // Touch support
  let startY = null;
  vp.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  vp.addEventListener('touchmove', (e) => {
    if (startY == null) return;
    const dy = startY - e.touches[0].clientY;
    const max = vp.scrollHeight - vp.clientHeight;
    const atTop = vp.scrollTop <= 0;
    const atBottom = vp.scrollTop >= max - 1;
    const goingDown = dy > 0, goingUp = dy < 0;

    if ((goingUp && !atTop) || (goingDown && !atBottom)) {
      e.stopPropagation(); // keep the gesture inside; no preventDefault
    }
    // else: bubble to page
  }, { passive: true });
}

export function build(sel, props){
  const wrap = document.querySelector(sel);
  if(!wrap) return;

  // Ensure the viewport element exists (created in engine scene shell)
  const viewport = wrap.querySelector('.credits-viewport');
  if(!viewport) return;

  // Build roll container
  viewport.innerHTML = '<div class="credits-roll" id="credits-roll"></div>';
  const roll = viewport.querySelector('#credits-roll');

  // Populate items
  const items = props.items || [];
  items.forEach(txt => {
    const p = document.createElement('div');
    p.className = 'credit';
    p.textContent = txt;
    roll.appendChild(p);
  });

  // Remove all chrome on the credits viewport (border/shadow/lines)
  viewport.style.border = '0';
  viewport.style.boxShadow = 'none';

  // Animate the roll, then convert to native scroll coordinates
  requestAnimationFrame(() => {
    const viewH = viewport.clientHeight;
    const rollH = roll.scrollHeight;

    const yStart = viewH;                 // start fully below the viewport
    const yEnd   = Math.min(0, viewH - rollH); // stop when last line touches bottom (<= 0 if taller)
    const travel = yStart - yEnd;
    const pxPerSec = 60;
    const totalMs = (travel / pxPerSec) * 1000;

    roll.style.transform = `translateY(${yStart}px)`;
    d3.select(roll).interrupt(); // ensure no duplicate transitions
    d3.select(roll)
      .transition()
      .duration(totalMs)
      .ease(d3.easeLinear)
      .styleTween('transform', () => t =>
        `translateY(${yStart + (yEnd - yStart) * t}px)`
      )
      .on('end', () => {
        const needsScroll = rollH > viewH;
        // Remove transform and use native scrolling so the user can reach the true top
        roll.style.transform = 'none';

        if (needsScroll) {
          // Enable native scrolling and land at the same visual position (bottom)
          viewport.style.overflowY = 'auto';
          viewport.style.webkitOverflowScrolling = 'touch';
          viewport.scrollTop = rollH - viewH;

          // Make inner scroll chain to page at edges
          chainScroll(viewport);
        } else {
          // Content fits; keep it static
          viewport.style.overflow = 'hidden';
        }
      });
  });
}