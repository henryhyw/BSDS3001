// engine.js — uniform slide schema, legacy layout feel preserved
import { d3, depsReady } from '../deps.js';
import { LAYOUTS, dur, dly, applyCSSVars, select } from './utils.js';
import { bg } from './background.js';
import { getChart } from '../charts/registry.js';

function buildLegacyFigures(slide){
  const figs=[];
  if (slide.text){
    figs.push({
      type:'text',
      figSel: slide.text.figSel,
      props: slide.text.props || {}
    });
  }
  if (slide.figure){
    figs.push(slide.figure);
  }
  return figs;
}

function getFigureGroups(slide){
  const hasFigures = Array.isArray(slide.figures) && slide.figures.length;
  const figures = hasFigures ? slide.figures : buildLegacyFigures(slide);
  if (!hasFigures) slide.figures = figures;
  const textFigures = figures.filter(fig => fig?.type === 'text');
  const nonTextFigures = figures.filter(fig => fig && fig.type !== 'text');
  return { figures, textFigures, nonTextFigures };
}

// === Scene markup (uniform for all slides) ===
function sceneShell(slide){
  const sec = document.createElement('section');
  sec.className = 'scene'; sec.id = slide.id;

  // LABEL (graph label / header)
  if (slide.label){
    const gl = document.createElement('div');
    gl.className='graph-label';
    gl.textContent = typeof slide.label === 'string' ? slide.label : (slide.label.text || '');
    sec.appendChild(gl);
  }

  const graphic = document.createElement('div'); graphic.className = 'graphic'; sec.appendChild(graphic);
  const canvas  = document.createElement('div'); canvas.className  = 'canvas';  graphic.appendChild(canvas);

  const { figures } = getFigureGroups(slide);
  figures.forEach((fig)=>{
    if (!fig?.figSel) return;
    const type = fig.type;
    if (type === 'table'){
      const tableWrap = document.createElement('div'); tableWrap.className = 'table-cards';
      tableWrap.id = fig.figSel.replace('#','');
      canvas.appendChild(tableWrap);
      return;
    }
    if (type === 'credits'){
      const creditWrap = document.createElement('div'); creditWrap.className='figure-box';
      creditWrap.id = fig.figSel.replace('#','');
      creditWrap.innerHTML = `<div class="credits-viewport"><!-- dynamic --></div>`;
      canvas.appendChild(creditWrap);
      return;
    }
    if (type === 'text'){
      const tw  = document.createElement('div'); tw.className='text-cards';
      const box = document.createElement('div'); box.className='text-box';
      box.id = fig.figSel.replace('#','');
      tw.appendChild(box);
      canvas.appendChild(tw);
      return;
    }
    const figBox = document.createElement('div'); figBox.className='figure-box';
    figBox.id = fig.figSel.replace('#','');
    canvas.appendChild(figBox);
  });

  // CAPTION (below the scene)
  if (slide.caption){
    const cap = document.createElement('div'); cap.className='caption';
    cap.textContent = slide.caption;
    sec.appendChild(cap);
  }
  return sec;
}

// === Layout (replicates legacy proportions)
function applyLayout(slide){
  const { textFigures, nonTextFigures } = getFigureGroups(slide);
  const textFig = textFigures[0];
  const textSel = textFig?.figSel || null;
  const hAlign = textFig?.props?.halign || 'center';
  const primaryFigure = nonTextFigures[0];

  if (primaryFigure?.type === 'table'){
    LAYOUTS.table(slide.id, {
      figSel: primaryFigure.figSel,
      textSel,
      textFrac: slide.layout?.textFrac,
      gapFrac: slide.layout?.gapFrac,
      hAlign
    });
    return;
  }
  if (primaryFigure?.type === 'credits'){
    LAYOUTS.credits(slide.id);
    return;
  }

  if (primaryFigure && !textFigures.length){
    LAYOUTS.figureOnly(slide.id, { figSel: primaryFigure.figSel });
    return;
  }

  if (primaryFigure){
    LAYOUTS.panel(slide.id, {
      figSel: primaryFigure.figSel,
      textSel,
      textFrac: slide.layout?.textFrac,
      gapFrac: slide.layout?.gapFrac,
      figFrac: slide.layout?.figFrac,
      hAlign
    });
    return;
  }

  // Text-only slides: let text.js arrange itself (unchanged)
}

// === Build one slide (text first, then figure)
function buildSlide(slide){
  // theme overrides
  if (slide.theme){
    Object.entries(slide.theme).forEach(([k,v])=>{
      document.querySelector('#'+slide.id).style.setProperty(k, v);
    });
  }

  // background group
  if (slide.group) bg.show(slide.group); else bg.show(null);

  // grid overlay toggle (optional)
  if ('overlayGrid' in slide) {
    document.documentElement.style.setProperty('--grid-alpha', slide.overlayGrid ? '.06' : '0');
  }

  const { figures, textFigures, nonTextFigures } = getFigureGroups(slide);

  // Build text figures first
  const textBuilder = getChart('text');
  textFigures.forEach(fig=>{
    if (textBuilder){
      textBuilder(fig.figSel, fig.props || {});
      select(fig.figSel)?.classList.add('show');
    }
  });

  // Build remaining figures
  nonTextFigures.forEach(fig=>{
    if (!fig) return;
    if (fig.props?.graphOpacity != null){
      const el = document.querySelector(fig.figSel);
      if (el) el.style.opacity = fig.props.graphOpacity;
    }
    const figBuilder = getChart(fig.type);
    if (figBuilder){
      figBuilder(fig.figSel, fig.props || {});
    }
  });

  // If there is no text figure on this slide, we still want label/caption to fade in.
  if (!textFigures.length){
    const sec = document.getElementById(slide.id);
    if (sec) sec.classList.add('fx-on');
  }
}

// === Bootstrap
export async function bootstrap(deck){
  if(deck.themeVars) applyCSSVars(deck.themeVars);
  bg.registerGroups(deck.mediaGroups || []);

  const root = document.getElementById('deck-root');
  deck.slides.forEach(slide => root.appendChild(sceneShell(slide)));

  // dotnav
  const dotnav = document.getElementById('dotnav');
  const navSlides = deck.slides.filter(s=> s.dotnav !== false);
  if (dotnav){
    dotnav.innerHTML = '';
    dotnav.style.display = navSlides.length ? 'flex' : 'none';
    dotnav.style.flexDirection = 'column';
    dotnav.style.gap = '6px';
    dotnav.style.maxHeight = '90vh';
    dotnav.style.overflowY = 'auto';

    navSlides.forEach((s,i)=>{
      const b=document.createElement('button'); b.title = s.nav || s.id || `Slide ${i+1}`;
      b.addEventListener('click',()=> document.getElementById(s.id).scrollIntoView({behavior:'smooth'}));
      dotnav.appendChild(b);
    });
  }

  // layout on load + resize
  const relayout = ()=> deck.slides.forEach(applyLayout);
  window.addEventListener('resize', relayout);
  relayout();

  // build-on-view
  const SceneState = new Map(deck.slides.map(s=>[s.id,{built:false}]));
  const observer=new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return;
      const id = entry.target.id;
      const slide = deck.slides.find(s=>s.id===id);
      if(!slide) return;

      const st = SceneState.get(id);
      if(!st.built){
        buildSlide(slide);
        st.built=true;

        const { textFigures } = getFigureGroups(slide);
        textFigures.forEach(fig=> select(fig.figSel)?.classList.add('show'));
      }

      const buttons=[...dotnav.children], idx=navSlides.findIndex(s=>s.id===id);
      if (idx >= 0) buttons.forEach((b,i)=> b.classList.toggle('active', i===idx));
    });
  },{threshold:0.85});

  deck.slides.forEach(s=> observer.observe(document.getElementById(s.id)));
}
