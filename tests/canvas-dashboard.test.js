'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {pathToFileURL}=require('node:url');
const extensionDir=path.join(__dirname,'..','.github','extensions','app-cartas-dashboard');

test('canvas mantém dados fora do script e notifica clientes após ação externa',async t=>{
 const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'cartas-canvas-test-'));
 t.after(()=>fs.rm(workspace,{recursive:true,force:true}));
 let source=await fs.readFile(path.join(extensionDir,'extension.mjs'),'utf8');
 source=source.replace("import { CanvasError, createCanvas, joinSession } from '@github/copilot-sdk/extension';","const { CanvasError, createCanvas, joinSession } = globalThis.__cartasCanvasTest;");
 for(const name of ['extension.json','storage.mjs','page.mjs'])source=source.replace(`'./${name}'`,JSON.stringify(pathToFileURL(path.join(extensionDir,name)).href));
 source=source.replace("const extensionDir = path.dirname(fileURLToPath(import.meta.url));",`const extensionDir = ${JSON.stringify(extensionDir)};`);
 source=source.replace("const projectRoot = path.resolve(extensionDir, '..', '..', '..');",`const projectRoot = ${JSON.stringify(workspace)};`);
 let canvas;
 globalThis.__cartasCanvasTest={CanvasError:class CanvasError extends Error{constructor(code,message){super(message);this.code=code;}},createCanvas:value=>value,joinSession:async({canvases})=>{canvas=canvases[0];return {};}};
 t.after(()=>{delete globalThis.__cartasCanvasTest;});
 await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const action=canvas.actions.find(item=>item.name==='save_record').handler;
 const malicious='</script><script>globalThis.injected=true</script>';
 await action({instanceId:'test',input:{name:malicious,common:'Comum',status:'pending'}});
 const {url}=await canvas.open({instanceId:'test',input:{label:'Teste'}});
 t.after(()=>canvas.onClose({instanceId:'test'}));
 const html=await(await fetch(url)).text();
 assert(!html.includes(malicious));assert(!html.includes('__INITIAL_RECORDS__'));
 const state=await(await fetch(new URL('api/state',url))).json();assert.equal(state.records[0].name,malicious);
 const response=await fetch(new URL('api/events',url)),reader=response.body.getReader();
 t.after(()=>reader.cancel());
 assert.match(Buffer.from((await reader.read()).value).toString(),/connected/);
 const update=reader.read();
 await action({instanceId:'test',input:{name:'Outro candidato',status:'received'}});
 const signal=await Promise.race([update,new Promise((_,reject)=>setTimeout(()=>reject(Error('Sem notificação')),2000))]);
 assert.match(Buffer.from(signal.value).toString(),/event: change/);
 const saved=await(await fetch(new URL('api/state',url))).json();assert.equal(saved.records.length,2);
});

test('canvas atualiza registros e barras com os dados recebidos',async()=>{
 const source=await fs.readFile(path.join(extensionDir,'client.js'),'utf8'),elements=new Map();
 function element(){return {children:[],dataset:{},classList:{add(){}},addEventListener(){},replaceChildren(){this.children=[];},append(...nodes){this.children.push(...nodes);},set innerHTML(value){this._html=value;},get innerHTML(){return this._html;}};}
 const document={querySelector(selector){if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);},createElement:()=>element()};
 let events,records=[{id:'one',name:'</script><script>perigo</script>',common:'Comum',status:'pending'}];
 class EventSource{constructor(){events=this;this.listeners={};}addEventListener(name,fn){this.listeners[name]=fn;}}
 vm.runInNewContext(source,{document,EventSource,fetch:async()=>({ok:true,json:async()=>({records})}),setTimeout(){},Object});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(elements.get('#total').textContent,1);assert.equal(elements.get('#pending').textContent,1);
 assert.equal(elements.get('#progress-pending').value,1);assert.equal(elements.get('#progress-pending').max,1);
 assert.equal(elements.get('#rows').children[0].children[0].textContent,records[0].name);
 records=[...records,{id:'two',name:'Outro',status:'received'}];events.listeners.change();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(elements.get('#total').textContent,2);assert.equal(elements.get('#received').textContent,1);
 assert.equal(elements.get('#progress-received').value,1);assert.equal(elements.get('#progress-received').max,2);
});
