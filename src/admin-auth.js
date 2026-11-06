'use strict';
const crypto=require('node:crypto');
const {headers}=require('./store');
const {norm,cities}=require('./domain');
const COOKIE='cartas_admin_session',TTL=8*60*60;
const fail=(message,status=401)=>Object.assign(Error(message),{status});
function key(secret){return crypto.createHash('sha256').update('cartas-admin:v1:'+secret).digest();}
function sealSession(value,secret){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key(secret),iv);const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),body]).toString('base64url');}
function openSession(value,secret,now=Date.now()){try{if(!value||value.length>12000)return null;const raw=Buffer.from(value,'base64url'),decipher=crypto.createDecipheriv('aes-256-gcm',key(secret),raw.subarray(0,12));decipher.setAuthTag(raw.subarray(12,28));const data=JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)),decipher.final()]).toString('utf8'));if(!data.access_token||!data.refresh_token||!data.csrf||!Number.isFinite(data.started)||now-data.started>TTL*1000||data.started>now+60000)return null;return data;}catch{return null;}}
function sameOrigin(req){let origin;try{origin=new URL(req.headers.origin);}catch{throw fail('Origem da solicitação inválida.',403);}if(origin.host!==req.headers.host||!['http:','https:'].includes(origin.protocol))throw fail('Origem da solicitação inválida.',403);if(!(req.headers['content-type']||'').startsWith('application/json'))throw fail('Envie os dados no formato JSON.',415);}
function assertCSRF(req,session){const supplied=req.headers['x-csrf-token']||'';if(Buffer.byteLength(supplied)!==Buffer.byteLength(session.csrf)||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(session.csrf)))throw fail('A sessão mudou. Atualize a página e tente novamente.',403);}
function allowedProfile(profile,grants){
 if(!profile||profile.status!=='approved')throw fail('Seu cadastro ainda não foi aprovado para esta administração.',403);
 const role=Number(profile.role_id);if(![1,2,3].includes(role))throw fail('Solicite a liberação em nível Municipal e pasta Música na trilha de auditoria.',403);
 const sector=norm(profile.sector||profile.setor),global=role===1;
 const music=global||sector==='MUSICA'||['GLOBAL','ADMINISTRATIVO','ADMINISTRACAO'].includes(sector)||grants.some(r=>r.module==='musica'&&r.active===true);
 if(!music)throw fail('Seu cadastro não tem autorização para a pasta Música.',403);
 const city=cities.find(city=>norm(city)===norm(profile.municipio||profile.cidade));
 if(!city)throw fail('Seu município precisa ser confirmado pelo administrador na trilha de auditoria.',403);
 return {municipio:city,name:String(profile.full_name||profile.username||'Secretário da música')};
}
class AdminAuth{
 constructor(store,env=process.env){this.store=store;this.env=env;this.secret=env.ADMIN_SESSION_SECRET||store.key;this.attempts=new Map();}
 cookie(req){return openSession(req.headers.cookie?.match(/(?:^|;\s*)cartas_admin_session=([^;]+)/)?.[1],this.secret);}
 setCookie(res,session){res.setHeader('Set-Cookie',`${COOKIE}=${session?sealSession(session,this.secret):''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${session?TTL:0}${this.env.NODE_ENV==='production'?'; Secure':''}`);}
 async token(body){const r=await this.store.fetch(this.store.url+'/auth/v1/token?grant_type='+body.grant_type,{method:'POST',headers:{...headers(this.env.SUPABASE_PUBLISHABLE_KEY||this.env.SUPABASE_ANON_KEY||''),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});const data=await r.json().catch(()=>null);if(!r.ok||!data?.access_token||!data?.refresh_token)throw fail('Não foi possível entrar. Confira e-mail e senha.');return data;}
 async identity(accessToken){const user=await this.store.user(accessToken);if(!user?.id)throw fail('Sessão expirada. Entre novamente.');const [profile]=await this.store.rows('profiles',{user_id:'eq.'+user.id,select:'*'});let grants=[];if(norm(profile?.sector)!=='MUSICA'&&Number(profile?.role_id)!==1)grants=await this.store.rows('user_module_access',{user_id:'eq.'+user.id,active:'eq.true',select:'module,active'});return {id:user.id,email:user.email,...allowedProfile(profile,grants)};}
 async login(req,res,data){sameOrigin(req);const ip=req.socket?.remoteAddress||'unknown',now=Date.now(),entry=this.attempts.get(ip);if(entry&&now-entry.since<600000&&entry.count>=15)throw fail('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',429);if(!entry||now-entry.since>=600000)this.attempts.set(ip,{since:now,count:0});this.attempts.get(ip).count++;if(this.attempts.size>2000)for(const [key,e]of this.attempts)if(now-e.since>600000)this.attempts.delete(key);
 const email=String(data.email||'').trim().toLowerCase(),password=data.password;if(!email||email.length>254||typeof password!=='string'||!password||password.length>1024)throw fail('Informe e-mail e senha.',400);
 const tokens=await this.token({grant_type:'password',email,password});const identity=await this.identity(tokens.access_token);
 const session={access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_at:tokens.expires_at||Math.floor(now/1000)+(tokens.expires_in||3600),started:now,csrf:crypto.randomBytes(24).toString('hex')};this.setCookie(res,session);this.attempts.delete(ip);return {identity,session};}
 async require(req,res){const session=this.cookie(req);if(!session)throw fail('Entre para acessar a administração das cartas.');if(session.expires_at*1000<Date.now()+30000){let tokens;try{tokens=await this.token({grant_type:'refresh_token',refresh_token:session.refresh_token});}catch{this.setCookie(res,null);throw fail('Sessão expirada. Entre novamente.');}Object.assign(session,{access_token:tokens.access_token,refresh_token:tokens.refresh_token,expires_at:tokens.expires_at||Math.floor(Date.now()/1000)+(tokens.expires_in||3600)});this.setCookie(res,session);}const identity=await this.identity(session.access_token);return {identity,session};}
 async logout(req,res){sameOrigin(req);const session=this.cookie(req);if(session)await this.store.fetch(this.store.url+'/auth/v1/logout',{method:'POST',headers:{...headers(this.env.SUPABASE_PUBLISHABLE_KEY||this.env.SUPABASE_ANON_KEY||''),Authorization:'Bearer '+session.access_token},signal:AbortSignal.timeout(5000)}).catch(()=>{});this.setCookie(res,null);}
}
module.exports={AdminAuth,sealSession,openSession,allowedProfile,sameOrigin,assertCSRF};
