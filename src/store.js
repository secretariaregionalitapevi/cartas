'use strict';
const {norm,commonMatches,administration,commonCode}=require('./domain');
function headers(key){return key.startsWith('sb_')?{apikey:key}:{apikey:key,Authorization:`Bearer ${key}`};}
class Store{
  constructor(env=process.env,fetcher=fetch){this.env=env;this.fetch=fetcher;this.url=env.SUPABASE_URL?.replace(/\/$/,'');this.key=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;}
  async api(route,{method='GET',body,directory=false,extra={}}={}){
    const url=directory?(this.env.DIRECTORY_SUPABASE_URL||this.url):this.url;
    const key=directory?(this.env.DIRECTORY_SUPABASE_SECRET_KEY||this.key):this.key;
    if(!url||!key)throw Object.assign(Error('Configure o Supabase no arquivo .env do servidor.'),{status:503});
    const r=await this.fetch(url.replace(/\/$/,'')+route,{method,headers:{...headers(key),'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    const data=r.status===204?null:await r.json().catch(()=>null);
    if(!r.ok)throw Object.assign(Error(r.status===409?'Registro já existente.':'Não foi possível consultar ou salvar os dados. Confira a configuração e a migração do banco.'),{status:r.status===409?409:503,code:data?.code});
    return data;
  }
  async rows(table,query={},directory=false){
    if(!/^[a-z_][a-z0-9_]*$/.test(table))throw Error('Tabela inválida');
    const all=[];for(let offset=0;;offset+=1000){const rows=await this.api(`/rest/v1/${table}?`+new URLSearchParams({select:'*',...query,limit:'1000',offset:String(offset)}),{directory});all.push(...rows);if(rows.length<1000)return all;}
  }
  async commons(){return (await this.rows(this.env.COMMONS_TABLE||'visitas_comuns',{},true)).map(r=>({comum:r.comum,municipio:r.cidade||r.municipio})).filter(r=>r.comum&&administration(r.municipio)).sort((a,b)=>a.comum.localeCompare(b.comum,'pt-BR'));}
  async people(common,type,query='',id=null){
    if(!['musico','organista'].includes(type)||!common)throw Object.assign(Error('Selecione o tipo de carta e a comum.'),{status:400});
    const code=commonCode(common);const params={select:'id,nome_aluno,comum_congregacao,municipio,instrumento,tonalidade,nivel,cargo_ministerio,status',order:'nome_aluno.asc,id.asc',comum_congregacao:/^BR-\d{2}-\d{4}$/.test(code)?'ilike.*'+code+'*':'eq.'+common};
    if(id){if(!/^[a-f0-9-]{36}$/i.test(id))return [];params.id='eq.'+id;}
    const rows=await this.rows('musica_acompanhamento_aluno',params,true);
    const {searchPeople}=require('./people');return searchPeople(rows,{common,type,query}).slice(0,20);
  }
  async ministry(common,city){
    const code=commonCode(common);
    const [record]=await this.rows('cartas_ministerio_comuns',{common_code:'eq.'+code,deleted_at:'is.null'},true);
    if(!record)return [];
    const labels={anciao:'ANCIÃO',cooperador:'COOPERADOR DO OFÍCIO',regional:'ENCARREGADO REGIONAL',encarregado:'ENCARREGADO LOCAL',secretario:'SECRETÁRIO DA MÚSICA'};
    return Object.entries(labels).filter(([key])=>String(record[key]||'').trim()).map(([key,label])=>({id:'carta:'+code+':'+key,nome:record[key],ministerio:label,comum:record.comum,municipio:record.municipio,assistencia:key==='anciao',source:'cartas_ministerio_comuns',source_sha256:record.source_sha256}));
  }
  async user(token){
    if(!token)return null;
    const r=await this.fetch(this.url+'/auth/v1/user',{headers:{...headers(this.env.SUPABASE_PUBLISHABLE_KEY||this.env.SUPABASE_ANON_KEY||''),Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
    return r.ok?r.json():null;
  }
  async reserve(record){
    try{return (await this.api('/rest/v1/cartas_emissoes',{method:'POST',body:record,extra:{Prefer:'return=representation'}}))[0];}
    catch(e){if(e.status!==409)throw e;const [old]=await this.rows('cartas_emissoes',{duplicate_key:`eq.${record.duplicate_key}`,deleted_at:'is.null'});
      if(old?.status==='failed'&&old.owner_session===record.owner_session){const [retry]=await this.api('/rest/v1/cartas_emissoes?'+new URLSearchParams({id:`eq.${old.id}`,status:'eq.failed'}),{method:'PATCH',body:{status:'processing',payload:record.payload,event_snapshot:record.event_snapshot,ministry_snapshot:record.ministry_snapshot},extra:{Prefer:'return=representation'}});if(retry)return retry;}
      throw Object.assign(Error('Esta carta já foi preenchida para esta pessoa, comum, modalidade e exame.'),{status:409,duplicate:old?{id:old.owner_session===record.owner_session?old.id:null,nome:old.nome,comum:old.comum,created_at:old.created_at,status:old.status}:null});
    }
  }
  async update(id,body){return this.api('/rest/v1/cartas_emissoes?id=eq.'+encodeURIComponent(id),{method:'PATCH',body});}
  async upload(path,pdf){const r=await this.fetch(`${this.url}/storage/v1/object/${this.env.STORAGE_BUCKET||'cartas-musicais'}/${path}`,{method:'POST',headers:{...headers(this.key),'Content-Type':'application/pdf','x-upsert':'true'},body:pdf,signal:AbortSignal.timeout(20000)});if(!r.ok)throw Object.assign(Error('Não foi possível armazenar o PDF. Tente novamente.'),{status:503});}
  async document(path){
    const safe=String(path).split('/').map(encodeURIComponent).join('/');
    const r=await this.fetch(`${this.url}/storage/v1/object/authenticated/${this.env.STORAGE_BUCKET||'cartas-musicais'}/${safe}`,{headers:headers(this.key),signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw Object.assign(Error('Não foi possível abrir o PDF.'),{status:503});
    return Buffer.from(await r.arrayBuffer());
  }
  async signed(path){const result=await this.api(`/storage/v1/object/sign/${this.env.STORAGE_BUCKET||'cartas-musicais'}/${path}`,{method:'POST',body:{expiresIn:120}});return this.url+'/storage/v1'+result.signedURL;}
}
module.exports={Store,headers};
