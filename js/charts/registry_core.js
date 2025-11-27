// charts/registry_core.js — tiny registry
const _registry = new Map();
export function register(type, builder){
  _registry.set(type, builder);
}
export function getChart(type){
  return _registry.get(type);
}
