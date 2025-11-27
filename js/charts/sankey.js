import { d3, d3Sankey, d3SankeyLinkHorizontal } from '../deps.js';
import { createSVG, dur, showTip, hideTip, globalReveal } from '../core/utils.js';

export function build(sel, props){
  const W=1200, H=620;
  const svg=createSVG(sel,W,H);
  const g = svg.append('g'); // globally faded

  const sk=d3Sankey().nodeId(d=>d.name).nodeWidth(14).nodePadding(18).extent([[20,20],[W-20,H-20]]);
  const graph=sk({nodes:props.nodes.map(d=>({...d})),links:props.links.map(d=>({...d}))});
  const color=d3.scaleOrdinal().domain(props.nodes.map(d=>d.name)).range(d3.schemeTableau10);

  const valLabel = props.valueLabel || '';
  const links = g.append('g').selectAll('path').data(graph.links).join('path')
    .attr('d',d3SankeyLinkHorizontal())
    .attr('fill','none')
    .attr('stroke',d=>d3.color(color(d.target.name)).formatHex())
    .attr('stroke-opacity',.65)
    .attr('stroke-width',d=>Math.max(1,d.width))
    .on('mousemove',(ev,d)=>showTip(ev.pageX,ev.pageY,`${d.source.name} → ${d.target.name}<br/><strong>${d.value}${valLabel}</strong>`))
    .on('mouseleave',hideTip);

  // Prepare path drawing for links
  links.each(function(){
    const L = this.getTotalLength ? this.getTotalLength() : 0;
    d3.select(this)
      .attr('stroke-dasharray', L ? `${L} ${L}` : null)
      .attr('stroke-dashoffset', L || null);
  });

  const nodeG=g.append('g').selectAll('g').data(graph.nodes).join('g');

  const rects = nodeG.append('rect')
    .attr('x',d=>d.x0).attr('y',d=>d.y0)
    .attr('width',d=>d.x1-d.x0)
    .attr('height',d=>Math.max(1,d.y1-d.y0))
    .attr('fill',d=>color(d.name))
    .attr('opacity',0.0); // will fade in after global fade

  const labels = nodeG.append('text')
    .attr('x',d=>d.x0-8).attr('y',d=> (d.y0+d.y1)/2 )
    .attr('text-anchor','end').attr('dominant-baseline','middle')
    .attr('fill','var(--ink)')
    .attr('font-weight',600)
    .style('opacity',0)
    .text(d=>d.name);

  globalReveal({
    container: sel,
    fadeSel: g,
    fadeMs: dur(700),
    ease: d3.easeCubicOut,
    animateFinal(){
      links.transition().duration(dur(1400)).ease(d3.easeCubicOut).attr('stroke-dashoffset',0);
      rects.transition().duration(dur(600)).style('opacity',0.9);
      labels.transition().delay(dur(300)).duration(dur(600)).style('opacity',1);
    }
  });
}
