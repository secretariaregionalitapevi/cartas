const test=require('node:test'),assert=require('node:assert/strict');
const {examDetails}=require('../src/exam-location');
test('resultado usa data do exame em vez da data de preenchimento',()=>{
  assert.deepEqual(examDetails({created_at:'2026-11-06T10:00:00Z',payload:{municipio:'Itapevi'},event_snapshot:{data:'2026-11-28',evento:'Avaliação Músicos (Itapevi)'}}),{date:'28/11/2026',locality:'Itapevi'});
});
test('localidade segue o exame escolhido e os quatro locais de realização',()=>{
  for(const [name,expected]of [['Itapevi','Itapevi'],['Cotia','Cotia'],['Jandira','Jandira'],['Santana de Parnaíba','Santana de Parnaíba'],['Fazendinha','Santana de Parnaíba']]){
    assert.equal(examDetails({payload:{municipio:'Itapevi'},event_snapshot:{evento:`Avaliação (${name})`}}).locality,expected);
  }
});
test('agrupamento atende alunos de municípios associados',()=>{
  for(const [name,expected]of [['Caucaia do Alto','Cotia'],['Vargem Grande Paulista','Cotia'],['Pirapora do Bom Jesus','Santana de Parnaíba']])assert.equal(examDetails({payload:{municipio:name}}).locality,expected);
});
test('data ausente não é substituída pela emissão',()=>{
  assert.equal(examDetails({created_at:'2026-11-06T10:00:00Z'}).date,'');
});
