'use strict';
// Regras do GEM: sam_program.py (Circular 158/2023). Paridade coberta por fixtures.
const {levels,methods,rules}=require('./program-rules.json');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const numbers=v=>(String(v??'').match(/\d+(?:[.,]\d+)?/g)||[]).map(n=>Number(n.replace(',','.')));
const maximum=(rows,fields)=>Math.max(0,...rows.flatMap(r=>fields.flatMap(f=>numbers(r[f]))));
function assess(student,records,target){
  const level=levels[target];if(!level)throw Error('Etapa inválida');
  const instrument=norm(student.instrumento);
  const group=Object.keys(methods).find(k=>instrument.includes(k))||(instrument.includes('SAX')?'SAXOFONE':instrument.includes('EUPHON')?'EUFONIO':instrument);
  const msa=records.msa||[],method=records.metodo||[],hymns=records.hinario||[];
  const phase=maximum(msa,['fase']);
  const msaOk=phase>=level.msa_phase&&(!level.revision||msa.some(r=>norm([r.fase,r.observacoes].join(' ')).includes('REVISAO')));
  const methodOk=method.some(r=>{
    const name=norm(r.metodo),detail=norm([r.pagina,r.licao,r.observacoes].join(' '));
    if(['COMPLETO','CONCLUIDO','FINALIZADO'].some(w=>detail.includes(w)))return true;
    return (rules[group]?.[target]||[]).some(([alias,field,minimum])=>name.includes(alias)&&maximum([r],[field])>=minimum);
  });
  const documented=new Set();for(const r of hymns){const nums=(String(r.hino||'').match(/\d+/g)||[]).map(Number);if(nums.length>=2&&nums[1]-nums[0]>0&&nums[1]-nums[0]<=480){for(let n=nums[0];n<=nums[1];n++)documented.add(n);}else nums.filter(n=>n>=1&&n<=480).forEach(n=>documented.add(n));}
  let hymnOk=true;for(let n=level.hymns[0];n<=level.hymns[1];n++)if(!documented.has(n))hymnOk=false;
  const requirements=[
    {area:'MSA',status:msaOk?'ok':'missing',required:`Fase mínima exigida para a etapa: ${level.msa_phase}${level.revision?' com revisão':''}`,current:phase?`Fase alcançada no histórico: ${phase} (${phase===level.msa_phase?'requisito atendido':phase>level.msa_phase?'requisito superado':'abaixo do requisito'})`:'Sem fase documentada'},
    {area:'Método',status:methodOk?'ok':method.length?'review':'missing',required:methods[group]?.[target]||'Programa do método específico não cadastrado para este instrumento.',current:method.length?`${method.length} lançamento(s); máximo informado: ${maximum(method,['pagina','licao'])}`:'Sem lançamento documentado'},
    {area:'Hinário',status:hymnOk?'ok':'missing',required:`Hinos ${level.hymns[0]} a ${level.hymns[1]} - voz principal${target==='rjm'?'':' e alternativa'}`,current:`${documented.size} hino(s) distintos documentados`}
  ];
  const percent=Math.round(requirements.filter(r=>r.status==='ok').length/3*100);
  const status=!(msa.length||method.length||hymns.length)?'no_data':percent===100?'eligible':requirements.some(r=>r.status==='review')?'review':'pending';
  const summary=status==='eligible'?'Requisitos documentais atendidos; apto para emissão da carta.':status==='review'?'Há método lançado, mas a conclusão precisa de validação pedagógica.':status==='no_data'?'Sem histórico no GEM':'Os lançamentos ainda não comprovam todos os requisitos do Programa Mínimo.';
  return {target,target_label:level.label,status,summary,eligible:status==='eligible',completion_percent:percent,requirements};
}
const labels={eligible:'Documentado',pending:'Requisitos pendentes',review:'Validação pendente',no_data:'Sem histórico no GEM',unavailable:'Consulta indisponível'};
async function consultation(store,person,type,target){
  if(type!=='musico'||!['culto','oficializacao'].includes(target))return null;
  let result;
  try{
    const tables={msa:'musica_acompanhamento_msa',metodo:'musica_acompanhamento_metodo',hinario:'musica_acompanhamento_hinario'};
    const records=Object.fromEntries(await Promise.all(Object.entries(tables).map(async([area,table])=>[area,await store.rows(table,{aluno_id:'eq.'+person.id},true)])));
    result=assess(person,records,target);
    const level=norm(person.nivel);
    const next=level.includes('CULTO OFICIAL')?'oficializacao':level.includes('RJM')||level.includes('MEIA HORA')?'culto':'rjm';
    result.study_progress=assess(person,records,next);
  }catch{result={status:'unavailable',requirements:[]};}
  const checked_at=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date()).replace(',','');
  return {...result,label:labels[result.status],checked_at,basis:'Consulta ao GEM; emissão permitida'};
}
module.exports={assess,consultation};
