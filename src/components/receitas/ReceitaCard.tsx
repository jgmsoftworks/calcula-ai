import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Download, Eye, Package } from 'lucide-react';
import { useReceitas } from '@/hooks/useReceitas';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL, formatNumber } from '@/lib/formatters';
import type { ReceitaComDados } from '@/types/receitas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ReceitaCardProps {
  receita: ReceitaComDados;
  onEdit: (receita: ReceitaComDados) => void;
  onDelete: () => void;
}

export function ReceitaCard({ receita, onEdit, onDelete }: ReceitaCardProps) {
  const { deleteReceita } = useReceitas();
  const { user } = useAuth();
  const [markupDetalhes, setMarkupDetalhes] = useState<any>(null);

  const handleDelete = async () => {
    const success = await deleteReceita(receita.id);
    if (success) onDelete();
  };

  const custoTotal = (receita.custo_ingredientes || 0) + 
                     (receita.custo_embalagens || 0) + 
                     (receita.custo_mao_obra || 0) + 
                     (receita.custo_sub_receitas || 0);

  const lucroBruto = receita.preco_venda - custoTotal;

  // Buscar detalhes do markup se aplicável
  useEffect(() => {
    const carregarMarkupDetalhes = async () => {
      if (!receita.markup?.nome || !user) {
        setMarkupDetalhes(null);
        return;
      }
      
      const configKey = `markup_${receita.markup.nome.toLowerCase().replace(/\s+/g, '_')}`;
      
      const { data } = await supabase
        .from('user_configurations')
        .select('configuration')
        .eq('user_id', user.id)
        .eq('type', configKey)
        .maybeSingle();
      
      if (data?.configuration) {
        setMarkupDetalhes(data.configuration);
      } else {
        setMarkupDetalhes(null);
      }
    };
    
    carregarMarkupDetalhes();
  }, [receita.markup, user]);

  // Calcular lucro líquido baseado no markup
  const calcularLucroLiquido = () => {
    if (!markupDetalhes || !receita.markup) return 0;
    
    // Custo base por unidade
    const custoBase = receita.markup.tipo === 'sub_receita' 
      ? custoTotal
      : (receita.rendimento_valor > 0 ? custoTotal / receita.rendimento_valor : custoTotal);
    
    // Valor em real do bloco
    const valorEmRealBloco = markupDetalhes.valorEmReal || 0;
    
    // Gastos sobre faturamento
    const gastosReais = receita.preco_venda * ((markupDetalhes.gastoSobreFaturamento || 0) / 100);
    
    // Encargos percentuais
    const impostosReais = receita.preco_venda * ((markupDetalhes.impostos || 0) / 100);
    const taxasReais = receita.preco_venda * ((markupDetalhes.taxas || 0) / 100);
    const comissoesReais = receita.preco_venda * ((markupDetalhes.comissoes || 0) / 100);
    const outrosReais = receita.preco_venda * ((markupDetalhes.outros || 0) / 100);
    
    // Total de custos indiretos
    const totalCustosIndiretos = gastosReais + impostosReais + taxasReais + comissoesReais + outrosReais;
    
    // Custos diretos completos
    const custosDirectosCompletos = custoBase + valorEmRealBloco;
    
    // Lucro líquido = Preço - Custos Diretos - Custos Indiretos
    return receita.preco_venda - custosDirectosCompletos - totalCustosIndiretos;
  };

  const lucroLiquido = calcularLucroLiquido();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-6">
          {/* Número sequencial */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <span className="text-2xl font-bold">{receita.numero_sequencial}</span>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {receita.tipo_produto?.nome && (
                    <Badge className="bg-purple-500 text-white">
                      {receita.tipo_produto.nome}
                    </Badge>
                  )}
                  {receita.markup?.tipo === 'sub_receita' && (
                    <Badge className="bg-green-500 text-white flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Sub-receita
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-1">{receita.nome}</h3>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>Sub-receitas: {receita.total_sub_receitas || 0}</span>
                  <span>Rendimento: {receita.rendimento_valor || 0} {receita.rendimento_unidade || 'un'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Baixar">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Preview">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onEdit(receita)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir a receita "{receita.nome}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            {/* Grid de informações - 3 linhas */}
            <div className="space-y-3">
              {/* Linha 1 - Contadores */}
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Tempo Total</div>
                  <div className="font-semibold">{receita.tempo_preparo_total || 0} min</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Tempo M.O.</div>
                  <div className="font-semibold">{receita.tempo_preparo_mao_obra || 0} min</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Ingredientes</div>
                  <div className="font-semibold">{receita.total_ingredientes || 0}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Sub-receitas</div>
                  <div className="font-semibold">{receita.total_sub_receitas || 0}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Embalagens</div>
                  <div className="font-semibold">{receita.total_embalagens || 0}</div>
                </div>
              </div>

              {/* Linha 2 - Custos */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Custo M.O.</div>
                  <div className="font-semibold">R$ {formatBRL(receita.custo_mao_obra || 0)}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Custo Matéria-Prima</div>
                  <div className="font-semibold">R$ {formatBRL(receita.custo_ingredientes || 0)}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Custo Embalagem</div>
                  <div className="font-semibold">R$ {formatBRL(receita.custo_embalagens || 0)}</div>
                </div>
                <div className="text-center p-2 bg-primary text-primary-foreground rounded">
                  <div className="text-xs">Custo Total</div>
                  <div className="font-semibold">R$ {formatBRL(custoTotal)}</div>
                </div>
              </div>

              {/* Linha 3 - Rentabilidade */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Preço Venda</div>
                  <div className="font-semibold">R$ {formatBRL(receita.preco_venda)}</div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Lucro Bruto</div>
                  <div className={`font-semibold ${lucroBruto > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {formatBRL(lucroBruto)}
                  </div>
                </div>
                <div className="text-center p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Lucro Líquido</div>
                  <div className={`font-semibold ${lucroLiquido > 0 ? 'text-green-600' : lucroLiquido < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                    {markupDetalhes ? `R$ ${formatBRL(lucroLiquido)}` : '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
