import { d3 } from '../deps.js';
import { createSVG, dur, globalReveal } from '../core/utils.js';

export function build(sel, props){
  const W=1000, H=680, R=Math.min(W,H)/2 - 60;
  const R0 = Math.max(20, R - 26); // initial smaller radius

  const svg = createSVG(sel, W, H);
  const g = svg.append('g').attr('transform',`translate(${W/2},${H/2})`);  // faded in globally

  const chords = d3.chord().padAngle(0.04).sortSubgroups(d3.descending)(props.matrix);
  const color = d3.scaleOrdinal()
    .domain(props.names)
    .range(d3.schemeTableau10.concat(d3.schemeSet2).slice(0, props.names.length));

  // Groups (initial small arc)
  const arc0 = d3.arc().innerRadius(R0).outerRadius(R0+12);
  const arc1 = d3.arc().innerRadius(R).outerRadius(R+18);

  const group = g.append('g').selectAll('g')
    .data(chords.groups)
    .join('g');

  const groupArcs = group.append('path')
    .attr('d', arc0)
    .attr('fill', d => color(props.names[d.index]))
    .attr('opacity', .95);

  group.append('text')
    .each(d=>{ d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr('dy','0.35em')
    .attr('transform', d => `rotate(${d.angle*180/Math.PI-90}) translate(${R+24}) ${d.angle>Math.PI ? 'rotate(180)' : ''}`)
    .attr('text-anchor', d => d.angle>Math.PI ? 'end' : null)
    .attr('fill','var(--ink)')
    .attr('font-size','var(--fs-chordLabel, 12px)')
    .attr('font-weight',600)
    .text(d => props.names[d.index]);

  // Ribbons (initial small)
  const rib0 = d3.ribbon().radius(R0);
  const rib1 = d3.ribbon().radius(R);

  const ribbons = g.append('g').attr('fill-opacity',0.9).selectAll('path')
    .data(chords)
    .join('path')
    .attr('d', rib0)
    .attr('fill', d => color(props.names[d.source.index]))
    .attr('stroke','none');

  // Global fade, then animate arcs/ribbons to full radius
  globalReveal({
    container: sel,
    fadeSel: g,
    ease: d3.easeCubicOut,
    fadeMs: dur(700),
    animateFinal(){
      groupArcs.transition().duration(dur(900)).ease(d3.easeCubicOut)
        .attrTween('d', function(d){
          const iIn = d3.interpolate(R0, R);
          const iOut = d3.interpolate(R0+12, R+18);
          const arc = d3.arc();
          return t => arc.innerRadius(iIn(t)).outerRadius(iOut(t))(d);
        });

      ribbons.transition().duration(dur(900)).ease(d3.easeCubicOut)
        .attrTween('d', function(d){
          const ir = d3.interpolate(R0, R);
          const ribbon = d3.ribbon();
          return t => ribbon.radius(ir(t))(d);
        });
    }
  });
}
