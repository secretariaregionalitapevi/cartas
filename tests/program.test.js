const test=require('node:test'),assert=require('node:assert/strict');
const {assess,consultation}=require('../src/program');
const fixtures=require('./fixtures/program-assessment.json');
test('42 avaliações mantêm paridade com as regras documentais do GEM',()=>{
  for(const f of fixtures){
    const a=assess(f.student,f.records,f.target);
    assert.deepEqual({status:a.status,completion_percent:a.completion_percent,areas:a.requirements.map(r=>r.status)},f.expected,JSON.stringify(f.student)+' '+f.target);
  }
});
test('organistas e trocas de instrumento não consultam o programa de músicos',async()=>{
  const store={rows(){throw Error('Não deveria consultar');}};
  assert.equal(await consultation(store,{id:'id'},'organista','culto'),null);
  assert.equal(await consultation(store,{id:'id'},'musico','troca_necessidade'),null);
});
test('falha na consulta produz aviso informativo e preserva emissão',async()=>{
  const result=await consultation({rows:async()=>{throw Error('offline');}},{id:'id'},'musico','culto');
  assert.equal(result.status,'unavailable');assert.equal(result.requirements.length,0);
  assert.match(result.basis,/emissão permitida/);
});
