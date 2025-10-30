import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModalOrigemSelecao } from '@/components/movimentacao/ModalOrigemSelecao';
import { ChipsCategoria } from '@/components/movimentacao/ChipsCategoria';
import { GridProdutos } from '@/components/movimentacao/GridProdutos';
import { CarrinhoLateral, type ItemCarrinho } from '@/components/movimentacao/CarrinhoLateral';
import { ModalTipoMovimentacao } from '@/components/movimentacao/ModalTipoMovimentacao';
import { ModalEntradaDetalhes } from '@/components/movimentacao/ModalEntradaDetalhes';
import { ModalSaidaDetalhes } from '@/components/movimentacao/ModalSaidaDetalhes';
import { ModalFinalizacao } from '@/components/movimentacao/ModalFinalizacao';
import { imprimirComanda } from '@/components/movimentacao/ComandaImpressao';

interface Produto {
  id: string;
  nome: string;
  imagem_url?: string;
  custo_unitario: number;
  preco_venda?: number;
  estoque_atual: number;
  unidade: string;
  categorias?: string[];
}

interface Fornecedor {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  nome: string;
}

const Movimentacao = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputBuscaRef = useRef<HTMLInputElement>(null);

  // Estado global
  const [origem, setOrigem] = useState<'estoque' | 'vitrine' | null>(null);
  const [modalOrigemAberto, setModalOrigemAberto] = useState(true);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  // Catálogo e filtros
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Todas']);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [textoBusca, setTextoBusca] = useState('');

  // Carrinho
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'entrada' | 'saida' | null>(null);

  // Modais
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [modalTipoAberto, setModalTipoAberto] = useState(false);
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [modalSaidaAberto, setModalSaidaAberto] = useState(false);
  const [modalFinalizacaoAberto, setModalFinalizacaoAberto] = useState(false);

  // Dados auxiliares
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);

  // Carregar dados quando origem for selecionada
  useEffect(() => {
    if (origem && user) {
      carregarDados();
    }
  }, [origem, user]);

  // Carregar categorias quando produtos mudarem
  useEffect(() => {
    if (produtos.length > 0) {
      const cats = new Set<string>();
      
      produtos.forEach(p => {
        if (origem === 'estoque') {
          p.categorias?.forEach(c => cats.add(c));
        } else {
          // Para vitrine, podemos usar tipo_produto (se tiver na estrutura)
          // Por ora, deixar simples
        }
      });
      
      setCategorias(['Todas', ...Array.from(cats).sort()]);
    }
  }, [produtos, origem]);

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        inputBuscaRef.current?.focus();
      }
      
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        if (carrinho.length > 0) {
          setModalFinalizacaoAberto(true);
        }
      }
      
      if (e.key === 'Escape') {
        setModalTipoAberto(false);
        setModalEntradaAberto(false);
        setModalSaidaAberto(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [carrinho]);

  // Travar scroll quando modais abrem
  useEffect(() => {
    const modalAberto = modalTipoAberto || modalEntradaAberto || modalSaidaAberto || modalFinalizacaoAberto;
    
    if (modalAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalTipoAberto, modalEntradaAberto, modalSaidaAberto, modalFinalizacaoAberto]);

  const carregarDados = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar perfil do tenant
      const { data: perfilData } = await supabase
        .from('profiles')
        .select('business_name, cnpj_cpf')
        .eq('user_id', user.id)
        .single();
      
      setPerfil(perfilData);

      // Carregar fornecedores
      const { data: fornData } = await supabase
        .from('fornecedores')
        .select('id, nome')
        .eq('user_id', user.id)
        .eq('ativo', true);
      
      setFornecedores(fornData || []);

      // Carregar funcionários
      const { data: funcData } = await supabase
        .from('folha_pagamento')
        .select('id, nome')
        .eq('user_id', user.id)
        .eq('ativo', true);
      
      setFuncionarios(funcData || []);

      // Carregar produtos baseado na origem
      if (origem === 'estoque') {
        const { data: prodData } = await supabase
          .from('produtos')
          .select('id, nome, imagem_url, custo_unitario, estoque_atual, unidade, categorias')
          .eq('user_id', user.id)
          .eq('ativo', true)
          .order('nome');
        
        setProdutos((prodData || []) as Produto[]);
      } else if (origem === 'vitrine') {
        const { data: receitasData } = await supabase
          .from('receitas')
          .select('id, nome, imagem_url, preco_venda')
          .eq('user_id', user.id);
        
        // Carregar estoque de receitas
        const { data: estoqueData } = await supabase
          .from('estoque_receitas')
          .select('receita_id, quantidade_atual')
          .eq('user_id', user.id);
        
        const estoqueMap = new Map(estoqueData?.map(e => [e.receita_id, e.quantidade_atual]) || []);
        
        const receitasComEstoque = (receitasData || []).map(r => ({
          id: r.id,
          nome: r.nome,
          imagem_url: r.imagem_url,
          custo_unitario: 0,
          preco_venda: r.preco_venda || 0,
          estoque_atual: estoqueMap.get(r.id) || 0,
          unidade: 'un',
        }));
        
        setProdutos(receitasComEstoque);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const produtosFiltrados = useMemo(() => {
    let resultado = produtos;
    
    // Filtro de categoria
    if (categoriaAtiva !== 'Todas') {
      resultado = resultado.filter(p =>
        origem === 'estoque' 
          ? p.categorias?.includes(categoriaAtiva)
          : true
      );
    }
    
    // Filtro de busca
    if (textoBusca.trim()) {
      const termo = textoBusca.toLowerCase();
      resultado = resultado.filter(p =>
        p.nome.toLowerCase().includes(termo)
      );
    }
    
    return resultado;
  }, [produtos, categoriaAtiva, textoBusca, origem]);

  const handleSelectOrigem = (novaOrigem: 'estoque' | 'vitrine') => {
    setOrigem(novaOrigem);
    setModalOrigemAberto(false);
  };

  const handleSelectProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    
    // Se carrinho já tem tipo definido, pular seleção de tipo
    if (tipoMovimentacao === 'entrada') {
      setModalEntradaAberto(true);
    } else if (tipoMovimentacao === 'saida') {
      setModalSaidaAberto(true);
    } else {
      // Carrinho vazio, perguntar tipo
      setModalTipoAberto(true);
    }
  };

  const handleSelectTipo = (tipo: 'entrada' | 'saida') => {
    setModalTipoAberto(false);
    
    // Validar se carrinho está vazio ou compatível
    if (carrinho.length > 0 && tipoMovimentacao !== tipo) {
      toast({
        title: 'Tipo incompatível',
        description: `Este carrinho é de ${tipoMovimentacao}. Finalize antes de adicionar ${tipo}.`,
        variant: 'destructive',
      });
      return;
    }
    
    if (tipo === 'entrada') {
      setModalEntradaAberto(true);
    } else {
      setModalSaidaAberto(true);
    }
  };

  const handleConfirmEntrada = (data: {
    quantidade: number;
    custoUnitario: number;
    custoTotal: number;
    fornecedor_id?: string;
    fornecedor_nome?: string;
    observacao?: string;
  }) => {
    if (!produtoSelecionado) return;
    
    // Verificar duplicata
    if (carrinho.find(item => (origem === 'estoque' ? item.produto_id : item.receita_id) === produtoSelecionado.id)) {
      toast({
        title: 'Produto já adicionado',
        description: 'Edite a quantidade na linha do carrinho',
        variant: 'destructive',
      });
      return;
    }
    
    const novoItem: ItemCarrinho = {
      id: Date.now().toString(),
      origem: origem!,
      produto_id: origem === 'estoque' ? produtoSelecionado.id : undefined,
      receita_id: origem === 'vitrine' ? produtoSelecionado.id : undefined,
      nome: produtoSelecionado.nome,
      quantidade: data.quantidade,
      unidade: produtoSelecionado.unidade,
      valor_unitario: data.custoUnitario,
      valor_total: data.custoTotal,
      tipo: 'entrada',
      fornecedor_id: data.fornecedor_id,
      fornecedor_nome: data.fornecedor_nome,
      observacao: data.observacao,
    };
    
    setCarrinho([...carrinho, novoItem]);
    if (!tipoMovimentacao) setTipoMovimentacao('entrada');
    
    toast({ title: 'Item adicionado ao carrinho' });
    setProdutoSelecionado(null);
  };

  const handleConfirmSaida = (data: {
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    observacao?: string;
  }) => {
    if (!produtoSelecionado) return;
    
    // Verificar duplicata
    if (carrinho.find(item => (origem === 'estoque' ? item.produto_id : item.receita_id) === produtoSelecionado.id)) {
      toast({
        title: 'Produto já adicionado',
        description: 'Edite a quantidade na linha do carrinho',
        variant: 'destructive',
      });
      return;
    }
    
    const novoItem: ItemCarrinho = {
      id: Date.now().toString(),
      origem: origem!,
      produto_id: origem === 'estoque' ? produtoSelecionado.id : undefined,
      receita_id: origem === 'vitrine' ? produtoSelecionado.id : undefined,
      nome: produtoSelecionado.nome,
      quantidade: data.quantidade,
      unidade: produtoSelecionado.unidade,
      valor_unitario: data.valorUnitario,
      valor_total: data.valorTotal,
      tipo: 'saida',
      observacao: data.observacao,
    };
    
    setCarrinho([...carrinho, novoItem]);
    if (!tipoMovimentacao) setTipoMovimentacao('saida');
    
    toast({ title: 'Item adicionado ao carrinho' });
    setProdutoSelecionado(null);
  };

  const handleRemoverItem = (id: string) => {
    const novoCarrinho = carrinho.filter(item => item.id !== id);
    setCarrinho(novoCarrinho);
    
    if (novoCarrinho.length === 0) {
      setTipoMovimentacao(null);
    }
  };

  const handleLimparCarrinho = () => {
    setCarrinho([]);
    setTipoMovimentacao(null);
  };

  const handleFinalizar = () => {
    setModalFinalizacaoAberto(true);
  };

  const handleConfirmFinalizar = async (data: {
    funcionario_id: string;
    funcionario_nome: string;
    motivo: string;
    data_movimentacao: Date;
    observacao?: string;
    imprimir: boolean;
  }) => {
    if (!user || !origem || !tipoMovimentacao) return;
    
    setLoading(true);
    try {
      // Gerar número da comanda
      const { data: comandaNum } = await supabase.rpc('gerar_numero_comanda', {
        p_user_id: user.id
      });
      
      const numeroComanda = comandaNum || '#0001';

      // Processar cada item do carrinho
      for (const item of carrinho) {
        // 1. Criar registro em movimentacoes_pdv
        const { error: pdvError } = await (supabase.from('movimentacoes_pdv') as any).insert({
          origem: item.origem,
          tipo: item.tipo,
          produto_id: item.produto_id,
          receita_id: item.receita_id,
          nome_item: item.nome,
          quantidade: item.quantidade,
          unidade: item.unidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          funcionario_id: data.funcionario_id,
          funcionario_nome: data.funcionario_nome,
          motivo: data.motivo,
          observacao: item.observacao || data.observacao,
          data_movimentacao: data.data_movimentacao.toISOString(),
          fornecedor_id: item.fornecedor_id,
          fornecedor_nome: item.fornecedor_nome,
        });

        // 2. Atualizar estoque e custos
        if (origem === 'estoque' && item.produto_id) {
          const { data: produto } = await supabase
            .from('produtos')
            .select('estoque_atual, custo_medio, custo_total')
            .eq('id', item.produto_id)
            .single();

          if (produto) {
            if (item.tipo === 'entrada') {
              const novoEstoque = produto.estoque_atual + item.quantidade;
              const custoTotalAtual = produto.estoque_atual * produto.custo_medio;
              const custoTotalEntrada = item.quantidade * item.valor_unitario;
              const novoCustoTotal = custoTotalAtual + custoTotalEntrada;
              const novoCustoMedio = novoEstoque > 0 ? novoCustoTotal / novoEstoque : 0;

              await supabase
                .from('produtos')
                .update({
                  estoque_atual: novoEstoque,
                  custo_unitario: item.valor_unitario,
                  custo_medio: novoCustoMedio,
                  custo_total: novoCustoTotal,
                })
                .eq('id', item.produto_id);
            } else {
              const novoEstoque = produto.estoque_atual - item.quantidade;
              const novoCustoTotal = novoEstoque * produto.custo_medio;

              await supabase
                .from('produtos')
                .update({
                  estoque_atual: novoEstoque,
                  custo_total: novoCustoTotal,
                })
                .eq('id', item.produto_id);
            }
          }

          // 3. Criar registro em movimentacoes (compatibilidade)
          await (supabase.from('movimentacoes') as any).insert({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            custo_unitario: item.valor_unitario,
            fornecedor_id: item.fornecedor_id,
            observacao: item.observacao || data.observacao,
            data: data.data_movimentacao.toISOString().split('T')[0],
          });
        } else if (origem === 'vitrine' && item.receita_id) {
          // Atualizar estoque de receitas
          const { data: estoqueReceita } = await supabase
            .from('estoque_receitas')
            .select('quantidade_atual')
            .eq('receita_id', item.receita_id)
            .maybeSingle();

          if (estoqueReceita) {
            const novaQtd = item.tipo === 'entrada'
              ? estoqueReceita.quantidade_atual + item.quantidade
              : estoqueReceita.quantidade_atual - item.quantidade;

            await supabase
              .from('estoque_receitas')
              .update({ quantidade_atual: novaQtd })
              .eq('receita_id', item.receita_id);
          }

          // Criar registro em movimentacoes_receitas
          await (supabase.from('movimentacoes_receitas') as any).insert({
            receita_id: item.receita_id!,
            tipo: item.tipo === 'entrada' ? 'entrada' : 'venda',
            quantidade: item.quantidade,
            custo_unitario: item.valor_unitario,
            preco_venda: item.tipo === 'saida' ? item.valor_unitario : 0,
            data: data.data_movimentacao.toISOString().split('T')[0],
            observacao: item.observacao || data.observacao,
          });
        }
      }

      // Imprimir comanda se solicitado
      if (data.imprimir && perfil) {
        imprimirComanda({
          numeroComanda,
          tenant: {
            nome: perfil.business_name || 'COMANDA',
            cnpj: perfil.cnpj_cpf,
          },
          funcionario: data.funcionario_nome,
          motivo: data.motivo,
          dataMovimentacao: data.data_movimentacao,
          carrinho,
          observacao: data.observacao,
        });
      }

      toast({
        title: 'Movimentação finalizada com sucesso!',
        description: `Comanda ${numeroComanda} registrada`,
      });

      // Limpar carrinho e recarregar dados
      handleLimparCarrinho();
      setModalFinalizacaoAberto(false);
      carregarDados();
    } catch (error: any) {
      toast({
        title: 'Erro ao finalizar movimentação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!origem) {
    return (
      <ModalOrigemSelecao
        open={modalOrigemAberto}
        onSelect={handleSelectOrigem}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header - Sticky no topo */}
      <div className="sticky top-0 z-20 bg-background border-b p-4 flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputBuscaRef}
            placeholder="Buscar produto ou código de barras..."
            value={textoBusca}
            onChange={(e) => setTextoBusca(e.target.value)}
            className="pl-10"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={carregarDados}
          disabled={loading}
        >
          <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Barra de Categorias - Sticky abaixo do header */}
      <div className="sticky top-[73px] z-10 bg-background border-b p-4">
        <ChipsCategoria
          categorias={categorias}
          categoriaAtiva={categoriaAtiva}
          onSelectCategoria={setCategoriaAtiva}
        />
      </div>

      {/* Conteúdo Principal - Altura fixa calculada */}
      <div className="flex flex-1 overflow-hidden">
        {/* Botão toggle para tablet/mobile */}
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden fixed bottom-4 right-4 z-30 h-12 w-12 rounded-full shadow-lg"
          onClick={() => setCarrinhoAberto(!carrinhoAberto)}
        >
          🛒 <span className="ml-1 text-xs">{carrinho.length}</span>
        </Button>

        {/* Overlay para tablet quando carrinho aberto */}
        {carrinhoAberto && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-10"
            onClick={() => setCarrinhoAberto(false)}
          />
        )}

        {/* Carrinho - Desktop sempre visível, tablet toggle */}
        <div className={`
          fixed lg:relative right-0 z-20
          top-[137px] lg:top-auto bottom-0 lg:bottom-auto
          transform transition-transform duration-300
          lg:transform-none lg:block
          ${carrinhoAberto ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          w-80 xl:w-96 flex-shrink-0
          h-[calc(100vh-137px)] lg:h-full
        `}>
          <CarrinhoLateral
            carrinho={carrinho}
            tipoMovimentacao={tipoMovimentacao}
            onRemoverItem={handleRemoverItem}
            onLimpar={handleLimparCarrinho}
            onFinalizar={handleFinalizar}
          />
        </div>

        {/* Grid de Produtos - Scroll vertical único */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 max-w-5xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                Carregando...
              </div>
            ) : (
              <GridProdutos
                produtos={produtosFiltrados}
                origem={origem}
                onSelectProduto={handleSelectProduto}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <ModalTipoMovimentacao
        open={modalTipoAberto}
        nomeProduto={produtoSelecionado?.nome || ''}
        onSelectTipo={handleSelectTipo}
        onClose={() => setModalTipoAberto(false)}
      />

      <ModalEntradaDetalhes
        open={modalEntradaAberto}
        produto={produtoSelecionado}
        origem={origem}
        fornecedores={fornecedores}
        onConfirm={handleConfirmEntrada}
        onClose={() => setModalEntradaAberto(false)}
      />

      <ModalSaidaDetalhes
        open={modalSaidaAberto}
        produto={produtoSelecionado}
        origem={origem}
        onConfirm={handleConfirmSaida}
        onClose={() => setModalSaidaAberto(false)}
      />

      <ModalFinalizacao
        open={modalFinalizacaoAberto}
        funcionarios={funcionarios}
        tipoMovimentacao={tipoMovimentacao || 'entrada'}
        totalItens={carrinho.length}
        onConfirm={handleConfirmFinalizar}
        onClose={() => setModalFinalizacaoAberto(false)}
      />
    </div>
  );
};

export default Movimentacao;
