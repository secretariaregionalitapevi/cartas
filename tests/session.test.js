const {test}=require('node:test'),assert=require('node:assert/strict');
const {visitorSession}=require('../src/session');
test('sessao publica mantem identidade assinada e nao aceita identidade adulterada',()=>{
 let cookie;const res={setHeader:(k,v)=>cookie=v};const id=visitorSession({headers:{}},res,'secret');assert.ok(cookie.includes('HttpOnly'));const stored=cookie.split(';')[0];assert.equal(visitorSession({headers:{cookie:stored}},res,'secret'),id);const forged=stored.replace(id,'00000000-0000-4000-8000-000000000001');assert.notEqual(visitorSession({headers:{cookie:forged}},res,'secret'),id);
});
