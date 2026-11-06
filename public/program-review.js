(() => {
  'use strict';
  let version=0;
  const applies=p=>p.tipo==='musico'&&['culto','oficializacao'].includes(p.modalidade);
  function content(a){
    const evaluated=a&&['eligible','pending','review','no_data'].includes(a.status);
    if(!evaluated)return '<div class="review-program-progress"><div><strong>Requisitos documentais da próxima etapa</strong><strong>Não confirmado</strong></div><div class="review-program-track" role="progressbar" aria-label="Comprovação documental indisponível" aria-valuetext="Não foi possível consultar os estudos no GEM"><span style="width:100%;background:#cbd5e1"></span></div><small>Não foi possível consultar os registros. O percentual não será presumido; confira os estudos no GEM.</small></div><div class="review-program-notice" role="status"><strong>Programa Mínimo: comprovação não confirmada</strong><p>A carta será gerada. Ao prosseguir, o encarregado fica ciente de que não foi possível confirmar os estudos no GEM e deverá conferir o Programa Mínimo do aluno.</p></div>';
    const progress=a.study_progress||a;
    const items=progress.requirements||[],complete=items.filter(r=>r.status==='ok').length,total=items.length;
    const percent=Number(progress.completion_percent??(total?Math.round(complete/total*100):0));
    const missing=items.filter(r=>r.status!=='ok').map(r=>r.area);
    const notice=a.status==='eligible'
      ?'<div class="review-program-notice complete"><strong>Requisitos documentais atendidos</strong><p>Os registros do GEM comprovam os três requisitos para a etapa selecionada.</p></div>'
      :'<div class="review-program-notice" role="status"><strong>Ciência do encarregado · Programa Mínimo pendente</strong><p>A carta será gerada. Ao prosseguir, o encarregado fica ciente de que não há comprovação de que o aluno completou o Programa Mínimo para esta etapa.</p></div>';
    return `<div class="review-program-progress"><div><strong>Requisitos documentais da próxima etapa</strong><strong>${percent}%</strong></div><div class="review-program-track" role="progressbar" aria-label="Requisitos documentais atendidos" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div><small>${complete} de ${total} áreas documentais atendidas${complete?': '+esc(items.filter(r=>r.status==='ok').map(r=>r.area).join(', ')):''}.${missing.length?' Pendentes: '+esc(missing.join(', '))+'.':''} O percentual não representa a fase máxima alcançada no MSA.</small></div><p class="review-program-stage">Etapa acompanhada no GEM: ${esc(progress.target_label)}. Carta solicitada: ${esc(a.target_label)}.</p>${notice}`;
  }
  async function render(p){
    const current=++version,dialog=document.querySelector('#review-dialog');
    if(!applies(p))return;
    const box=document.createElement('section');box.className='review-program';box.setAttribute('aria-label','Programa Mínimo do candidato');box.setAttribute('aria-live','polite');
    box.innerHTML='<p>Consultando os requisitos do Programa Mínimo...</p>';
    document.querySelector('#review-content').appendChild(box);
    try{
      const cached=window.CartasProgramAssessment?.();
      const a=cached||(await api('/api/program-assessment?'+new URLSearchParams({pessoa_id:p.pessoa_id,tipo:p.tipo,modalidade:p.modalidade,comum:p.comum}))).assessment;
      if(current===version&&dialog.open)box.innerHTML=content(a);
    }catch{if(current===version&&dialog.open)box.innerHTML=content(null);}
  }
  window.CartasProgramReview={render};
})();
