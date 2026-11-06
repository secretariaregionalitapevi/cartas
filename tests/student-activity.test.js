const test=require('node:test'),assert=require('node:assert/strict');
const {classify,studentActivity,activityReview}=require('../src/student-activity');
test('inatividade usa status operacional SAM, mesmo com cadastro Alerta',()=>{
 const a=classify({status:'Alerta'},{operational_status:'INATIVO',inactive_days:250,last_activity_at:'2026-03-01'});
 assert.equal(a.status,'INATIVO');assert.equal(a.pending,true);
 const r=activityReview(a,{nome:'ALUNO',comum:'COMUM'},{evento:'EXAME',data:'2026-11-28'},{regional:{nome:'REGIONAL'}});
 assert.equal(r.status,'pending');assert.equal(r.recipients.length,3);assert.match(r.message,/28\/11\/2026/);
 assert.equal(r.channel,'internal');
});
test('limites da regra: 180 ativo, 181 inativo, 365 inativo, 366 excluir',()=>{
 for(const [days,status]of [[180,'ATIVO'],[181,'INATIVO'],[365,'INATIVO'],[366,'EXCLUIR']])assert.equal(classify({status:'ATIVO'},{operational_status:'ATIVO',inactive_days:days}).status,status);
});
test('situação ativa não cria pendência e organista não consulta',async()=>{
 assert.equal(activityReview(classify({status:'ATIVO'},{operational_status:'ATIVO',inactive_days:10}),{}, {},{}),null);
 assert.equal(await studentActivity({rows(){throw Error();}},{},'organista'),null);
});
test('falha não inventa inatividade e não impede emissão',async()=>{
 const a=await studentActivity({rows:async()=>{throw Error();}},{status:'ATIVO'},'musico');
 assert.equal(a.pending,false);assert.equal(a.available,false);
 const b=await studentActivity({rows:async()=>{throw Error();}},{status:'INATIVO'},'musico');assert.equal(b.pending,true);
});
