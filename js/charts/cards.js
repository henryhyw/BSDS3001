// js/charts/cards.js — simple multi-card layout with optional custom items
export function build(sel, props = {}){
  const cards=document.querySelector(sel);
  const items = props.items && props.items.length
    ? props.items
    : [
        { title:'Gains', icon:'fa-chart-line', bullets:['Capex & construction jobs','Long-term tax base','Digital spillovers'] },
        { title:'Costs', icon:'fa-triangle-exclamation', bullets:['Upgrade delays & queues','Water in arid metros','Peaker reliance & local air'] },
        { title:'Fix the bottleneck', icon:'fa-plug-circle-bolt', bullets:['“Speed-to-Power” fast-tracks','On-site hybrids (storage + firm)','Tax policy tied to EJ & water'] }
      ];

  cards.innerHTML = `
    <div class="verdict-grid" id="verdict-grid">
      ${items.map((item,i)=>`
        <div class="verdict-card" id="card-${i}">
          <h4><span class="icon-chip"><i class="fa-solid ${item.icon || 'fa-bolt'}"></i></span> ${item.title}</h4>
          <ul>${(item.bullets||[]).map(b=>`<li>${b}</li>`).join('')}</ul>
        </div>
      `).join('')}
    </div>`;

  // Reveal animation
  requestAnimationFrame(()=>{
    const cardsEls = cards.querySelectorAll('.verdict-card');
    cardsEls.forEach((el,i)=>{
      setTimeout(()=> el.classList.add('show'), 120 + i*120);
    });
  });
}
