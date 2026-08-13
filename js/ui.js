const uiRandomUUID=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
export const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
export const id = prefix => `${prefix}-${uiRandomUUID()}`;
export const dateTime = value => value ? new Date(value).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
export const dateOnly = value => value ? new Date(value+'T12:00:00').toLocaleDateString([], {year:'numeric',month:'short',day:'numeric'}) : '—';
export const statusClass = value => String(value||'unknown').toLowerCase().replace(/\s+/g,'-');
export function statusBadge(value){ const v=String(value||'UNKNOWN').toUpperCase(); return `<span class="status ${statusClass(value)}">${esc(v)}</span>`; }
export function metric(label,value,note=''){ return `<div class="metric"><div class="metric-label">${esc(label)}</div><div class="metric-value">${esc(value)}</div>${note?`<div class="metric-note">${esc(note)}</div>`:''}</div>`; }
export function empty(title,detail=''){ return `<div class="empty"><strong>${esc(title)}</strong>${esc(detail)}</div>`; }
export function toast(message){
  const root=document.getElementById('toastRoot'); if(!root) return;
  const el=document.createElement('div'); el.className='toast'; el.textContent=message; root.appendChild(el);
  setTimeout(()=>el.remove(),3200);
}
export function closeModal(){ const root=document.getElementById('modalRoot'); if(root) root.innerHTML=''; }
export function modal({title,body,submitLabel='Save',onSubmit,dangerLabel,onDanger}){
  const root=document.getElementById('modalRoot');
  root.innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close-modal aria-label="Close">×</button></div><form id="modalForm"><div class="modal-body">${body}</div><div class="modal-foot">${dangerLabel?`<button type="button" class="danger-btn" id="modalDanger">${esc(dangerLabel)}</button>`:''}<button type="button" class="ghost-btn" data-close-modal>Cancel</button>${submitLabel?`<button class="primary-btn" type="submit">${esc(submitLabel)}</button>`:''}</div></form></div></div>`;
  root.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModal));
  root.querySelector('.modal-backdrop').addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop')) closeModal();});
  const form=root.querySelector('#modalForm');
  if(form && onSubmit) form.addEventListener('submit',async e=>{e.preventDefault(); await onSubmit(new FormData(form),form);});
  if(dangerLabel && onDanger) root.querySelector('#modalDanger')?.addEventListener('click',onDanger);
  setTimeout(()=>root.querySelector('input,select,textarea,button')?.focus(),0);
}
export function field(label,name,value='',type='text',opts={}){
  const full=opts.full?' full':''; const req=opts.required?' required':''; const step=opts.step?` step="${esc(opts.step)}"`:''; const min=opts.min!==undefined?` min="${esc(opts.min)}"`:''; const max=opts.max!==undefined?` max="${esc(opts.max)}"`:'';
  if(type==='textarea') return `<div class="field${full}"><label>${esc(label)}</label><textarea name="${esc(name)}"${req}>${esc(value)}</textarea>${opts.help?`<small>${esc(opts.help)}</small>`:''}</div>`;
  if(type==='select') return `<div class="field${full}"><label>${esc(label)}</label><select name="${esc(name)}"${req}>${(opts.options||[]).map(o=>{const ov=typeof o==='string'?o:o.value, ot=typeof o==='string'?o:o.label;return `<option value="${esc(ov)}" ${String(ov)===String(value)?'selected':''}>${esc(ot)}</option>`}).join('')}</select></div>`;
  return `<div class="field${full}"><label>${esc(label)}</label><input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}"${req}${step}${min}${max}>${opts.help?`<small>${esc(opts.help)}</small>`:''}</div>`;
}
export function formGrid(...items){return `<div class="form-grid">${items.join('')}</div>`;}
export function downloadText(filename,text,type='text/plain'){
  const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
