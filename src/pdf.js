'use strict';
const fs=require('node:fs');
const path=require('node:path');
const PDFKit=require('pdfkit');
const {PDFDocument}=require('pdf-lib');
const manifest=require('../data/letter-models/manifest.json');
const {examDetails}=require('./exam-location');
const availableModalities={musico:['oficializacao','culto','troca_necessidade','troca_enfermidade'],organista:['rjm','culto','oficializacao']};
const templateKeys={musico:{oficializacao:'CARTA_MUSICO_OF_IA',culto:'CARTA_MUSICO_CO_IA',troca_necessidade:'CARTA_MUSICO_TROCA_IA_NEC',troca_enfermidade:'CARTA_MUSICO_TROCA_IA_ENF'},organista:{rjm:'CARTA_ORGANISTAS_RJM_IA',culto:'CARTA_ORGANISTAS_CO_IA',oficializacao:'CARTA_ORGANISTAS_OF_IA'}};
function dateBR(value){return String(value||'').slice(0,10).split('-').reverse().join('/');}
function drawSigningSections(doc,p,people,y,exam){
 const x=22,w=551,right=573,exchange=p.modalidade.startsWith('troca_'),organist=p.tipo==='organista';
 function text(value,x,y,width,size=8,options={}){doc.font(options.bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor('#000').text(String(value),x,y,{width,lineBreak:false,...options});}
 function line(x1,y1,x2){doc.moveTo(x1,y1).lineTo(x2,y1).lineWidth(.65).strokeColor('#000').stroke();}
 function band(title,top){doc.rect(x,top,w,16).fillAndStroke('#d1d1d1','#000');text(title,x,top+3,w,10,{bold:true,align:'center'});}
 function name(value,baseline){
  value=String(value||'');doc.font('Helvetica-Bold');let size=11;
  while(size>=9.2){doc.fontSize(size);if(doc.heightOfString(value,{width:254,lineGap:1})<=25)break;size-=.2;}
  if(size<9.2)throw Error('Nome ministerial muito longo para o espaço de assinatura. Confira o cadastro.');
  const height=doc.heightOfString(value,{width:254,lineGap:1});
  doc.text(value,32,baseline-height-2,{width:254,height:26,lineGap:1});
 }
 if(!exchange){line(332,y-22,562);text('Assinatura do candidato(a)',332,y-18,230,7.5,{align:'center'});}
 band('Ministério local',y);const rowHeight=exchange?56:61;
 const rows=[[people.anciao?.nome,'Ancião'],[people.cooperador?.nome,'Cooperador oficial'],[[people.regional?.nome,people.encarregado?.nome].filter(Boolean).join(' | '),'Encarregado regional | Encarregado local']];
 for(const [i,[value,label]]of rows.entries()){
  const top=y+16+i*rowHeight;
  if(i===2){doc.font('Helvetica-Bold').fontSize(10);let size=10;while(size>6&&doc.widthOfString(value)>254){size-=.1;doc.fontSize(size);}doc.fontSize(size).text(value,32,top+rowHeight-14-size-3,{width:255,lineBreak:false});}
  else name(value,top+rowHeight-14);
  line(32,top+rowHeight-14,286);line(316,top+rowHeight-14,562);
  text(label,32,top+rowHeight-11,254,7.5,{align:'center'});text('Assinatura',316,top+rowHeight-11,246,7.5,{align:'center'});
 }
 const ministryEnd=y+16+3*rowHeight;doc.rect(x,y,w,ministryEnd-y).lineWidth(.65).stroke();
 function result(title,top,height,roles,approval=false){
  band(title,top);doc.rect(x,top,w,height).lineWidth(.65).stroke();
  const infoBottom=top+51,aptoX=448;
  line(x,infoBottom,right);doc.moveTo(132,top+16).lineTo(132,infoBottom).stroke();doc.moveTo(aptoX,top+16).lineTo(aptoX,infoBottom).stroke();
  text('Data',x+6,top+20,90);text('Localidade',138,top+20,300);
  if(!approval){text(exam.date,x+6,top+34,98,11,{align:'center'});text(exam.locality,138,top+34,304,11);}
  text(approval?'Aprovado':organist?'Apta':'Apto',aptoX,top+19,right-aptoX,9,{bold:true,align:'center'});
  const optionWidth=(right-aptoX)/2,boxSize=8,labelSize=10,gap=5;
  for(const [index,label]of ['Sim','Não'].entries()){
   doc.font('Helvetica').fontSize(labelSize);
   const labelWidth=doc.widthOfString(label),groupWidth=boxSize+gap+labelWidth;
   const left=aptoX+index*optionWidth+(optionWidth-groupWidth)/2;
   doc.rect(left,top+33,boxSize,boxSize).lineWidth(.65).stroke();
   text(label,left+boxSize+gap,top+33.5,labelWidth+1,labelSize);
  }
  const available=height-51,row=available/roles.length;
  roles.forEach((role,i)=>{const base=infoBottom+(i+1)*row-13;line(32,base,286);line(316,base,562);text(role,32,base+3,254,7.5,{align:'center'});text('Assinatura',316,base+3,246,7.5,{align:'center'});});
 }
 if(exchange){result('Reunião ministerial',ministryEnd+10,110,['Ancião'],true);result('Resultado da avaliação',ministryEnd+130,96,['Encarregado regional']);}
 else result('Resultado',ministryEnd+12,organist?132:154,['Ancião',organist?'Examinadora':'Encarregado regional']);
 text('COMISSÃO MUSICAL',x,822,250,6);text('FORMULÁRIO '+(exchange?'M07':organist?'M05':p.modalidade==='culto'?'M02':'M03'),350,822,223,6,{align:'right'});
}
function letterFilename(record){
 const p={...record,...record.payload};
 const mode={culto:'CULTO OFICIAL',oficializacao:'OFICIALIZAÇÃO',rjm:'RJM',troca_necessidade:'TROCA DE INSTRUMENTO - NECESSIDADE',troca_enfermidade:'TROCA DE INSTRUMENTO - ENFERMIDADE'}[p.modalidade]||p.modalidade;
 const clean=v=>String(v||'').normalize('NFC').replace(/[\\/:*?"<>|\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim();
 return `CARTA ${clean(mode)}_ ${clean(p.nome)} _ ${clean(p.comum)}.pdf`;
}
async function makePdf(record){
 const p=record.payload,key=templateKeys[p.tipo]?.[p.modalidade],model=manifest[key];
 if(!model)throw Error('Modelo original não disponível.');
 const local=new Date(record.created_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}).split('/');
 const months=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
 const people=record.ministry_snapshot||{};
 const values={
  '[ALUNO]':p.nome,'[ALUNA]':p.nome,'[CODIGO_ALUNO]':p.comum,'[CODIGO_ALUNA]':p.comum,
  '[INSTRUMENTO]':[p.instrumento,p.tonalidade].filter(Boolean).join(' - '),
  '[INSTRUTORA]':p.instrutora,'[CODIGO_INSTRUTORA]':p.comum_instrutora,
  '[ANCIAO]':people.anciao?.nome,'[COOPERADOR]':people.cooperador?.nome,
  '[REGIONAL_ENCARREGADO]':[people.regional?.nome,people.encarregado?.nome].filter(Boolean).join(' | '),'[REGIONAL]':people.regional?.nome,'[ENCARREGADO]':people.encarregado?.nome,
  '[DATA_OFICIALIZACAO]':dateBR(p.data_oficializacao),'[NOVO_INSTRUMENTO]':[p.novo_instrumento,p.nova_tonalidade].filter(Boolean).join(' - '),
  '[CIDADE]':p.municipio,'[DIA]':local[0],'[MES]':months[Number(local[1])-1],'[ANO]':local[2]
 };
 const base=await PDFDocument.load(fs.readFileSync(path.join(__dirname,'../data/letter-models',key+'.pdf')));
 const pages=base.getPages();
 const overlay=await new Promise((resolve,reject)=>{
  const doc=new PDFKit({autoFirstPage:false,compress:true});const chunks=[];
  doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
  pages.forEach((page,i)=>{
   const {width,height}=page.getSize();doc.addPage({size:[width,height],margin:0});
   for(const field of model.fields.filter(f=>f.page===i)){
    const text=String(values[field.token]??'');if(!text)continue;
    doc.font(field.bold?'Helvetica-Bold':'Helvetica').fillColor('#000000');
    let size=field.size;doc.fontSize(size);
    while(size>6&&doc.widthOfString(text)>field.width){size-=.2;doc.fontSize(size);}
    if(doc.widthOfString(text)>field.width)throw Error('Texto muito longo para o campo '+field.token+'. Revise os dados antes de emitir.');
    doc.text(text,field.x,field.y+(field.size-size)*.5,{width:field.width+1,lineBreak:false});
   }
   if(model.layout_revision===2){
    const dateFields=[[p.municipio.toUpperCase(),365,46],[local[0],420,24],[months[Number(local[1])-1].toUpperCase(),465,64],[local[2],542,36]];
    for(const [value,x,width]of dateFields){
     const padding=3;
     doc.font('Helvetica').fontSize(10.5);let size=10.5;
     while(size>6&&doc.widthOfString(value)>width-padding*2){size-=.1;doc.fontSize(size);}
     doc.text(value,x+padding,model.greeting_date_y+(12-size)*.7,{width:width-padding*2,lineBreak:false,align:'center'});
    }
    drawSigningSections(doc,p,people,model.ministry_y,examDetails(record));
   }
  });doc.end();
 });
 const layer=await PDFDocument.load(overlay);
 const embedded=await base.embedPages(layer.getPages());
 pages.forEach((page,i)=>page.drawPage(embedded[i],{x:0,y:0}));
 base.setTitle(p.tipo==='organista'?'Pedido de avaliação de organista':p.modalidade.startsWith('troca_')?'Pedido de troca de instrumento':'Pedido de avaliação de músico');
 base.setAuthor('Congregação Cristã no Brasil');
 return Buffer.from(await base.save({useObjectStreams:false}));
}
module.exports={makePdf,availableModalities,templateKeys,letterFilename};