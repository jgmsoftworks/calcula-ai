import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { formatBRL } from '@/lib/formatters';
import type { ReceitaCompleta } from '@/types/receitas';
import { Clock, Package, Users, ChefHat } from 'lucide-react';

interface ReceitaPreviewModalProps {
  receita: ReceitaCompleta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceitaPreviewModal({ receita, open, onOpenChange }: ReceitaPreviewModalProps) {
  if (!receita) return null;

  // Calcular custos
  const custoIngredientes = receita.ingredientes.reduce((acc, ing) => {
    const produto = ing.produto;
    if (!produto) return acc;
    const fatorConversao = produto.fator_conversao || 1;
    const custoUnitario = produto.custo_unitario / fatorConversao;
    return acc + (ing.quantidade * custoUnitario);
  }, 0);

  const custoSubReceitas = receita.sub_receitas.reduce((acc, sr) => {
    const subReceita = sr.sub_receita;
    if (!subReceita || !subReceita.rendimento_valor) return acc;
    const custoUnitario = subReceita.preco_venda / subReceita.rendimento_valor;
    return acc + (sr.quantidade * custoUnitario);
  }, 0);

  const custoEmbalagens = receita.embalagens.reduce((acc, emb) => {
    const produto = emb.produto;
    if (!produto) return acc;
    const fatorConversao = produto.fator_conversao || 1;
    const custoUnitario = produto.custo_unitario / fatorConversao;
    return acc + (emb.quantidade * custoUnitario);
  }, 0);

  const custoMaoObra = receita.mao_obra.reduce((acc, mo) => acc + mo.valor_total, 0);

  const custoTotal = custoIngredientes + custoSubReceitas + custoEmbalagens + custoMaoObra;
  const precoVenda = receita.preco_venda || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] lg:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <ChefHat className="h-6 w-6" />
            Preview da Receita #{receita.numero_sequencial}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Foto do Produto */}
          {receita.imagem_url && (
            <div className="flex justify-center">
              <img
                src={receita.imagem_url}
                alt={receita.nome}
                className="rounded-lg max-w-md w-full h-auto object-cover shadow-lg"
              />
            </div>
          )}
          {/* Informações Gerais */}
          <section className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Informações Gerais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{receita.nome}</p>
              </div>
              {receita.tipo_produto && (
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Produto</p>
                  <p className="font-medium">{receita.tipo_produto.nome}</p>
                </div>
              )}
              {receita.rendimento_valor && (
                <div>
                  <p className="text-sm text-muted-foreground">Rendimento</p>
                  <p className="font-medium">
                    {receita.rendimento_valor} {receita.rendimento_unidade || 'unidades'}
                  </p>
                </div>
              )}
              {receita.tempo_preparo_total && receita.tempo_preparo_total > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Total de Preparo</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {receita.tempo_preparo_total} {receita.tempo_preparo_unidade || 'minutos'}
                  </p>
                </div>
              )}
              {receita.tempo_preparo_mao_obra && receita.tempo_preparo_mao_obra > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Tempo de Mão de Obra</p>
                  <p className="font-medium">{receita.tempo_preparo_mao_obra} minutos</p>
                </div>
              )}
              {receita.peso_unitario && receita.peso_unitario > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Peso Unitário</p>
                  <p className="font-medium">{receita.peso_unitario}g</p>
                </div>
              )}
            </div>
            {receita.observacoes && (
              <div className="mt-3">
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="text-sm mt-1">{receita.observacoes}</p>
              </div>
            )}
          </section>

          {/* Modo de Conservação */}
          {receita.conservacao && (
            receita.conservacao.congelado?.tempo > 0 ||
            receita.conservacao.refrigerado?.tempo > 0 ||
            receita.conservacao.ambiente?.tempo > 0
          ) && (
            <>
              <Separator />
              <section className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">Modo de Conservação</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {receita.conservacao.congelado?.tempo > 0 && (
                    <div className="border rounded-lg p-3 bg-background">
                      <p className="font-medium text-sm mb-2">🧊 Congelado</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Temperatura:</span>{' '}
                        {receita.conservacao.congelado.temperatura}°C
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Validade:</span>{' '}
                        {receita.conservacao.congelado.tempo} {receita.conservacao.congelado.unidade}
                      </p>
                    </div>
                  )}
                  
                  {receita.conservacao.refrigerado?.tempo > 0 && (
                    <div className="border rounded-lg p-3 bg-background">
                      <p className="font-medium text-sm mb-2">❄️ Refrigerado</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Temperatura:</span>{' '}
                        {receita.conservacao.refrigerado.temperatura}°C
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Validade:</span>{' '}
                        {receita.conservacao.refrigerado.tempo} {receita.conservacao.refrigerado.unidade}
                      </p>
                    </div>
                  )}
                  
                  {receita.conservacao.ambiente?.tempo > 0 && (
                    <div className="border rounded-lg p-3 bg-background">
                      <p className="font-medium text-sm mb-2">🌡️ Temperatura Ambiente</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Temperatura:</span>{' '}
                        {receita.conservacao.ambiente.temperatura}°C
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Validade:</span>{' '}
                        {receita.conservacao.ambiente.tempo} {receita.conservacao.ambiente.unidade}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          <Separator />

          {/* Ingredientes */}
          {receita.ingredientes.length > 0 && (
            <section>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ingredientes
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receita.ingredientes.map((ing) => {
                      const produto = ing.produto;
                      if (!produto) return null;
                      const fatorConversao = produto.fator_conversao || 1;
                      const custoUnitario = produto.custo_unitario / fatorConversao;
                      const custoTotal = ing.quantidade * custoUnitario;
                      return (
                        <TableRow key={ing.id}>
                          <TableCell>{produto.nome}</TableCell>
                          <TableCell className="text-right">{ing.quantidade}</TableCell>
                          <TableCell>{produto.unidade_uso || produto.unidade_compra}</TableCell>
                          <TableCell className="text-right">{formatBRL(custoUnitario)}</TableCell>
                          <TableCell className="text-right font-medium">{formatBRL(custoTotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">Total Ingredientes:</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(custoIngredientes)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </section>
          )}

          {/* Sub-receitas */}
          {receita.sub_receitas.length > 0 && (
            <section>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Sub-receitas
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Rendimento</TableHead>
                      <TableHead className="text-right">Preço/Unid.</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receita.sub_receitas.map((sr) => {
                      const subReceita = sr.sub_receita;
                      if (!subReceita || !subReceita.rendimento_valor) return null;
                      const custoUnitario = subReceita.preco_venda / subReceita.rendimento_valor;
                      const custoTotal = sr.quantidade * custoUnitario;
                      return (
                        <TableRow key={sr.id}>
                          <TableCell>{subReceita.nome}</TableCell>
                          <TableCell className="text-right">{sr.quantidade}</TableCell>
                          <TableCell>
                            {subReceita.rendimento_valor} {subReceita.rendimento_unidade || 'un'}
                          </TableCell>
                          <TableCell className="text-right">{formatBRL(custoUnitario)}</TableCell>
                          <TableCell className="text-right font-medium">{formatBRL(custoTotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">Total Sub-receitas:</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(custoSubReceitas)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </section>
          )}

          {/* Embalagens */}
          {receita.embalagens.length > 0 && (
            <section>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Embalagens
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Custo Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receita.embalagens.map((emb) => {
                      const produto = emb.produto;
                      if (!produto) return null;
                      const fatorConversao = produto.fator_conversao || 1;
                      const custoUnitario = produto.custo_unitario / fatorConversao;
                      const custoTotal = emb.quantidade * custoUnitario;
                      return (
                        <TableRow key={emb.id}>
                          <TableCell>{produto.nome}</TableCell>
                          <TableCell className="text-right">{emb.quantidade}</TableCell>
                          <TableCell>{produto.unidade_uso || produto.unidade_compra}</TableCell>
                          <TableCell className="text-right">{formatBRL(custoUnitario)}</TableCell>
                          <TableCell className="text-right font-medium">{formatBRL(custoTotal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">Total Embalagens:</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(custoEmbalagens)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </section>
          )}

          {/* Mão de Obra */}
          {receita.mao_obra.length > 0 && (
            <section>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Mão de Obra
              </h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead className="text-right">Tempo</TableHead>
                      <TableHead className="text-right">Custo/Hora</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receita.mao_obra.map((mo) => (
                      <TableRow key={mo.id}>
                        <TableCell>{mo.funcionario_nome}</TableCell>
                        <TableCell>{mo.funcionario_cargo}</TableCell>
                        <TableCell className="text-right">
                          {mo.tempo} {mo.unidade_tempo || 'min'}
                        </TableCell>
                        <TableCell className="text-right">{formatBRL(mo.custo_por_hora)}</TableCell>
                        <TableCell className="text-right font-medium">{formatBRL(mo.valor_total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">Total Mão de Obra:</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(custoMaoObra)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </section>
          )}

          {/* Passos de Preparo */}
          {receita.passos.length > 0 && (
            <section>
              <h3 className="font-semibold text-lg mb-3">Passos de Preparo</h3>
              <ol className="space-y-3 list-decimal list-inside">
                {receita.passos
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((passo) => (
                    <li key={passo.id} className="bg-muted/20 p-3 rounded-lg">
                      <span className="font-medium">{passo.descricao}</span>
                      {passo.imagem_url && (
                        <img
                          src={passo.imagem_url}
                          alt={`Passo ${passo.ordem}`}
                          className="mt-2 rounded-lg max-w-xs"
                        />
                      )}
                    </li>
                  ))}
              </ol>
            </section>
          )}

          <Separator />

          {/* Resumo Financeiro */}
          <section className="bg-primary/5 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Resumo Financeiro</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Ingredientes:</span>
                <span className="font-medium">{formatBRL(custoIngredientes)}</span>
              </div>
              {custoSubReceitas > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Sub-receitas:</span>
                  <span className="font-medium">{formatBRL(custoSubReceitas)}</span>
                </div>
              )}
              {custoEmbalagens > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Embalagens:</span>
                  <span className="font-medium">{formatBRL(custoEmbalagens)}</span>
                </div>
              )}
              {custoMaoObra > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Mão de Obra:</span>
                  <span className="font-medium">{formatBRL(custoMaoObra)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Custo Total:</span>
                <span className="font-bold">{formatBRL(custoTotal)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Preço de Venda:</span>
                <span className="font-bold">{formatBRL(precoVenda)}</span>
              </div>
              {receita.markup && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Markup aplicado:</span>
                  <span className="font-medium">{receita.markup.nome}</span>
                </div>
              )}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
