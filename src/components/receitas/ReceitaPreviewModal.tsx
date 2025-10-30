import { useState, useEffect, useCallback } from 'react';
import { X, Download, AlertCircle, ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatters } from '@/lib/formatters';

interface ReceitaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receitaId: string;
  receitaNome: string;
  onDownloadPDF: () => void;
}

interface ReceitaCompleta {
  id: string;
  nome: string;
  status: string;
  tipo_produto: string;
  rendimento_valor: number;
  rendimento_unidade: string;
  tempo_preparo_total: number;
  preco_venda: number;
  custo_mao_obra: number;
  imagem_url?: string;
  observacoes?: string;
  conservacao?: any;
  created_at: string;
  updated_at: string;
  markups?: {
    nome: string;
    tipo: string;
    margem_lucro: number;
    markup_aplicado: number;
  };
}

export function ReceitaPreviewModal({ open, onOpenChange, receitaId, receitaNome, onDownloadPDF }: ReceitaPreviewModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [receita, setReceita] = useState<any>(null);
  const [ingredientes, setIngredientes] = useState<any[]>([]);
  const [subReceitas, setSubReceitas] = useState<any[]>([]);
  const [embalagens, setEmbalagens] = useState<any[]>([]);
  const [maoObra, setMaoObra] = useState<any[]>([]);
  const [passosPreparo, setPassosPreparo] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Limpar estado quando modal fecha
  useEffect(() => {
    if (!open) {
      setReceita(null);
      setIngredientes([]);
      setSubReceitas([]);
      setEmbalagens([]);
      setMaoObra([]);
      setPassosPreparo([]);
      setLoading(true);
      setIsDownloading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && user?.id) {
      loadReceitaCompleta();
    }
  }, [open, user?.id, receitaId]);

  const loadReceitaCompleta = async () => {
    try {
      setLoading(true);

      // Buscar receita completa
      const { data: receitaData, error: receitaError } = await supabase
        .from('receitas')
        .select(`
          *,
          markups(nome, tipo, margem_lucro, markup_aplicado)
        `)
        .eq('id', receitaId)
        .eq('user_id', user?.id)
        .single();

      if (receitaError || !receitaData) {
        throw new Error('Erro ao carregar receita');
      }

      setReceita(receitaData);

      // Buscar ingredientes
      const { data: ingredientesData } = await supabase
        .from('receita_ingredientes')
        .select('*')
        .eq('receita_id', receitaId);
      setIngredientes(ingredientesData || []);

      // Buscar sub-receitas
      const { data: subReceitasData } = await supabase
        .from('receita_sub_receitas')
        .select('*')
        .eq('receita_id', receitaId);
      setSubReceitas(subReceitasData || []);

      // Buscar embalagens
      const { data: embalagensData } = await supabase
        .from('receita_embalagens')
        .select('*')
        .eq('receita_id', receitaId);
      setEmbalagens(embalagensData || []);

      // Buscar mão de obra
      const { data: maoObraData } = await supabase
        .from('receita_mao_obra')
        .select('*')
        .eq('receita_id', receitaId);
      setMaoObra(maoObraData || []);

      // Buscar passos de preparo
      const { data: passosData } = await supabase
        .from('receita_passos_preparo')
        .select('*')
        .eq('receita_id', receitaId)
        .order('ordem');
      setPassosPreparo(passosData || []);

    } catch (error) {
      console.error('Erro ao carregar receita:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da receita.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularCustos = () => {
    const subtotalIngredientes = ingredientes.reduce((sum, i) => sum + (i.custo_total || 0), 0);
    const subtotalSubReceitas = subReceitas.reduce((sum, s) => sum + (s.custo_total || 0), 0);
    const subtotalEmbalagens = embalagens.reduce((sum, e) => sum + (e.custo_total || 0), 0);
    const subtotalMaoObra = maoObra.reduce((sum, m) => sum + (m.valor_total || 0), 0);
    
    const custoTotal = subtotalIngredientes + subtotalSubReceitas + subtotalEmbalagens + subtotalMaoObra;
    const custoUnitario = custoTotal / (receita?.rendimento_valor || 1);
    const margem = receita?.preco_venda && receita.preco_venda > 0
      ? ((receita.preco_venda - custoTotal) / receita.preco_venda) * 100 
      : 0;
      
    return { 
      custoTotal, 
      custoUnitario, 
      margem, 
      subtotalIngredientes,
      subtotalSubReceitas, 
      subtotalEmbalagens,
      subtotalMaoObra 
    };
  };

  const handleDownloadPDF = useCallback(async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      await onDownloadPDF();
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, onDownloadPDF]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || !receita) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] h-[90vh]">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const custos = calcularCustos();

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-block {
            page-break-inside: avoid;
          }
        }
      `}</style>
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] h-[90vh] overflow-hidden flex flex-col">
          {/* Cabeçalho fixo */}
          <DialogHeader className="sticky top-0 bg-background z-10 border-b pb-4 flex-shrink-0">
            <div className="flex items-start gap-4">
              {/* Foto da receita */}
              {receita.imagem_url ? (
                <img 
                  src={receita.imagem_url} 
                  className="w-32 h-32 rounded-lg object-cover flex-shrink-0" 
                  alt={receita.nome}
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              
              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-2xl truncate">{receita.nome}</DialogTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant={receita.status === 'finalizada' ? 'default' : 'outline'}>
                    {receita.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}
                  </Badge>
                  <Badge variant="outline">{receita.tipo_produto}</Badge>
                  {receita.rendimento_valor && (
                    <Badge variant="secondary">
                      Rendimento: {formatters.quantidadeContinua(receita.rendimento_valor)} {receita.rendimento_unidade}
                    </Badge>
                  )}
                  {receita.tempo_preparo_total > 0 && (
                    <Badge variant="outline">
                      ⏱ {receita.tempo_preparo_total} min
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Criada: {formatDate(receita.created_at)} | Atualizada: {formatDate(receita.updated_at)}
                </p>
              </div>
              
              {/* Botões de ação */}
              <div className="flex gap-2 flex-shrink-0 no-print">
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Gerando...' : 'Baixar PDF'}
              </Button>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* Conteúdo rolável */}
          <ScrollArea className="flex-1 pr-4 print-container">
            <div className="space-y-6 py-4">
              {/* Bloco 1: Custos & Preços */}
              {(
                <Card className="print-block">
                  <CardHeader>
                    <CardTitle>💰 Custos & Preços</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Custo Total</p>
                        <p className="text-lg font-bold">{formatters.valor(custos.custoTotal)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Custo por Unidade</p>
                        <p className="text-lg font-bold">{formatters.valor(custos.custoUnitario)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Custo Mão de Obra</p>
                        <p className="text-lg font-bold">{formatters.valor(receita.custo_mao_obra || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Custo Embalagens</p>
                        <p className="text-lg font-bold">{formatters.valor(custos.subtotalEmbalagens)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Preço Sugerido</p>
                        <p className="text-lg font-bold">{formatters.valor(receita.preco_venda || 0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Margem</p>
                        <p className="text-lg font-bold">{formatters.percentual(custos.margem)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bloco 2: Ingredientes */}
              {ingredientes.length > 0 && (
                <Card className="print-block">
                  <CardHeader>
                    <CardTitle>🥘 Ingredientes ({ingredientes.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead>UM</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                          <TableHead className="text-right">Custo Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredientes.map(ing => (
                          <TableRow key={ing.id}>
                      <TableCell className="font-medium">
                        {ing.nome}
                              {(!ing.custo_unitario || ing.custo_unitario === 0) && (
                                <Badge variant="destructive" className="ml-2">Sem custo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatters.quantidadeContinua(ing.quantidade)}
                            </TableCell>
                            <TableCell>{ing.unidade}</TableCell>
                            <TableCell className="text-right">
                              {formatters.valor(ing.custo_unitario || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatters.valor(ing.custo_total || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4 pt-4 border-t">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Subtotal Ingredientes</p>
                        <p className="text-lg font-bold">{formatters.valor(custos.subtotalIngredientes)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bloco 3: Sub-receitas */}
              {subReceitas.length > 0 && (
                <Card className="print-block">
                  <CardHeader>
                    <CardTitle>📦 Sub-receitas ({subReceitas.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead>UM</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                          <TableHead className="text-right">Custo Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subReceitas.map(sub => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.nome}</TableCell>
                            <TableCell className="text-right">
                              {formatters.quantidadeContinua(sub.quantidade)}
                            </TableCell>
                            <TableCell>{sub.unidade}</TableCell>
                            <TableCell className="text-right">
                              {formatters.valor(sub.custo_unitario || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatters.valor(sub.custo_total || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4 pt-4 border-t">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Subtotal Sub-receitas</p>
                        <p className="text-lg font-bold">{formatters.valor(custos.subtotalSubReceitas)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bloco 4: Embalagens */}
              {embalagens.length > 0 && (
                <Card className="print-block">
                  <CardHeader>
                    <CardTitle>📦 Embalagens ({embalagens.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead>UM</TableHead>
                          <TableHead className="text-right">Custo Unit.</TableHead>
                          <TableHead className="text-right">Custo Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {embalagens.map(emb => (
                    <TableRow key={emb.id}>
                      <TableCell className="font-medium">{emb.nome}</TableCell>
                            <TableCell className="text-right">
                              {formatters.quantidadeContinua(emb.quantidade)}
                            </TableCell>
                            <TableCell>{emb.unidade}</TableCell>
                            <TableCell className="text-right">
                              {formatters.valor(emb.custo_unitario || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatters.valor(emb.custo_total || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4 pt-4 border-t">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Subtotal Embalagens</p>
                        <p className="text-lg font-bold">{formatters.valor(custos.subtotalEmbalagens)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bloco 5: Mão de Obra */}
              {maoObra.length > 0 && (
                <Card className="print-block">
                  <CardHeader>
                    <CardTitle>👷 Mão de Obra ({maoObra.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Cargo</TableHead>
                          <TableHead className="text-right">Tempo (min)</TableHead>
                          <TableHead className="text-right">Custo/Hora</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maoObra.map(mo => (
                          <TableRow key={mo.id}>
                            <TableCell>{mo.funcionario_nome}</TableCell>
                            <TableCell>{mo.funcionario_cargo}</TableCell>
                            <TableCell className="text-right">{mo.tempo}</TableCell>
                            <TableCell className="text-right">
                              {formatters.valor(mo.custo_por_hora || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatters.valor(mo.valor_total || 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4 pt-4 border-t">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Subtotal Mão de Obra</p>
                        <p className="text-lg font-bold">{formatters.valor(custos.subtotalMaoObra)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bloco 6: Modo de Preparo */}
              {passosPreparo.length > 0 && (
                <Card className="print-block">
                  <CardHeader>
                    <CardTitle>📝 Modo de Preparo ({passosPreparo.length} passos)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {passosPreparo.map((passo, idx) => (
                        <div key={passo.id} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm whitespace-pre-wrap">{passo.descricao}</p>
                            {passo.imagem_url && (
                              <img 
                                src={passo.imagem_url} 
                                className="mt-2 rounded-lg max-w-xs"
                                alt={`Passo ${idx + 1}`}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bloco 7: Conservação */}
              {receita.conservacao && Array.isArray(receita.conservacao) && receita.conservacao.length > 0 && (
                <Card className="print-block">
                  <CardHeader>
                    <CardTitle>❄️ Conservação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {receita.conservacao.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="font-medium flex-1">{item.descricao}</div>
                          {item.temperatura && (
                            <Badge variant="outline">{item.temperatura}°C</Badge>
                          )}
                          {item.tempo > 0 && (
                            <Badge variant="secondary">
                              {item.tempo} {item.unidade_tempo}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bloco 8: Observações */}
              {receita.observacoes && (
                <Card className="print-block">
                  <CardHeader>
                    <CardTitle>📌 Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{receita.observacoes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
