'use strict';
function parseCSV(text){
  const rows=[];let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if(/[\r\n]/.test(c)&&!quoted){if(value||row.length){row.push(value);rows.push(row);}row=[];value='';}else value+=c;}
  if(value||row.length){row.push(value);rows.push(row);}return rows;
}
function csvEvents(text){const rows=parseCSV(text);const header=(rows.shift()||[]).map(v=>v.replace(/^\uFEFF/,'').trim().toLowerCase());return rows.map(row=>Object.fromEntries(header.map((key,i)=>[key,(row[i]||'').trim()]))).map(e=>({...e,data:e.data?.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/,'$3-$2-$1')}));}
async function getAgenda(env=process.env,fetcher=fetch){
  try{const r=await fetcher(env.AGENDA_URL||'https://ccbagenda.vercel.app/api/events',{signal:AbortSignal.timeout(12000),cache:'no-store'});if(!r.ok)throw Error();const j=await r.json();const data=j.events||j.data;if(!Array.isArray(data))throw Error();return {events:data,source:'agenda'};}catch{
    if(env.AGENDA_CSV_URL){try{const r=await fetcher(env.AGENDA_CSV_URL,{signal:AbortSignal.timeout(15000),cache:'no-store'});if(!r.ok)throw Error();return {events:csvEvents(await r.text()),source:'fonte da agenda'};}catch{}}
    throw Object.assign(Error('A agenda está indisponível. Tente novamente mais tarde; a emissão depende de um exame confirmado.'),{status:503});
  }
}
module.exports={parseCSV,csvEvents,getAgenda};
