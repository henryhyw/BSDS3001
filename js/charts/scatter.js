import { d3 } from '../deps.js';
import { createSVG, dur, dly, globalReveal, showTip, hideTip } from '../core/utils.js';

export function build(sel, props){
  const W=1200,H=700,M={t:30,r:30,b:74,l:84};
  const svg=createSVG(sel,W,H);
  const g=svg.append('g').attr('transform',`translate(${M.l},${M.t})`); // globally faded

  const innerW=W-M.l-M.r, innerH=H-M.t-M.b;
  const pts = props.points;

  const distFmt = props.distFmt || (v => Math.round(v));
  const capFmt  = props.capFmt  || (v => (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)));

  const x=d3.scaleLinear().domain(props.xDomain || d3.extent(pts,d=>d.dist)).nice().range([0,innerW]);
  const y=d3.scaleLinear().domain(props.yDomain || [0,d3.max(pts,d=>d.cap)]).nice().range([innerH,0]);

  g.append('g').attr('transform',`translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(8).tickSize(-innerH))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'))
    .call(g=>g.selectAll('line,path').attr('stroke','var(--gridline)'));

  g.append('g')
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW))
    .call(g=>g.selectAll('text').attr('fill','var(--muted)'))
    .call(g=>g.selectAll('line,path').attr('stroke','var(--gridline)'));

  g.append('text').attr('class','axis-title').attr('x',innerW/2).attr('y',innerH+56).attr('text-anchor','middle').text(props.xLabel||'Distance');
  g.append('text').attr('class','axis-title').attr('transform',`translate(${-58},${innerH/2}) rotate(-90)`).attr('text-anchor','middle').text(props.yLabel||'Capacity');

  const dots=g.append('g').selectAll('circle').data(pts).join('circle')
    .attr('cx',d=>x(d.dist)).attr('cy',innerH).attr('r',3.2).attr('fill','rgba(123,223,242,.9)');

  const xbar=d3.mean(pts,d=>d.dist), ybar=d3.mean(pts,d=>d.cap);
  const slope=d3.sum(pts,d=>(d.dist-xbar)*(d.cap-ybar))/d3.sum(pts,d=>(d.dist-xbar)**2);
  const intercept=ybar - slope*xbar;

  // Regression line clamped to axes
  const regLine=d3.line().x(d=>x(d.x)).y(d=>y(d.y));
  const xDom = x.domain();
  const yDom = y.domain();
  const xExtent = props.regRange || d3.extent(pts, d=>d.dist);
  const regPts = xExtent.map(xv => {
    const yv = intercept + slope * xv;
    return {
      x: xv,
      y: Math.min(Math.max(yv, yDom[0]), yDom[1])
    };
  });
  const regPath=g.append('path').datum(regPts)
    .attr('d',regLine)
    .attr('stroke','var(--danger)')
    .attr('stroke-width',2.2)
    .attr('fill','none');

  const L=regPath.node().getTotalLength();
  regPath.attr('stroke-dasharray',`${L} ${L}`).attr('stroke-dashoffset',L);

  globalReveal({
    container: sel,
    fadeSel: g,
    fadeMs: dur(700),
    ease: d3.easeCubicOut,
    animateFinal(){
      dots.transition().delay((_,i)=>dly(i*6)).duration(dur(700)).attr('cy',d=>y(d.cap));
      regPath.transition().duration(dur(2200)).ease(d3.easeCubicOut).attr('stroke-dashoffset',0);
    }
  });

  // Tooltip on hover
  svg.on('mousemove',(ev)=>{
    const [mx,my]=d3.pointer(ev);
    const nearest = d3.least(pts, d => Math.hypot(x(d.dist) - mx + M.l, y(d.cap) - my + M.t));
    if (!nearest) return hideTip();
    const px = x(nearest.dist) + M.l, py = y(nearest.cap) + M.t;
    if (Math.hypot(px - mx, py - my) < 24){
      const html = typeof props.tooltipFmt === 'function'
        ? props.tooltipFmt(nearest)
        : nearest.name
          ? `<strong>${nearest.name}</strong><br/>${distFmt(nearest.dist)} · ${capFmt(nearest.cap)}`
          : `${distFmt(nearest.dist)}, ${capFmt(nearest.cap)}`;
      showTip(ev.pageX, ev.pageY, html);
    } else { hideTip(); }
  }).on('mouseleave', hideTip);
}
