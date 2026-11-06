'use strict';
const crypto=require('node:crypto');
const {norm,administration,eventAdministrations,eventId,isExam,commonCode,eligibleEvent}=require('./domain');
const {csvEvents}=require('./agenda');
const OFFICIAL='https://script.google.com/macros/s/AKfycbw8cDlKeV3JuncWmVXY5EmZQ66p2Y_LMpoj93ILRxmDSF582oe8nehEatqtlCMRKs8t/exec';
const labels={on_time:'Entregue no prazo',late:'Entregue em atraso',pending:'Aguardando entrega',overdue:'Não entregue - prazo vencido',no_deadline:'Aguardando - prazo não confirmado',received:'Entregue - prazo não confirmado',unknown_date:'Entregue - data não informada'};
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))throw fail('Informe uma data válida.');const d=new Date(value+'T12:00:00Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw fail('Informe uma data válida.');return value;}
function candidateKey(row){return crypto.createHash('sha256').update([row.event_id,row.tipo,row.modalidade,norm(row.nome),commonCode(row.comum)].join('|')).digest('hex');}
function suggestedDeadline(pre){date(pre);const [y,m,d]=pre.split('-').map(Number),last=new Date(Date.UTC(y,m-1,0)).getUTCDate(),value=new Date(Date.UTC(y,m-2,Math.min(d,last)));value.setUTCDate(value.getUTCDate()-(value.getUTCDay()+2)%7);return value.toISOString().slice(0,10);}
const isPre=e=>/\bPRE[\s-]*AVALIAC/.test(norm(e.evento));
function deadlineFor(event,official,saved){
 const admin=eventAdministrations(event),kind=/ORGANISTA/.test(norm(event.evento))?'organista':/MUSICO/.test(norm(event.evento))?'musico':null;
 if(!kind||!admin.length)return null;
 const refs=official.filter(e=>isPre(e)&&e.data<=event.data&&eventAdministrations(e).some(a=>admin.includes(a))&&eligibleEvent(e,kind)).filter(e=>!isPre(event)||e.data===event.data).sort((a,b)=>b.data.localeCompare(a.data));
 if(!refs.length)return null;
 const chosen=saved&&refs.find(e=>e.data===saved.pre_date),reference=chosen||refs[0];
 return {pre_date:reference.data,pre_event:reference.evento,deadline:chosen?saved.deadline:suggestedDeadline(reference.data),source:chosen?'manual':'automatic'};
}
function deliveryStatus(delivery,deadline,now=today()){
 const received=delivery?.received===true,dt=delivery?.received_on;
 if(received)return !dt?'unknown_date':!deadline?'received':dt<=deadline.deadline?'on_time':'late';
 return !deadline?'no_deadline':now>deadline.deadline?'overdue':'pending';
}
function scopeQuery(city){const names=[...new Set([city,city.normalize('NFD').replace(/[\u0300-\u036f]/g,'')].map(x=>x.toUpperCase()))];return names.length===1?{municipio:'ilike.'+names[0]}:{or:'('+names.map(x=>'municipio.ilike.'+x).join(',')+')'};}
function assertCity(row,identity){return norm(row.municipio)===norm(identity.municipio);}
class AdminManagement{
 constructor(store,env=process.env,agendaProvider=null){this.store=store;this.env=env;this.agendaProvider=agendaProvider;this.agendaCache=null;}
 async official(){if(this.agendaProvider)return this.agendaProvider();if(this.agendaCache&&Date.now()-this.agendaCache.at<60000)return this.agendaCache.events;
  const response=await this.store.fetch(this.env.ADMIN_AGENDA_CSV_URL||this.env.AGENDA_CSV_URL||OFFICIAL,{signal:AbortSignal.timeout(20000),cache:'no-store'});if(!response.ok)throw fail('Não foi possível consultar o calendário oficial.',503);
  const events=csvEvents(await response.text()).filter(e=>(!e.departamento||norm(e.departamento)==='MUSICA')&&isExam(e)&&/^\d{4}-\d{2}-\d{2}$/.test(e.data)).map(e=>({...e,id:eventId(e)}));
  this.agendaCache={at:Date.now(),events};return events;
 }
 async state(identity){
  const query=scopeQuery(identity.municipio);
  const [letters,saved]=await Promise.all([this.store.rows('cartas_emissoes',{...query,status:'eq.ready',deleted_at:'is.null',order:'created_at.desc'}),this.store.rows('cartas_relacao_candidatos',{...query,order:'candidate_key.asc'})]);
  const scopedLetters=letters.filter(r=>assertCity(r,identity)),registrations=saved.filter(r=>assertCity(r,identity));
  const map=new Map();for(const row of registrations){const data=row.data||{};if(!assertCity(data,identity))continue;map.set(row.candidate_key,{...data,key:row.candidate_key,version:row.version,issued:false,letter_id:null});}
  for(const row of scopedLetters){const key=candidateKey(row),previous=map.get(key),p=row.payload||{};if(previous?.issued)continue;map.set(key,{nome:row.nome,comum:row.comum,municipio:row.municipio,tipo:row.tipo,modalidade:row.modalidade,event_id:row.event_id,event_snapshot:row.event_snapshot,pessoa_id:p.pessoa_id,instrumento:p.instrumento||(row.tipo==='organista'?'ÓRGÃO':''),tonalidade:p.tonalidade||'',student_activity:p.student_activity||{},key,version:previous?.version||0,delivery:previous?.delivery||{},source:previous?.source||'Carta emitida',observacao:previous?.observacao||row.review_notes||'',issued:true,letter_id:row.id});}
  const events=new Map();for(const row of map.values())events.set(row.event_id,{...row.event_snapshot,id:row.event_id,official:false});
  let official=[],agendaUnavailable=false;try{official=(await this.official()).filter(e=>eventAdministrations(e).includes(administration(identity.municipio)));for(const e of official)events.set(e.id,{...e,official:true});}catch{agendaUnavailable=true;}
  const eventIds=[...events.keys()],savedDeadlines=[];for(let i=0;i<eventIds.length;i+=100){const batch=eventIds.slice(i,i+100);savedDeadlines.push(...await this.store.rows('cartas_entrega_prazos',{event_id:'in.('+batch.join(',')+')',order:'event_id.asc'}));}
  const deadlines=new Map();for(const e of events.values())deadlines.set(e.id,deadlineFor(e,official,savedDeadlines.find(r=>r.event_id===e.id)));
  const items=[...map.values()].map(row=>{const deadline=deadlines.get(row.event_id),status=deliveryStatus(row.delivery,deadline);return {...row,deadline,delivery_status:status,delivery_label:labels[status]};});
  // Mesmo critério do painel: snapshot da emissão, ou consulta SAM quando ausente.
  const missingActivity=items.filter(r=>r.issued&&r.tipo==='musico'&&r.pessoa_id&&!Object.keys(r.student_activity||{}).length);
  const ids=[...new Set(missingActivity.map(r=>r.pessoa_id).filter(id=>/^[a-f0-9-]{36}$/i.test(id)))];
  for(let i=0;i<ids.length;i+=100){try{
   const filter='in.('+ids.slice(i,i+100).join(',')+')';
   const mirrors=await this.store.rows('sam_mirror_student_status',{aluno_id:filter,select:'sync_state_id,aluno_id,operational_status,requires_review,inactive_days,last_activity_at',order:'sync_state_id.asc'});
   const byId=new Map(mirrors.map(m=>[m.aluno_id,m])),classify=require('./student-activity').classify;
   for(const row of missingActivity){const mirror=byId.get(row.pessoa_id);if(mirror)row.student_activity=classify({},mirror);}
  }catch{/* Sem confirmação do SAM, não presumir inatividade. */}}
  const eventList=[...events.values()].map(e=>({...e,deadline:deadlines.get(e.id),kinds:['musico','organista'].filter(kind=>eligibleEvent(e,kind)||items.some(r=>r.event_id===e.id&&r.tipo===kind))})).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  return {items,events:eventList,agenda_unavailable:agendaUnavailable};
 }
 async list(identity,params,all=false){const state=await this.state(identity),event=state.events.find(e=>e.id===params.get('evento')),kind=params.get('tipo');if(!event||!['musico','organista'].includes(kind)||!event.kinds.includes(kind))throw fail('Selecione um exame do seu município e o tipo de candidato.');
  const base=state.items.filter(r=>r.event_id===event.id&&r.tipo===kind),summary={total:base.length,received:0,missing:0,on_time:0,late:0,overdue:0};for(const r of base){summary[r.delivery?.received?'received':'missing']++;if(r.delivery_status in summary)summary[r.delivery_status]++;}
  const search=norm(params.get('busca')||'').slice(0,160),status=params.get('entrega')||'';const mode=params.get('modalidade')||'';let rows=base.filter(r=>(!mode||r.modalidade===mode)&&(!status||(status==='missing'?!r.delivery?.received:status==='received'?r.delivery?.received:r.delivery_status===status))&&search.split(' ').every(word=>norm(r.nome+' '+r.comum+' '+r.instrumento).includes(word))).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  const total=rows.length,page=Math.min(Math.max(1,Number.parseInt(params.get('pagina')||'1')||1),Math.max(1,Math.ceil(total/25)));if(!all)rows=rows.slice((page-1)*25,page*25);
  return {items:rows,total,page,pages:Math.max(1,Math.ceil(total/25)),summary,event,kind,agenda_unavailable:state.agenda_unavailable};
 }
 async receipt(identity,body){if(!/^[a-f0-9]{64}$/.test(body.key||'')||typeof body.received!=='boolean'||!Number.isInteger(body.version)||body.version<0)throw fail('Confira os dados do recebimento.');
  const state=await this.state(identity),row=state.items.find(r=>r.key===body.key);if(!row)throw fail('Carta não encontrada no seu município.',404);
  const receivedOn=body.received?date(body.received_on):null;if(receivedOn&&receivedOn>today())throw fail('O recebimento não pode ter data futura.');
  const delivery={received:body.received,received_on:receivedOn,recorded_by:identity.name,recorded_at:new Date().toISOString(),channel:'cartas_admin'};
  const data={...row,delivery};delete data.deadline;delete data.delivery_status;delete data.delivery_label;
  try{const result=await this.store.api('/rest/v1/rpc/cartas_registrar_entrega',{method:'POST',body:{p_key:row.key,p_data:data,p_version:body.version,p_actor:identity.id,p_name:identity.name}});return {ok:true,delivery,version:result.version};}catch(e){if(e.status===409||e.code==='40001')throw fail('A entrega foi alterada por outra pessoa. Atualize a lista e tente novamente.',409);throw e;}
 }
 async document(identity,id){if(!/^[a-f0-9-]{36}$/i.test(id||''))throw fail('Carta não encontrada.',404);const [row]=await this.store.rows('cartas_emissoes',{id:'eq.'+id,...scopeQuery(identity.municipio),status:'eq.ready',deleted_at:'is.null'});if(!row||!assertCity(row,identity)||!row.pdf_path)throw fail('Carta não encontrada no seu município.',404);return {row,pdf:await this.store.document(row.pdf_path)};}
}
module.exports={AdminManagement,candidateKey,suggestedDeadline,deliveryStatus,deadlineFor,scopeQuery,assertCity};
