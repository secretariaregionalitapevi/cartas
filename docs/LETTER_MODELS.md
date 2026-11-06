# Modelos das cartas de exames

A geração preenche as bases de `data/letter-models`, derivadas dos sete Word fornecidos em MODELOS CARTAS IA. O PDF genérico com cabeçalho de relatório foi removido. Não é necessário Word ou LibreOffice em produção.

Correspondências: músico culto M02; músico oficialização M03; organista RJM, culto e oficialização M05 (cada arquivo conserva sua marcação); troca por necessidade e enfermidade M07 (cada arquivo conserva sua marcação).

Os quadros, logotipo, declarações, assinaturas e campos de resultado pertencem aos modelos. O exame continua no registro da carta; não é acrescentado um quadro extra ao PDF. Responsáveis e candidato são preenchidos a partir do snapshot salvo na emissão. O ano da saudação é dinâmico.

Correções de compatibilidade na preparação das bases: removido o recuo duplicado que cortava o título no próprio Word; ajustados somente parágrafos vazios que expandiam na conversão; rodapé isolado do M07 recolocado na mesma página. Os arquivos fornecidos em Downloads não foram alterados.

Campos de dados são removidos da base, não apenas cobertos visualmente. O preenchimento reduz a fonte dentro do espaço reservado quando necessário; se não houver espaço legível, a emissão retorna erro em vez de cortar o texto. A linha conjunta de encarregado regional/local continua conjunta, como no modelo.

Cartas já emitidas permanecem preservadas. A correção vale para novas emissões; não apaga registros nem contorna a proteção de duplicidade.

Validação: os sete modelos preenchidos foram renderizados e conferidos; teste automatizado de uma página para todas as modalidades, além dos testes de integração e domínio existentes.
## Revisão de espaços e downloads

Por solicitação do usuário, a revisão 2 amplia a área de assinatura do candidato, separa os quatro responsáveis em linhas próprias, elimina linhas duplicadas e mantém Sim/Não na mesma linha. Mantém os textos e a identidade dos modelos; os quadros inferiores são desenhados com medidas fixas para impedir quebras. Os nomes dos responsáveis usam fonte mínima legível. A saudação usa data por extenso com tamanho uniforme. O download privado conserva o nome CARTA MODALIDADE_ NOME _ COMUM.pdf, inclusive acentos.
