'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http');
const root=path.join(__dirname,'..');
const worker=fs.readFileSync(path.join(root,'public','sw.js'),'utf8');

function serviceWorker(fetch,caches){
 const listeners={};
 const self={location:{origin:'https://cartas.test'},addEventListener:(name,fn)=>{listeners[name]=fn;}};
 vm.runInNewContext(worker,{self,fetch,caches,URL,Response});
 return listeners;
}

test('PWA fornece manifesto e pagina offline pelo servidor',async()=>{
 const server=http.createServer(require('../src/server'));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(base+'/manifest.webmanifest');
  assert.match(response.headers.get('content-type'),/^application\/manifest\+json/);
  const manifest=await response.json();
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.start_url,'/');
  for(const icon of manifest.icons)assert.equal((await fetch(base+icon.src)).status,200);
  assert.equal((await fetch(base+'/offline.html')).status,200);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('worker so armazena pagina offline e nao intercepta API ou arquivos privados',async()=>{
 const added=[];
 const caches={open:async()=>({add:async url=>added.push(url)}),match:async()=>new Response('offline')};
 const handlers=serviceWorker(async()=>new Response('online'),caches);
 let installation;
 handlers.install({waitUntil:promise=>{installation=promise;}});
 await installation;
 assert.deepEqual(added,['/offline.html']);
 for(const request of [
  {method:'GET',mode:'navigate',url:'https://cartas.test/api/admin/letters/123/document'},
  {method:'GET',mode:'cors',url:'https://cartas.test/api/admin/session'},
  {method:'POST',mode:'cors',url:'https://cartas.test/api/letters'},
  {method:'GET',mode:'navigate',url:'https://other.test/'}
 ]){
  let intercepted=false;
  handlers.fetch({request,respondWith:()=>{intercepted=true;}});
  assert.equal(intercepted,false);
 }
});

test('navegacao usa rede e mostra pagina offline somente quando rede falha',async()=>{
 let online=true;
 const handlers=serviceWorker(async()=>{if(!online)throw Error('offline');return new Response('admin');},{match:async()=>new Response('offline')});
 const navigate=async()=>{
  let response;
  handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://cartas.test/admin'},respondWith:value=>{response=value;}});
  return (await response).text();
 };
 assert.equal(await navigate(),'admin');
 online=false;
 assert.equal(await navigate(),'offline');
});

test('instalacao so aparece quando disponivel e informa erro ao usuario',async()=>{
 const events={},clicks={},messages=[];
 const button={hidden:true,addEventListener:(name,fn)=>{clicks[name]=fn;}};
 const window={addEventListener:(name,fn)=>{events[name]=fn;},AppFeedback:{show:options=>messages.push(options)}};
 const document={querySelectorAll:()=>[button]};
 const navigator={serviceWorker:{register:async()=>({})}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'public','pwa.js'),'utf8'),{window,document,navigator,console:{warn(){}}});
 let prevented=false;
 events.beforeinstallprompt({preventDefault:()=>{prevented=true;},prompt:async()=>{throw Error('falhou');}});
 assert.equal(prevented,true);
 assert.equal(button.hidden,false);
 await clicks.click();
 assert.equal(button.hidden,true);
 assert.equal(messages[0].type,'error');
 assert.match(messages[0].message,/menu do navegador/);
});

test('instalação sincroniza múltiplos botões quando presentes',async()=>{
 const events={},buttons=Array.from({length:2},()=>({hidden:true,addEventListener(name,fn){this[name]=fn;}}));
 const window={addEventListener:(name,fn)=>{events[name]=fn;},AppFeedback:{show(){throw Error('Falha inesperada');}}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'public','pwa.js'),'utf8'),{window,document:{querySelectorAll:()=>buttons},navigator:{},console});
 let prompts=0;events.beforeinstallprompt({preventDefault(){},prompt:async()=>{prompts++;}});
 assert(buttons.every(button=>!button.hidden));
 await buttons[1].click();
 assert.equal(prompts,1);assert(buttons.every(button=>button.hidden));
});
