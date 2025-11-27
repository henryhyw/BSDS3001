export * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
export { sankey as d3Sankey, sankeyLinkHorizontal as d3SankeyLinkHorizontal } from "https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3/+esm";
let topojsonReady;
export const topojson = {};
if(!('topojson' in window)){
  const s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js';
  topojsonReady = new Promise(res => { s.onload=()=>res(window.topojson); });
  document.head.appendChild(s);
}else{
  topojsonReady = Promise.resolve(window.topojson);
}
export const depsReady = topojsonReady.then(t => Object.assign(topojson, t));
