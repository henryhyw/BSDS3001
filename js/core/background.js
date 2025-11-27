import { applyCSSVars } from './utils.js';
class BackgroundManager{
  constructor(rootSel='#bg-stack'){
    this.root = document.querySelector(rootSel);
    this.layers = new Map();
    this.activeGroup = null;
  }
  registerGroups(groups){
    groups.forEach(g => this.ensureLayer(g));
  }
  ensureLayer(group){
    if(this.layers.has(group.id)) return this.layers.get(group.id);
    const wrap = document.createElement('div');
    wrap.className = 'bg-layer'; wrap.dataset.group = group.id;
    let mediaEl;
    if(group.media?.type === 'image'){
      mediaEl = document.createElement('img'); mediaEl.src = group.media.src; mediaEl.alt = group.id;
    }else{
      mediaEl = document.createElement('video');
      mediaEl.src = group.media?.src || '';
      mediaEl.muted = ('muted' in group.media) ? !!group.media.muted : true;
      mediaEl.loop = ('loop' in group.media) ? !!group.media.loop : true;
      mediaEl.autoplay = ('autoplay' in group.media) ? !!group.media.autoplay : true;
      mediaEl.playsInline = true; mediaEl.preload = 'auto';
    }
    mediaEl.style.opacity = (group.media?.opacity ?? 1);
    wrap.appendChild(mediaEl);
    const overlay = document.createElement('div');
    overlay.className = 'bg-overlay';
    overlay.style.setProperty('--overlay-alpha', (group.overlay?.opacity ?? 0.35));
    wrap.appendChild(overlay);
    this.root.appendChild(wrap);
    const layer = { el: wrap, overlay, mediaEl, config: group };
    this.layers.set(group.id, layer);
    return layer;
  }
  async show(groupId){
    if(!groupId){
      this.layers.forEach(l => l.el.classList.remove('active'));
      this.activeGroup = null; return;
    }
    const layer = this.layers.get(groupId); if(!layer) return;
    if(this.activeGroup !== groupId) {
      this.layers.forEach(l => l.el.classList.toggle('active', l===layer));
      this.activeGroup = groupId;
    }
    layer.overlay.style.setProperty('--overlay-alpha', (layer.config.overlay?.opacity ?? 0.35));
    layer.mediaEl.style.opacity = (layer.config.media?.opacity ?? 1);
    if(layer.mediaEl?.play) layer.mediaEl.play().catch(()=>{});
  }
  setOverlay(groupId, opacity){
    const l = this.layers.get(groupId); if(!l) return;
    l.overlay.style.setProperty('--overlay-alpha', opacity);
  }
  setTheme(vars){ applyCSSVars(vars); }
}
export const bg = new BackgroundManager();
