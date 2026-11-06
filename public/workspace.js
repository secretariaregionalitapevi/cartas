'use strict';
(() => {
 const form=document.querySelector('#letter-form');
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const titles=['Município e exame','Identificação','Ministério responsável','Conferência'];
 const sections=[...form.querySelectorAll('.sheet')];
 sections.forEach((section,i)=>section.id=`letter-step-${i+1}`);
 function refresh(){
  const value=id=>document.querySelector(id)?.value||'';
  const selected=id=>document.querySelector(id)?.selectedOptions[0]?.textContent||'';
  document.querySelector('#workspace-title').textContent=value('#type')==='organista'?'Carta de organista':'Carta de músico';
  document.querySelector('#workspace-context').innerHTML=[['Município',value('#city')],['Exame',value('#event')?selected('#event'):'Selecione o exame'],['Comum congregação',value('#common')]].map(([label,text])=>`<div><small>${escape(label)}</small><strong>${escape(text||'Selecione')}</strong></div>`).join('');
  const person=form.elements.pessoa_id.value;
  const preview=document.querySelector('#candidate-preview');
  preview.classList.toggle('is-selected',!!person);
  preview.innerHTML=person?`<strong>${escape(form.elements.nome.value)}${window.CartasProgramBadge?.()||''}</strong><small>Candidato selecionado no cadastro</small>`:'Selecione o candidato no cadastro.';
  const states=sections.map((section,i)=>{
   const required=[...section.querySelectorAll('[required]')].filter(field=>!field.disabled&&!field.closest('[hidden]'));
   return (i!==0||!!value('#event'))&&required.length>0&&required.every(field=>field.validity.valid)&&(i!==1||!!person)&&(i!==2||section.querySelectorAll('select').length===4);
  });
  const count=states.filter(Boolean).length;
  document.querySelector('#completion-label').textContent=`${count} de 4 etapas`;
  document.querySelector('#completion-progress').value=count;
  document.querySelector('#completion-steps').innerHTML=titles.map((title,i)=>`<a href="#letter-step-${i+1}" class="${states[i]?'complete':''}"><span aria-label="${states[i]?'Concluída':'Pendente'}">${states[i]?'✓':i+1}</span>${title}</a>`).join('');
 }
 window.CartasWorkspace={refresh};
 form.addEventListener('input',()=>queueMicrotask(refresh));
 form.addEventListener('change',refresh);
 form.addEventListener('click',()=>queueMicrotask(refresh));
 new MutationObserver(refresh).observe(document.querySelector('#ministry-fields'),{childList:true});
 refresh();
})();
(() => {
 const input=document.querySelector('#entry-common-search');
 const list=document.querySelector('#entry-common-results');
 input.setAttribute('aria-controls',list.id);
 input.setAttribute('aria-expanded','false');
 new MutationObserver(()=>input.setAttribute('aria-expanded',String(list.classList.contains('active')))).observe(list,{attributes:true,attributeFilter:['class']});
 input.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'&&list.classList.contains('active')){e.preventDefault();list.querySelector('button')?.focus();}
  if(e.key==='Escape')list.classList.remove('active');
 });
 list.addEventListener('keydown',e=>{
  const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}
  if(e.key==='Escape'){e.preventDefault();input.focus();list.classList.remove('active');}
 });
 list.addEventListener('click',e=>{if(e.target.closest('button')){input.focus();list.classList.remove('active');}});
})();

(() => {
 const phone=document.querySelector('#letter-form [name="whatsapp"]');
 if(!phone)return;
 phone.inputMode='tel';
 phone.placeholder='(11) 99999-9999';
 phone.maxLength=15;
 function formatPhone(value){
  const digits=value.replace(/\D/g,'').slice(0,11);
  if(!digits)return '';
  if(digits.length<3)return '('+digits;
  const local=digits.slice(2),split=local.length>8?5:4;
  return '('+digits.slice(0,2)+') '+local.slice(0,split)+(local.length>split?'-'+local.slice(split):'');
 }
 phone.addEventListener('input',()=>{
  const before=phone.value,position=phone.selectionStart??before.length;
  const count=before.slice(0,position).replace(/\D/g,'').length;
  const atEnd=position===before.length;
  phone.value=formatPhone(before);
  let cursor=phone.value.length;
  if(!atEnd){let seen=0;cursor=0;while(cursor<phone.value.length&&seen<count){if(/\d/.test(phone.value[cursor]))seen++;cursor++;}}
  phone.setSelectionRange(cursor,cursor);
 });
 phone.value=formatPhone(phone.value);
})();