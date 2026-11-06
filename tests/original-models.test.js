const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PDFDocument}=require('pdf-lib');
const {makePdf,templateKeys}=require('../src/pdf');
for(const [tipo,modes]of Object.entries(templateKeys)){
 for(const [modalidade,key]of Object.entries(modes)){
  test(`modelo original ${key} permanece completo em uma página`,async()=>{
   const result=await makePdf({created_at:'2027-11-05T15:00:00Z',payload:{tipo,modalidade,nome:'ALEX SANTOS DA SILVA',municipio:'ITAPEVI',comum:'BR-21-0840 - ALTO DO BELA VISTA',instrumento:'SAXOFONE ALTO',tonalidade:'Sib',instrutora:'ANA MARIA DE SOUZA',comum_instrutora:'BR-21-1039 - CENTRAL DE ITAPEVI',data_oficializacao:'2015-06-20',novo_instrumento:'TROMPETE'},ministry_snapshot:{anciao:{nome:'ANTONIO DOS SANTOS'},cooperador:{nome:'Sem Cooperador do Ofício'},regional:{nome:'ELI GONÇALVES JERÔNIMO'},encarregado:{nome:'ANÍSIO DOS SANTOS'}}});
   const pdf=await PDFDocument.load(result);
   assert.equal(pdf.getPageCount(),1);
   assert.ok(result.length>20000,'O formulário original deve estar incorporado');
   assert.equal(pdf.getAuthor(),'Congregação Cristã no Brasil');
  });
 }
}