// video.js — lightweight video figure with framing
import { globalReveal, dur } from '../core/utils.js';

export function build(sel, props = {}){
  const wrap = document.querySelector(sel);
  if (!wrap) return;
  wrap.innerHTML = '';

  const frame = document.createElement('div');
  frame.className = 'video-frame';

  const video = document.createElement('video');
  video.src = props.src || '';
  if (props.poster) video.poster = props.poster;
  video.playsInline = true;
  video.muted = props.muted ?? true;
  video.loop = props.loop ?? true;
  video.autoplay = props.autoplay ?? true;
  video.controls = props.controls ?? false;
  video.style.width = '100%';
  video.style.height = '100%';
  video.style.objectFit = 'contain';
  video.style.background = 'transparent';

  frame.appendChild(video);
  wrap.appendChild(frame);

  // Fade in the frame
  globalReveal({
    container: sel,
    fadeSel: frame, // frame is a DOM node
    fadeMs: dur(600)
  });
}
