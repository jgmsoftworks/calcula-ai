import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Download, Eye, Package, Copy, Clock, Users, Layers, BoxSelect, Tag, TrendingUp, Loader2 } from 'lucide-react';
import { useReceitas } from '@/hooks/useReceitas';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useExportReceitaPDF } from '@/hooks/useExportReceitaPDF';
import { supabase } from '@/integrations/supabase/client';
import { formatBRL } from '@/lib/formatters';
import type { ReceitaComDados, ReceitaCompleta } from '@/types/receitas';
import { ReceitaPreviewModal } from './ReceitaPreviewModal';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ReceitaCardProps {
  receita: ReceitaComDados;
  onEdit: (receita: ReceitaComDados) => void;
  onDelete: () => void;
  preloadedDetalhes?: any | null;
  isLoadingPreloaded?: boolean;
}

export function ReceitaCard({ receita, onEdit, onDelete, preloadedDetalhes, isLoadingPreloaded }: ReceitaCardProps) {
  const { deleteReceita, fetchReceitaCompleta, duplicarReceita } = useReceitas();
  const { user } = useAuth();
  const { exportarReceitaPDF, exporting: exportingPDF } = useExportReceitaPDF();
  const [markupDetalhes, setMarkupDetalhes] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [receitaCompleta, setReceitaCompleta] = useState<ReceitaCompleta | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [isLoadingDetalhes, setIsLoadingDetalhes] = useState(true);

  const handleDelete = async () => {
    const success = await deleteReceita(receita.id);
    if (success) onDelete();
  };

  const custoTotal = (receita.custo_ingredientes || 0) + 
                     (receita.custo_embalagens || 0) + 
                     (receita.custo_mao_obra || 0) + 
                     (receita.custo_sub_receitas || 0);

  const lucroBruto = receita.preco_venda - custoTotal;

  // Use preloaded data if available, otherwise fallback to individual fetch
  useEffect(() => {
    if (preloadedDetalhes !== undefined) {
      // Data provided by parent
      setMarkupDetalhes(preloadedDetalhes);
      setIsLoadingDetalhes(isLoadingPreloaded || false);
      return;
    }
    
    // Fallback: fetch individually
    const carregarMarkupDetalhes = async () => {
      if (!receita.markup?.nome || !user) {
        setMarkupDetalhes(null);
        setIsLoadingDetalhes(false);
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
      setIsLoadingDetalhes(false);
    };
    carregarMarkupDetalhes();
  }, [receita.markup, user, preloadedDetalhes, isLoadingPreloaded]);

  const calcularLucroLiquido = () => {
    if (!markupDetalhes || !receita.markup) return 0;
    const custoBase = receita.markup.tipo === 'sub_receita' 
      ? custoTotal
      : (receita.rendimento_valor > 0 ? custoTotal / receita.rendimento_valor : custoTotal);
    const valorEmRealBloco = markupDetalhes.valorEmReal || 0;
    const gastosReais = receita.preco_venda * ((markupDetalhes.gastoSobreFaturamento || 0) / 100);
    const impostosReais = receita.preco_venda * ((markupDetalhes.impostos || 0) / 100);
    const taxasReais = receita.preco_venda * ((markupDetalhes.taxas || 0) / 100);
    const comissoesReais = receita.preco_venda * ((markupDetalhes.comissoes || 0) / 100);
    const outrosReais = receita.preco_venda * ((markupDetalhes.outros || 0) / 100);
    const totalCustosIndiretos = gastosReais + impostosReais + taxasReais + comissoesReais + outrosReais;
    const custosDirectosCompletos = custoBase + valorEmRealBloco;
    return receita.preco_venda - custosDirectosCompletos - totalCustosIndiretos;
  };

  const lucroLiquido = calcularLucroLiquido();

  const handleOpenPreview = async () => {
    setLoadingPreview(true);
    try {
      const dados = await fetchReceitaCompleta(receita.id);
      if (dados) {
        setReceitaCompleta(dados);
        setPreviewOpen(true);
      }
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownloadPDF = async () => {
    await exportarReceitaPDF(receita.id);
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const success = await duplicarReceita(receita.id);
      if (success) onDelete();
    } finally {
      setDuplicating(false);
    }
  };

  const isSubReceita = receita.markup?.tipo === 'sub_receita';

  const ActionButton = ({ icon: Icon, title, onClick, disabled, variant = "ghost" }: any) => (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={variant} 
            size="icon" 
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80"
            onClick={onClick}
            disabled={disabled}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p className="text-xs">{title}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden border-border/40">
      <CardContent className="p-0">
        {/* Top gradient accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-[hsl(205,96%,46%)] via-[hsl(273,63%,42%)] to-[hsl(25,95%,51%)]" />
        
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start gap-4 mb-4">
            {/* Number badge */}
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-xl font-bold font-display">{receita.numero_sequencial}</span>
            </div>

            {/* Title & meta */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold font-display truncate">{receita.nome}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {receita.tipo_produto?.nome && (
                  <Badge variant="secondary" className="text-xs font-medium bg-accent/10 text-accent border-accent/20 gap-1">
                    <Tag className="h-3 w-3" />
                    {receita.tipo_produto.nome}
                  </Badge>
                )}
                {isSubReceita && (
                  <Badge className="text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 gap-1" variant="outline">
                    <Package className="h-3 w-3" />
                    Sub-receita
                  </Badge>
                )}
                {receita.markup?.nome && !isSubReceita && (
                  <Badge variant="outline" className="text-xs font-medium bg-primary/5 text-primary border-primary/20 gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {receita.markup.nome}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Rend: {receita.rendimento_valor || 0} {receita.rendimento_unidade || 'un'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
              <ActionButton icon={Download} title="Baixar PDF" onClick={handleDownloadPDF} disabled={exportingPDF} />
              <ActionButton icon={Eye} title="Visualizar" onClick={handleOpenPreview} disabled={loadingPreview} />
              <ActionButton icon={Edit} title="Editar" onClick={() => onEdit(receita)} />
              <ActionButton icon={Copy} title="Duplicar" onClick={handleDuplicate} disabled={duplicating} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <span><ActionButton icon={Trash2} title="Excluir" /></span>
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
                    <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Stats pills row */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <StatPill icon={Clock} label="Tempo" value={`${receita.tempo_preparo_total || 0} min`} />
            <StatPill icon={Users} label="M.O." value={`${receita.tempo_preparo_mao_obra || 0} min`} />
            <StatPill label="Ingredientes" value={receita.total_ingredientes || 0} />
            <StatPill icon={Layers} label="Sub-receitas" value={receita.total_sub_receitas || 0} />
            <StatPill icon={BoxSelect} label="Embalagens" value={receita.total_embalagens || 0} />
          </div>

          {/* Financial grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <FinancialCell label="Mão de Obra" value={receita.custo_mao_obra || 0} />
            <FinancialCell label="Matéria-Prima" value={receita.custo_ingredientes || 0} />
            <FinancialCell label="Embalagem" value={receita.custo_embalagens || 0} />
            <FinancialCell label="Custo Total" value={custoTotal} highlight />
          </div>

          {/* Bottom financial row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Preço Venda</div>
              <div className="text-lg font-bold font-display">R$ {formatBRL(receita.preco_venda)}</div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Lucro Bruto</div>
              <div className={cn(
                "text-lg font-bold font-display",
                lucroBruto > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
              )}>
                R$ {formatBRL(lucroBruto)}
              </div>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Lucro Líquido</div>
              {isLoadingDetalhes ? (
                <Skeleton className="h-7 w-20 mx-auto" />
              ) : (
                <div className={cn(
                  "text-lg font-bold font-display",
                  !markupDetalhes ? 'text-muted-foreground' : lucroLiquido > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                )}>
                  {markupDetalhes ? `R$ ${formatBRL(lucroLiquido)}` : '—'}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <ReceitaPreviewModal
        receita={receitaCompleta}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </Card>
  );
}

function StatPill({ icon: Icon, label, value }: { icon?: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/60 text-xs">
      {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function FinancialCell({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-xl p-3 text-center transition-colors",
      highlight 
        ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md shadow-primary/15" 
        : "bg-muted/50"
    )}>
      <div className={cn(
        "text-[11px] font-medium uppercase tracking-wider mb-1",
        highlight ? "text-primary-foreground/80" : "text-muted-foreground"
      )}>
        {label}
      </div>
      <div className={cn("text-sm font-bold font-display", highlight && "text-primary-foreground")}>
        R$ {formatBRL(value)}
      </div>
    </div>
  );
}
