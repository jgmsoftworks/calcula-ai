# Entrada: prioridade ao formulário e mídia mais leve

## Referência publicada antes desta alteração

Commit: `b1b4804ef6b935c8c0af191378e4ebf67a38e8fb`.

PageSpeed Insights de `https://calculaaibr.com/`, em 21/10/2026, 13:36 de Brasília:

| Métrica | Celular | Computador |
| --- | ---: | ---: |
| Primeira pintura de conteúdo (FCP) | 3,7 s | 1,1 s |
| Maior pintura de conteúdo (LCP) | 5,7 s | 1,3 s |
| Nota de desempenho | 67 | 85 |
| Transferência total | 2.893 KiB | 2.892 KiB |

[Relatório mobile](https://pagespeed.web.dev/analysis/https-calculaaibr-com/v2ne37hr5u?form_factor=mobile)
e [desktop](https://pagespeed.web.dev/analysis/https-calculaaibr-com/v2ne37hr5u?form_factor=desktop).

Uma execução por perfil, sem dados CrUX. Mobile: Moto G Power simulado, 4G lento, Lighthouse 13.5.0. LCP mede a pintura do maior elemento, não o término de todos os carregamentos. As telas autenticadas não foram medidas neste teste.

## O que muda para a pessoa

- No celular, o formulário aparece antes do mascote; o mascote permanece abaixo. No desktop, as duas colunas continuam lado a lado.
- O vídeo só recebe uma URL quando pelo menos 20% de sua área está visível, a aba está ativa e os recursos iniciais do documento terminaram de carregar. O início espera uma oportunidade ociosa do navegador (prazo de 2 s) ou 500 ms em navegadores sem essa API.
- Se o mascote estiver fora da tela, seu vídeo não é solicitado. Em telas altas nas quais ele já esteja visível, pode começar sem uma rolagem, depois das condições acima.
- A animação pausa fora da área visível ou ao sair da aba. Preferência por menos movimento, economia de dados ou conexão classificada como 2G mantêm a imagem estática. Uma preferência alterada depois do início pausa/oculta o vídeo, mas não desfaz bytes já transferidos.
- A logo continua com o mesmo desenho e cores; usa resolução adequada ao tamanho exibido. O vídeo mantém os três clipes, transições, duração, resolução e quadros por segundo, com compressão maior.
- A imagem estática tem carregamento adiado e prioridade baixa; a logo do formulário tem prioridade alta. Os arquivos usados pela entrada recebem nomes com hash no build para versionamento.

## Redução comprovada nos arquivos

Valores em bytes dos arquivos locais; não são uma medição de tempo nem uma redução de todo o aplicativo.

| Arquivo usado na entrada | Antes | Agora | Redução |
| --- | ---: | ---: | ---: |
| Logo | 361.885 | 42.236 | 88,33% |
| Vídeo | 2.187.360 | 1.393.403 | 36,30% |
| Imagem estática | 37.556 | 37.556 | 0% |
| Total dessas três mídias | 2.586.801 | 1.473.195 | 43,05% |

Logo: PNG 1536 × 483 para WebP lossless 512 × 161, redimensionado com Lanczos. Vídeo: H.264, 720 × 1112, 24 fps, 28,5 s, CRF 29, faststart. A imagem estática foi copiada sem alteração. Os arquivos públicos anteriores permanecem disponíveis para outros usos e reversão.

## Verificação

- 157 testes passaram em 29 arquivos, incluindo 12 cenários de carregamento, visibilidade, preferências, bloqueio de autoplay e desmontagem da animação; os seis testes existentes da entrada também passaram.
- TypeScript sem erros e build de produção concluído. Manifesto contém as três mídias novas com hash.
- Conferência visual da logo e de um quadro do vídeo original/otimizado; metadados confirmam a mesma duração, resolução e taxa de quadros do vídeo.
- Autenticação, dados e cálculos não receberam alterações.

O ambiente local precisou de `npm install --legacy-peer-deps --no-package-lock` e instalação local, sem salvar, de `@testing-library/dom@10.4.1`: o `npm ci` já encontrava divergências entre o manifesto e o lock e conflito de peer dependency de tradução. Nenhum manifesto ou lock foi modificado nesta entrega. A validação local não equivale à reprodução exata das dependências do ambiente da Lovable.

## Depois da publicação pelo responsável

Repetir PageSpeed no mesmo endereço, em mobile e desktop, comparar com os valores acima e conferir o login no celular. Não há ainda um resultado publicado para esta alteração; não afirmar ganho em segundos ou nova nota antes dessa medição. A medição de estoque, receitas e movimentação exige uma sessão autenticada e continua separada desta entrega.
