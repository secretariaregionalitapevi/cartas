const {test}=require('node:test'),assert=require('node:assert/strict');
const {letterFilename}=require('../src/pdf');
test('nome do arquivo segue a carta de referência e conserva acentos',()=>{
 assert.equal(letterFilename({payload:{modalidade:'culto',nome:'EDILSON SOUSA CAMPOS',comum:'BR-22-0415 - CAPUTERA'}}),'CARTA CULTO OFICIAL_ EDILSON SOUSA CAMPOS _ BR-22-0415 - CAPUTERA.pdf');
 assert.equal(letterFilename({modalidade:'oficializacao',nome:'JOSÉ',comum:'BR-21-1039 - CENTRAL'}),'CARTA OFICIALIZAÇÃO_ JOSÉ _ BR-21-1039 - CENTRAL.pdf');
});
test('nome de download não permite separadores de caminho ou quebra de cabeçalho',()=>{
 const name=letterFilename({modalidade:'rjm',nome:'Teste/\\\r\nNome',comum:'BR-21-1039: CENTRAL'});
 assert.ok(!/[\\/:*?"<>|\x00-\x1f]/.test(name));assert.ok(name.endsWith('.pdf'));
});