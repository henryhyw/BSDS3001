// logos.js — simple horizontal logo strip
import { d3 } from '../deps.js';
import { dur } from '../core/utils.js';
import { revealWithAnim } from './base.js';

export function build(sel, props){
  const box = document.querySelector(sel);
  if (!box) return;

  const images = props.images || [];
  const gap = props.gap != null ? props.gap : 8;
  const height = props.height != null ? props.height : 96;
  const justify = props.justify || 'center';
  const flexBasis = props.flexBasis != null ? props.flexBasis : 90;
  const maxWidth = props.maxWidth != null ? props.maxWidth : 140;

  const wrapper = document.createElement('div');
  wrapper.className = 'logos-strip';
  Object.assign(wrapper.style, {
    display:'flex',
    justifyContent:justify,
    alignItems:'center',
    flexWrap:'wrap',
    gap:`${gap}px`,
    width:'100%'
  });

  images.forEach(img=>{
    const el = document.createElement('img');
    el.src = img.src;
    el.alt = img.alt || '';
    el.style.height = (img.height || height) + 'px';
    el.style.objectFit = 'contain';
    el.style.flex = `1 1 ${flexBasis}px`;
    el.style.maxWidth = `${maxWidth}px`;
    wrapper.appendChild(el);
  });

  box.innerHTML = '';
  box.appendChild(wrapper);

  revealWithAnim(sel, d3.select(box), props, ()=> box.classList.add('revealed'));
}
