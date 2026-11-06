const crypto=require('node:crypto');
function visitorSession(req,res,secret){
 const raw=req.headers.cookie?.match(/(?:^|;\s*)cartas_visitor=([^;]+)/)?.[1]||'';
 const [id,signature]=raw.split('.');
 const sign=value=>crypto.createHmac('sha256',secret).update(value).digest('hex');
 if(/^[a-f0-9-]{36}$/.test(id||'')&&/^[a-f0-9]{64}$/.test(signature||'')&&crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(sign(id))))return id;
 const fresh=crypto.randomUUID();res.setHeader('Set-Cookie',`cartas_visitor=${fresh}.${sign(fresh)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${process.env.NODE_ENV==='production'?'; Secure':''}`);return fresh;
}
module.exports={visitorSession};
