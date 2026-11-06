'use strict';
const OFFICIAL_CSV='https://script.google.com/macros/s/AKfycbw8cDlKeV3JuncWmVXY5EmZQ66p2Y_LMpoj93ILRxmDSF582oe8nehEatqtlCMRKs8t/exec';
function parseCSV(text){
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if(/[\r\n]/.test(c)&&!quoted){if(value||row.length){row.push(value);rows.push(row);}row=[];value='';}else value+=c;}
  if(value||row.length){row.push(value);rows.push(row);}return rows;
}
function csvEvents(text){const rows=parseCSV(text);const header=(rows.shift()||[]).map(v=>v.replace(/^\uFEFF/,'').trim().toLowerCase());if(!header.includes('data')||!header.includes('evento'))throw Error('Formato CSV inválido.');return rows.map(row=>Object.fromEntries(header.map((key,i)=>[key,(row[i]||'').trim()]))).map(e=>({...e,data:e.data?.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/,'$3-$2-$1')}));}
function failureReason(error){return Number.isInteger(error?.status)?`HTTP ${error.status}`:error?.name||'falha inesperada';}
async function getAgenda(env=process.env,fetcher=fetch){
  const csvFailures=[];
  for(const source of [...new Set([env.AGENDA_CSV_URL,OFFICIAL_CSV].filter(Boolean))]){
    try{
      const r=await fetcher(source,{signal:AbortSignal.timeout(15000),cache:'no-store'});
      if(!r.ok)throw Object.assign(Error(),{status:r.status});
      return {events:csvEvents(await r.text()),source:source===OFFICIAL_CSV?'agenda oficial':'agenda configurada'};
    }catch(error){csvFailures.push(failureReason(error));}
  }
  let apiFailure;
  try{
    const r=await fetcher(env.AGENDA_URL||'https://ccbagenda.vercel.app/api/events',{signal:AbortSignal.timeout(12000),cache:'no-store'});
    if(!r.ok)throw Object.assign(Error(),{status:r.status});
    const j=await r.json(),data=j.events||j.data;
    if(!Array.isArray(data))throw Error();
    return {events:data,source:'agenda'};
  }catch(error){apiFailure=failureReason(error);}
  console.error(`[agenda] Fonte CSV indisponível (${csvFailures.join(', ')||'não configurada'}); endpoint JSON indisponível (${apiFailure}).`);
  throw Object.assign(Error('A agenda está indisponível. Tente novamente mais tarde; a emissão depende de um exame confirmado.'),{status:503});
}
module.exports={parseCSV,csvEvents,getAgenda,OFFICIAL_CSV};
