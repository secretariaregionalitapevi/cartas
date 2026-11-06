'use strict';
const {norm,administration}=require('./domain');
const centers={ITAPEVI:'Itapevi',COTIA:'Cotia',JANDIRA:'Jandira',SANTANA_PIRAPORA:'Santana de Parnaíba'};
function examDetails(record){
  const event=record.event_snapshot||{},payload=record.payload||{};
  let locality='';
  for(const source of [event.municipio,event.cidade,event.administracao,event.local,event.evento]){
    const value=norm(source),found=[];
    if(/\bITAPEVI\b/.test(value))found.push('ITAPEVI');
    if(/\bCOTIA\b|\bCAUCAIA\b|\bVARGEM GRANDE\b|\bVGP\b/.test(value))found.push('COTIA');
    if(/\bJANDIRA\b/.test(value))found.push('JANDIRA');
    if(/\bSANTANA\b|\bPIRAPORA\b|\bFAZENDINHA\b/.test(value))found.push('SANTANA_PIRAPORA');
    if(found.length===1){locality=centers[found[0]];break;}
  }
  locality=locality||centers[administration(payload.municipio||record.municipio)]||'';
  const iso=String(event.data||'').slice(0,10);
  const date=/^\d{4}-\d{2}-\d{2}$/.test(iso)?iso.split('-').reverse().join('/'):'';
  return {date,locality};
}
module.exports={examDetails};
