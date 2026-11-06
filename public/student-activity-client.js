(() => {
  const form=document.querySelector('#letter-form');
  const warning=document.createElement('div');warning.className='student-activity-warning';warning.hidden=true;warning.setAttribute('role','status');
  document.querySelector('#person-hint').insertAdjacentElement('afterend',warning);
  let version=0,key='',result=null,inflight=null;
  function currentKey(){return [form.elements.pessoa_id.value,form.elements.tipo.value,form.elements.comum.value].join('|');}
  function message(a){
    if(!a?.pending)return '';
    const last=a.last_activity_at?String(a.last_activity_at).slice(0,10).split('-').reverse().join('/'):'Não informado';
    return `<strong>Aluno ${esc(a.status)} no GEM/SAM · Carta pendente de análise</strong><p>Último lançamento: ${esc(last)}${a.inactive_days!=null?' · '+esc(a.inactive_days)+' dias sem atividade':''}.</p><p>A carta será gerada. A pendência ficará registrada no sistema para ciência do ancião da música, do encarregado regional que atende e do secretário da regional.</p>`;
  }
  async function refresh(){
    const id=form.elements.pessoa_id.value,type=form.elements.tipo.value,common=form.elements.comum.value,next=currentKey();
    if(!id||type!=='musico'){version++;key='';result=null;warning.hidden=true;warning.innerHTML='';return null;}
    if(next===key)return inflight||result;
    key=next;result=null;const call=++version;warning.hidden=true;
    inflight=(async()=>{
      try{const data=await api('/api/student-activity?'+new URLSearchParams({pessoa_id:id,tipo:type,comum:common}));
        if(call!==version||next!==currentKey())return null;
        result=data.activity;warning.innerHTML=message(result);warning.hidden=!result?.pending;return result;
      }catch{if(call===version){key='';result=null;}return null;}
      finally{if(call===version)inflight=null;}
    })();
    return inflight;
  }
  let reviewVersion=0;
  async function review(p){
    const call=++reviewVersion;if(p.tipo!=='musico')return;
    const box=document.createElement('div');box.className='student-activity-warning';box.setAttribute('role','status');
    box.textContent='Consultando a situação do aluno no GEM/SAM...';document.querySelector('#review-content').appendChild(box);
    const a=await refresh();
    if(call!==reviewVersion||!box.isConnected)return;
    if(a?.pending)box.innerHTML=message(a);
    else if(!a||a.available===false){box.innerHTML='<strong>Situação do GEM/SAM não confirmada</strong><p>A emissão continua permitida. Confira a situação do aluno no GEM antes de prosseguir.</p>';}
    else box.remove();
  }
  window.CartasStudentActivity={review};
  function schedule(){setTimeout(refresh,0);}
  for(const event of ['input','change','click','candidate-changed'])form.addEventListener(event,schedule);
})();
