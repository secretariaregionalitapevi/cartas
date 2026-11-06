const {norm,commonMatches}=require('./domain');
function matchesType(row,type){const musical=norm(row.cargo_ministerio),instrument=norm(row.instrumento);const organist=musical.includes('ORGANISTA')||/\bORGAO\b/.test(instrument);return type==='organista'?organist:!organist&&(!!instrument||/MUSICO|ENCARREGADO/.test(musical));}
const candidateLevels=new Set(['CANDIDATO','CANDIDATA','CANDIDATO A','CULTO OFICIAL','ENSAIO','MEIA HORA','RJM','RJM CULTO OFICIAL','RJM ENSAIO','RJM MEIA HORA']);
function eligibleLevel(row){return candidateLevels.has(norm(row.nivel));}
function searchPeople(rows,{common,type,query=''}){const terms=norm(query).split(' ').filter(Boolean);return rows.filter(r=>commonMatches(r.comum_congregacao,common)&&!['FALECIDO','EXCLUIDO'].includes(norm(r.status))&&(type==='musico'||norm(r.status)!=='INATIVO')&&eligibleLevel(r)&&matchesType(r,type)&&terms.every(t=>norm(r.nome_aluno).includes(t))).map(r=>({id:r.id,nome:r.nome_aluno,comum:r.comum_congregacao,municipio:r.municipio,instrumento:r.instrumento||'',tonalidade:r.tonalidade||'',nivel:r.nivel||'',status:r.status||''}));}
module.exports={searchPeople,matchesType,eligibleLevel};
