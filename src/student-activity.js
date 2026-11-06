'use strict';
const {norm}=require('./domain');
function classify(person,mirror,checked=new Date()){
  const explicit=norm(person.status),days=mirror?.inactive_days==null?null:Number(mirror.inactive_days);
  const exclude=mirror?.requires_review===true||['EXCLUIR','A EXCLUIR'].includes(explicit)||(Number.isFinite(days)&&days>365);
  const inactive=exclude||norm(mirror?.operational_status)==='INATIVO'||explicit==='INATIVO'||(Number.isFinite(days)&&days>180);
  const status=exclude?'EXCLUIR':inactive?'INATIVO':mirror?.operational_status||person.status||'SEM HISTORICO';
  return {status,pending:inactive,requires_review:exclude,last_activity_at:mirror?.last_activity_at||null,
    inactive_days:days,checked_at:checked.toISOString(),source:'GEM/SAM',
    reason:exclude?'Aluno sinalizado para exclusão/revisão no GEM/SAM. Carta pendente de análise regional.':inactive?'Aluno inativo no GEM/SAM. Carta pendente de análise regional.':''};
}
async function studentActivity(store,person,type){
  if(type!=='musico')return null;
  try{
    const mirrors=await store.rows('sam_mirror_student_status',{aluno_id:'eq.'+person.id},true);
    return classify(person,mirrors[0]);
  }catch{
    const result=classify(person,null);
    return {...result,status:result.pending?result.status:'CONSULTA INDISPONÍVEL',available:false};
  }
}
function activityReview(activity,p,event,chosen){
  if(!activity?.pending)return null;
  const recipients=[{role:'anciao_musica',label:'Ancião da música'},
    {role:'encarregado_regional',label:'Encarregado regional que atende',name:chosen.regional?.nome||''},
    {role:'secretario_regional',label:'Secretário da regional'}];
  const date=String(event.data||'').slice(0,10).split('-').reverse().join('/');
  return {status:'pending',reason:activity.reason,created_at:activity.checked_at,channel:'internal',
    recipients,message:`Carta pendente de análise: ${p.nome} - ${p.comum}. Situação GEM/SAM: ${activity.status}. Exame: ${event.evento} - ${date}. A carta foi emitida sem bloqueio; é necessária ciência do ancião da música, do encarregado regional e do secretário da regional.`};
}
module.exports={classify,studentActivity,activityReview};
