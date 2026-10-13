# Cadastro nutricional no estoque — etapa 1

## Escopo

- Nova guia no formulário de produto. `Adicionar rótulo nutricional` inicia uma linha; `Adicionar linha` continua o cadastro. Câmera ao lado, sem seleção de modo de entrada.
- Quantidade/unidade de referência e rótulos separados por marca. Nutrientes e unidades podem ser digitados livremente, com sugestões opcionais. Campos vazios são `null`; zero declarado permanece zero. Cadastro incompleto pode ser salvo. Evolução descrita em `stock-nutrition-brands.md`.
- Valores e metadados são salvos no mesmo INSERT/UPDATE do produto. Custos, estoque e dados de receitas não são alterados pelo recurso.
- Foto privada persistida ao salvar. O botão de câmera usa o seletor de imagens do aparelho (JPG, PNG ou WebP, até 8 MB).
- OCR Tesseract.js 7.0.0 carregado sob demanda. Processamento no navegador, com cancelamento e limite de 60 segundos. Recursos de execução/idioma são baixados do jsDelivr nas versões configuradas pela biblioteca. Não usa serviços de IA ou créditos da Lovable.
- A importação é assistida: exige conferência. Colunas/unidades incertas ficam sem quantidade. Campos existentes não são sobrescritos; referências diferentes não são combinadas. A imagem continua disponível se a leitura falhar.
- A confirmação do usuário significa apenas que ele conferiu a transcrição. Não representa revisão profissional, certificação ou autorização de rotulagem.

## Persistência e acesso

`produtos.rotulo_nutricional` é o JSON da primeira versão, mantido para compatibilidade. A versão atual salva a coleção por marca em `produtos.rotulos_nutricionais`. A constraint valida estrutura, unidades, valores, duplicidades, prefixo do proprietário da foto e integridade do estado `conferido`. O acesso continua sujeito às políticas de proprietário já existentes em `produtos`.

Bucket privado `rotulos-nutricionais`: caminhos exclusivos por usuário; leitura por URL assinada; INSERT/SELECT/DELETE restritos ao proprietário. Arquivos são novos a cada envio, sem permissão de sobrescrita. Upload falho impede concluir o salvamento; gravação de produto malsucedida remove o novo arquivo. A foto substituída é removida após a gravação bem-sucedida.

Migração aplicada: `20261012225119_add_stock_nutrition_label.sql`.

## Verificação

- Testes de edição por linhas, zero versus ausência, reabertura, importação, falha/cancelamento da leitura e preservação de valores manuais.
- Testes com o formulário real confirmam que o rótulo é enviado junto com o produto e preservado ao salvar outra guia.
- Verificação SQL em transação revertida: leitura/gravação pelo proprietário, bloqueio de dados inválidos, preservação do custo, bloqueio de acesso entre contas a produtos e metadados de fotos. Nenhum dado de teste permaneceu salvo.
- Advisors de segurança sem novos achados em relação à execução anterior à migração.
- OCR executado sobre uma imagem sintética em português. Erros de reconhecimento de unidades foram mantidos como campos pendentes.
- TypeScript e compilação de produção verificados. O cadastro agora usa uma página com três guias, com Modo de Uso junto de Estoque & Custos. Verificação responsiva documentada em `stock-product-editor.md`; teste em aparelhos físicos permanece para a revisão da interface.

## Próximas etapas

O cadastro ainda não gera etiqueta de receita, não calcula composição nutricional e não autoriza selos/alegações. Esses fluxos, regras técnicas, revisão profissional e termos serão desenvolvidos separadamente.
