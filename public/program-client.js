(() => {
  const form=document.querySelector('#letter-form'),box=document.querySelector('#program-assessment');
  let version=0,last='',timer,assessment=null;
  window.CartasProgramBadge=()=>assessment&&last===[form.elements.pessoa_id.value,document.querySelector('#type').value,document.querySelector('#mode').value,document.querySelector('#common').value].join('|')?GemTechnicalSummary.badge(assessment):'';
  window.CartasProgramAssessment=()=>assessment&&last===[form.elements.pessoa_id.value,document.querySelector('#type').value,document.querySelector('#mode').value,document.querySelector('#common').value].join('|')?assessment:null;
  function reset(){version++;last='';assessment=null;box.hidden=true;box.innerHTML='';window.CartasWorkspace?.refresh();}
  async function refresh(){
    const id=form.elements.pessoa_id.value,type=document.querySelector('#type').value,target=document.querySelector('#mode').value,common=document.querySelector('#common').value;
    if(!id||type!=='musico'||!['culto','oficializacao'].includes(target)){reset();return;}
    const key=[id,type,target,common].join('|');if(key===last)return;last=key;const current=++version;
    assessment=null;window.CartasWorkspace?.refresh();box.hidden=false;box.innerHTML='<p>Consultando os estudos do candidato...</p>';
    try{
      const {assessment:a}=await api('/api/program-assessment?'+new URLSearchParams({pessoa_id:id,tipo:type,modalidade:target,comum:common}));
      if(current!==version)return;
      if(!a){reset();return;}
      assessment=a;box.innerHTML=`<div class="program-study-intro"><h3>Resumo técnico do Programa Mínimo</h3><p>Etapa avaliada: <strong>${esc(a.target_label||document.querySelector('#mode').selectedOptions[0]?.textContent||'Não identificada')}</strong></p><p>${esc(a.summary||a.label||'Confira abaixo os registros de estudo do aluno no GEM.')}</p></div>`+GemTechnicalSummary.render(a);window.CartasWorkspace?.refresh();
    }catch{if(current===version){last='';box.innerHTML='<p>Consulta indisponível. Confira os estudos no GEM. A emissão da carta continua permitida.</p>';}}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,0);}
  form.addEventListener('input',schedule);form.addEventListener('change',schedule);form.addEventListener('click',schedule);
  form.addEventListener('candidate-changed',schedule);
})();
