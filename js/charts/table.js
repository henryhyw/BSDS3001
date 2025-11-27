import { d3 } from '../deps.js';
import { dur, globalReveal } from '../core/utils.js';

export function build(sel, props){
  const wrap = document.querySelector(sel);
  wrap.innerHTML = '';
  wrap.style.overflowY = 'auto';
  wrap.style.maxHeight = wrap.style.maxHeight || '100%';
  wrap.tabIndex = 0; // allow keyboard scrolling if needed

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  table.appendChild(thead); table.appendChild(tbody);
  wrap.appendChild(table);

  const trh = document.createElement('tr');
  props.columns.forEach(c=>{
    const th = document.createElement('th');
    th.textContent = c.title;
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  const rowsEls = [];
  props.rows.forEach((row)=>{
    const tr = document.createElement('tr');
    props.columns.forEach(c=>{
      const td = document.createElement('td');
      td.textContent = (row[c.key] ?? '');
      tr.appendChild(td);
    });
    tr.style.opacity=0; tr.style.transform='translateY(6px)';
    tbody.appendChild(tr);
    rowsEls.push(tr);
  });

  // Size the wrapper so full tables show when possible; otherwise enable scroll
  requestAnimationFrame(()=>{
    const avail = Math.max(200, window.innerHeight - 140); // leave space for label/caption
    const needed = table.scrollHeight + 12;
    wrap.style.maxHeight = `${avail}px`;
    wrap.style.height = `${Math.min(needed, avail)}px`;
    wrap.style.overflowY = needed > avail ? 'auto' : 'visible';
    console.debug('[TABLE SIZE]', { avail, needed, height: wrap.style.height });
  });

  // Fade in the whole table, then stagger rows
  globalReveal({
    container: sel,
    fadeSel: d3.select(wrap),
    fadeMs: dur(400),
    ease: d3.easeCubicOut,
    animateFinal(){
      rowsEls.forEach((tr, i)=>{
        setTimeout(()=>{
          tr.style.transition='opacity .8s ease, transform .8s ease';
          tr.style.opacity=1;
          tr.style.transform='none';
        }, (props.staggerMs||180)*i);
      });
    }
  });
}
