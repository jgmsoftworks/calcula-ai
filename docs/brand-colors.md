# Cores da Calcula Aí

Fonte: manual da marca fornecido pelo responsável pelo produto em 21/10/2026.

| Cor | Hex | Token canônico |
| --- | --- | --- |
| Azure vívido | `#0483e4` | `--brand-azure` |
| Azul | `#2c4dc7` | `--brand-blue` |
| Roxo | `#7328b1` | `--brand-purple` |
| Rosa neon vívido | `#af1188` | `--brand-magenta` |
| Rosa vívido | `#dd0b52` | `--brand-rose` |
| Laranja | `#f96e0c` | `--brand-orange` |

O manual também define preto `#000000` e amarelo claro `#efeeea` como cores de apoio.

Os tokens canônicos estão em `src/index.css`, em HSL equivalente aos hexadecimais oficiais. Não inventar novos matizes nem clarear as cores de marca no tema escuro. Os tokens semânticos devem referenciar a paleta canônica.

Por orientação do responsável pelo produto, os campos usam azure no foco e roxo na seleção. Não usar laranja como destaque dos inputs e selects. Ao reaproveitar componentes da GSA, importar o comportamento e a estrutura visual, mantendo a paleta da Calcula Aí.

Gradientes de marca seguem da esquerda para a direita, respeitando a sequência azure → azul → roxo → rosa neon → rosa → laranja. Cores também podem ser usadas individualmente.
