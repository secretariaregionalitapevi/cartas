'use strict';
const {createHash}=require('node:crypto');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const cities=['Cotia','Caucaia do Alto','Vargem Grande Paulista','Itapevi','Jandira','Santana de Parnaíba','Pirapora do Bom Jesus'];
function administration(city){
  const n=norm(city);
  if(['COTIA','CAUCAIA','CAUCAIA DO ALTO','VGP','VARGEM GRANDE PAULISTA'].includes(n))return 'COTIA';
  if(['SANTANA','SANTANA DE PARNAIBA','PIRAPORA','PIRAPORA DO BOM JESUS'].includes(n))return 'SANTANA_PIRAPORA';
  return ['ITAPEVI','JANDIRA'].includes(n)?n:null;
}
const modalities={musico:{oficializacao:'Oficialização',culto:'Culto oficial',troca_necessidade:'Troca de instrumento por necessidade',troca_enfermidade:'Troca de instrumento por enfermidade'},organista:{rjm:'RJM',culto:'Culto oficial',oficializacao:'Oficialização',por_chance:'Por chance'}};
function commonCode(v){return String(v??'').toUpperCase().match(/BR-\d{2}-\d{4}/)?.[0]||norm(v);}
function commonMatches(a,b){return commonCode(a)===commonCode(b);}
function eventId(e){return createHash('sha256').update([e.data,e.hora,e.evento,e.local||'',e.municipio||''].join('|')).digest('hex').slice(0,32);}
function eventAdministrations(e){
  const explicit=e.municipio||e.cidade||e.administracao;
  if(explicit){const admin=administration(explicit);return admin?[admin]:[];}
  const text=norm([e.evento,e.local].join(' '));
  return [...new Set(cities.filter(c=>text.includes(norm(c))).map(administration).concat(/\bCAUCAIA\b|\bVGP\b/.test(text)?['COTIA']:[],/\bSANTANA\b|\bPIRAPORA\b|\bFAZENDINHA\b/.test(text)?['SANTANA_PIRAPORA']:[]))];
}
function isExam(e){return /\b(EXAMES?|TESTES?|AVALIACAO|AVALIACOES|PRE TESTE|PRE TESTES)\b/.test(norm(e.evento));}
function examEvents(events,city,today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})){
  const admin=administration(city); if(!admin)return [];
  return events.filter(e=>isExam(e)&&/^\d{4}-\d{2}-\d{2}$/.test(e.data)&&e.data>=today&&eventAdministrations(e).includes(admin)).map(e=>({...e,id:eventId(e)})).sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
}
function eligibleEvent(e,type,mode){const title=norm(e.evento);if(type==='musico'&&title.includes('ORGANISTA'))return false;if(type==='organista'&&/\bMUSICOS?\b/.test(title))return false;return true;}
function validate(body){
  const text=(key,max=160)=>typeof body[key]==='string'?body[key].trim().slice(0,max):'';
  const p={tipo:text('tipo'),modalidade:text('modalidade'),municipio:text('municipio'),comum:text('comum'),nome:text('nome'),instrumento:text('instrumento'),tonalidade:text('tonalidade',50),evento_id:text('evento_id'),whatsapp:text('whatsapp',25),instrutora:text('instrutora'),comum_instrutora:text('comum_instrutora'),metodos:text('metodos',1500),novo_instrumento:text('novo_instrumento'),nova_tonalidade:text('nova_tonalidade',50),motivo:text('motivo',1000),data_oficializacao:text('data_oficializacao',10)};
  if(!modalities[p.tipo]?.[p.modalidade]||!administration(p.municipio)||!p.comum||p.nome.length<5||!p.evento_id)throw Object.assign(Error('Preencha município, comum, nome completo, modalidade e exame.'),{status:400});
  if(p.nome.split(/\s+/).length<2)throw Object.assign(Error('Informe o nome completo.'),{status:400});
  if(p.tipo==='musico'&&!p.instrumento)throw Object.assign(Error('Informe o instrumento.'),{status:400});
  if(p.tipo==='organista'&&(!p.instrutora||!p.comum_instrutora))throw Object.assign(Error('Informe a instrutora e sua comum.'),{status:400});
  if(p.modalidade.startsWith('troca_'))p.motivo=p.modalidade==='troca_necessidade'?'Necessidade da orquestra':'Enfermidade';
  if(p.modalidade.startsWith('troca_')&&(!p.novo_instrumento||!p.motivo))throw Object.assign(Error('Informe o novo instrumento e o motivo da troca.'),{status:400});
  if(p.modalidade.startsWith('troca_')&&!/^\d{4}-\d{2}-\d{2}$/.test(p.data_oficializacao))throw Object.assign(Error('Informe a data da oficializacao.'),{status:400});
  if(p.tipo==='organista')p.instrumento='Órgão';
  for(const key of ['cultos','qtd_culto','qtd_rjm','limite']){const n=Number(body[key]);if(p.tipo==='organista'&&(!Number.isInteger(n)||n<0||n>999||body[key]===''))throw Object.assign(Error('Informe as quantidades da comum.'),{status:400});p[key]=p.tipo==='organista'?n:null;}
  return p;
}
function duplicateKey(p,event){return createHash('sha256').update([norm(p.nome),commonCode(p.comum),p.tipo,p.modalidade,event.id].join('|')).digest('hex');}
module.exports={norm,cities,administration,modalities,commonCode,commonMatches,eventId,eventAdministrations,isExam,examEvents,eligibleEvent,validate,duplicateKey};
