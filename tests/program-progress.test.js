const test=require('node:test'),assert=require('node:assert/strict');
const {consultation}=require('../src/program');
test('barra do GEM usa a proxima etapa e preserva a avaliacao do exame',async()=>{
 const data={musica_acompanhamento_msa:[{fase:'15.1'}],musica_acompanhamento_metodo:[{metodo:'Getchel',licao:'11'}],musica_acompanhamento_hinario:[]};
 const result=await consultation({rows:async table=>data[table]}, {id:'aluno',instrumento:'TROMPETE',nivel:'CANDIDATO(A)'},'musico','culto');
 assert.equal(result.completion_percent,0);
 assert.equal(result.target,'culto');
 assert.equal(result.study_progress.target,'rjm');
 assert.equal(result.study_progress.completion_percent,33);
 assert.equal(result.study_progress.requirements[0].status,'ok');
 assert.equal(result.study_progress.requirements[2].required,'Hinos 431 a 480 - voz principal');
});
