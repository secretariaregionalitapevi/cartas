'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createAdminHandler}=require('../src/admin-router');
async function config(env){let result;const handler=createAdminHandler({},env,{auth:{},management:{}});await handler({method:'GET',headers:{}},{setHeader(){},writeHead(status){assert.equal(status,200);},end(body){result=JSON.parse(body);}},new URL('https://cartas.test/api/admin/config'));return result;}
test('autocadastro tem endereco direto inclusive em producao sem configuracao extra',async()=>{const result=await config({NODE_ENV:'production'});assert.equal(result.registration_url,'https://appvisitasregional.vercel.app/user/cadastro?origem=cartas');});
test('autocadastro respeita portal configurado e usa servidor regional em desenvolvimento',async()=>{assert.equal((await config({REGIONAL_PORTAL_URL:'https://regional.test'})).registration_url,'https://regional.test/user/cadastro?origem=cartas');assert.equal((await config({})).registration_url,'http://127.0.0.1:8000/user/cadastro?origem=cartas');});
test('login usa feedback compartilhado e cadastro visivel antes de consultar configuracao',()=>{const html=fs.readFileSync(path.join(__dirname,'../public/admin.html'),'utf8'),js=fs.readFileSync(path.join(__dirname,'../public/admin.js'),'utf8');assert.match(html,/app-feedback\.js/);assert.match(html,/id="admin-register" href="https:\/\//);assert(!html.includes('Solicite o endereço de cadastro'));assert(!html.includes('id="admin-feedback"'));assert.match(js,/AppFeedback\.show/);assert.match(js,/toast:true/);assert(!js.includes("$('admin-feedback')"));assert.match(js,/signinOriginal/);});
test('campos de acesso mantem identificacao acessivel sem rotulos visiveis',()=>{const html=fs.readFileSync(path.join(__dirname,'../public/admin.html'),'utf8');for(const id of ['admin-email','admin-password']){assert.doesNotMatch(html,new RegExp('<label\\s+for="'+id+'"'));assert.match(html,new RegExp('<input\\s+id="'+id+'"[^>]*aria-label="[^"]+"'));}});
test('cabeçalho do login não mostra voltar nem instalação, mantida no menu administrativo',()=>{const html=fs.readFileSync(path.join(__dirname,'../public/admin.html'),'utf8'),header=html.match(/<header class="admin-top">([\s\S]*?)<\/header>/)[1],menu=html.match(/<nav class="admin-bottom"[\s\S]*?<\/nav>/)[0];assert.doesNotMatch(header,/<button|admin-back|install-app/);assert.match(header,/<a href="\/" class="brand">/);assert.match(menu,/<button class="install-app" type="button" hidden>/);assert.match(menu,/<span>Instalar<\/span>/);});
test('menu mantém Instalar antes de Sair, que permanece por último',()=>{const html=fs.readFileSync(path.join(__dirname,'../public/admin.html'),'utf8'),menu=html.match(/<nav class="admin-bottom"[\s\S]*?<\/nav>/)[0];assert.match(menu,/class="install-app"[\s\S]*id="admin-logout"[\s\S]*<\/button><\/nav>$/);});
test('identidade mostra cargo no login e na sessão, sem exibir o e-mail',async()=>{
 const vm=require('node:vm'),html=fs.readFileSync(path.join(__dirname,'../public/admin.html'),'utf8'),js=fs.readFileSync(path.join(__dirname,'../public/admin.js'),'utf8');
 assert.match(html,/id="admin-user-cargo"/);assert.doesNotMatch(html,/id="admin-user-email"/);
 for(const [route,cargo,expected] of [['session','<b>Organista</b>','<b>Organista</b>'],['login',null,'Cargo não informado']]){
  const elements={};const document={getElementById(id){return elements[id]||(elements[id]={value:'',textContent:'',innerHTML:'',hidden:false});},querySelectorAll(){return [];},querySelector(){return {value:'musico'};}};
  const user={name:'Pessoa Exemplo',municipio:'Itapevi',email:'email@example.test',cargo};
  const fetch=async url=>({ok:!url.endsWith('session')||route==='session',json:async()=>url.endsWith('config')?{}:url.endsWith('events')?{events:[]}:url.endsWith('session')&&route==='login'?{error:'Sem sessão'}:{user,csrf:'token'}});
  vm.runInNewContext(js,{document,fetch,URLSearchParams,Intl,Date,setTimeout,clearTimeout,AppFeedback:{show:()=>({close(){}})}});
  await new Promise(resolve=>setImmediate(resolve));
  if(route==='login')await elements['admin-login-form'].onsubmit({preventDefault(){}});
  assert.equal(elements['admin-user-cargo'].textContent,expected);assert.equal(elements['admin-name'].textContent,user.name);assert.equal(elements['admin-workspace'].hidden,false);
 }
});
