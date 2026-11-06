# Cartas musicais - Regional Itapevi

Aplicativo independente salvo em APP_CARTAS. Node.js 22, sessão assinada no servidor e armazenamento privado. Os sete Word recebidos estão preservados em data/modelos.

## Para usar

1. Executar scripts/001_cartas.sql no SQL Editor do Supabase configurado no .env. Ainda não aplicado: a chave disponível é de API, sem acesso ao SQL Editor.
2. Executar npm.cmd start nesta pasta.
3. Abrir http://127.0.0.1:3010 no navegador externo sem cadastro de usuário ou senha.

A conexão local já está configurada no .env. Nunca publicar ou compartilhar esse arquivo. Em produção, cadastrar as variáveis no provedor e definir NODE_ENV=production. Configuração Vercel incluída.

## Funcionamento

Administração → exame futuro → comum e identificação → ministério → revisão → emissão → Minhas cartas.

São quatro administrações: Cotia / Caucaia / VGP; Itapevi; Jandira; Santana / Pirapora. Fazendinha pertence à administração Santana / Pirapora, conforme o cadastro existente.

A agenda oficial é carregada primeiro pela fonte CSV ao vivo usada pelo sistema regional; o endpoint JSON é apenas reserva. A agenda é filtrada por administração e data, e músicos/organistas são filtrados sem distinguir avaliação de pré-avaliação para escolher o modelo. O evento é revalidado na emissão. Sem fonte disponível, a emissão é bloqueada.

Comuns: visitas_comuns. Ministério espiritual: ministerio_regional. Encarregados: musica_acompanhamento_aluno. Cooperadores de jovens não substituem cooperadores de ofício ministerial. Todos os responsáveis do item 3 devem constar na relação de assinaturas antes de emitir. Sem cooperador informado, usar o texto autorizado “Sem Cooperador do Ofício”.

Cada carta preserva o evento, os dados e os responsáveis da emissão. Bucket cartas-musicais privado; PDF acessível somente ao navegador que emitiu a carta (sessão privada de 30 dias), por link de 120 segundos. Inclusões e alterações ficam na auditoria.

Duplicidade protegida por restrição única no banco: pessoa normalizada + código da comum + tipo + modalidade + exame. Outro exame ou modalidade é permitido. Dois envios simultâneos não criam duas cartas. Nomes diferentes não são unidos por aproximação; homônimos exigem conferência humana.

Falhas permitem nova tentativa do mesmo usuário. Registros interrompidos em processing exigem conferência administrativa antes de alterar para failed e reenviar. Não apagar um registro sem conferir seu PDF.

## Modelos disponíveis

Músicos: culto oficial, oficialização, troca por necessidade e troca por enfermidade. Organistas: RJM, culto oficial e oficialização. Eventos de pré-avaliação usam os mesmos modelos de carta das avaliações, pela modalidade escolhida (RJM, culto oficial ou oficialização). Não existem modalidades separadas de carta de pré-avaliação. A opção por chance permanece pendente de modelo.

O gerador usa os textos de autorização e declaração extraídos dos modelos originais, em composição PDF institucional. Não simula assinaturas ou resultados. Não altera os fluxos n8n/Typebot e não envia mensagens por WhatsApp/e-mail automaticamente.

## Testes

npm.cmd test

Os testes verificam os agrupamentos, filtros de agenda, normalização de duplicidade e conflitos no banco. artifacts contém apenas PDFs fictícios para conferência local e não integra o deploy. Após aplicar o SQL, validar uma emissão com uma sessão de teste antes de publicar.
A tela inicial reutiliza o HTML, os estilos e o logotipo reais do APP_VISITAS. O acesso começa diretamente por município, exame e comum. Limpar os cookies remove o acesso do navegador ao seu histórico; o registro e o PDF continuam conservados no banco.

## Consulta do candidato e compatibilidade n8n
A tela começa com a escolha explícita de carta de músico ou organista. Os exames são filtrados por essa escolha. A identificação consulta musica_acompanhamento_aluno, a mesma tabela usada pelo GEM do APP_GLOBAL, e exige a seleção de um registro da comum. Nome, instrumento e tonalidade são conferidos no servidor antes da emissão. Não há criação automática de pessoas.

O registro da carta inclui payload.n8n com flow (musicos/organistas) e body compatível com os campos e valores dos switches dos fluxos recebidos. Isso preserva o contrato; não significa que os webhooks foram chamados. Os fluxos externos não foram alterados, ativados ou executados pelo aplicativo.

A busca de candidatos aceita apenas níveis de culto oficial ou inferiores (incluindo RJM, ensaio, meia hora e candidato). Oficializados, níveis mistos com oficialização e cadastros sem nível confirmado não aparecem. A mesma regra é revalidada pelo servidor ao emitir a carta.

## Painel do sistema principal
A gestão está em /musica/cartas-exames/ no APP_VISITAS_CCB. A migração 039 é autocontida e instala a estrutura compartilhada. A relação ministerial foi importada da planilha enviada: o ancião da assistência é preservado por comum. O item 3 é obrigatório na interface e no servidor. As cartas mantêm a cópia dos responsáveis da emissão. Confirmação de resultados exige secretário da música ou gestão regional, respeita o escopo territorial e atualiza carta, exame e contagem em uma transação auditada.
