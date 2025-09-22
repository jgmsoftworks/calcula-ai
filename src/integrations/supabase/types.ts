export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categorias_despesas_fixas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      despesas_fixas: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
          valor: number
          vencimento: number | null
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
          valor?: number
          vencimento?: number | null
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
          valor?: number
          vencimento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "despesas_fixas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_despesas_fixas"
            referencedColumns: ["id"]
          },
        ]
      }
      encargos_venda: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
          user_id: string
          valor: number
          valor_fixo: number | null
          valor_percentual: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          user_id: string
          valor?: number
          valor_fixo?: number | null
          valor_percentual?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor?: number
          valor_fixo?: number | null
          valor_percentual?: number | null
        }
        Relationships: []
      }
      folha_pagamento: {
        Row: {
          adicional: number | null
          ativo: boolean
          cargo: string | null
          created_at: string
          custo_por_hora: number | null
          desconto: number | null
          dias_por_semana: number | null
          ferias_percent: number | null
          ferias_valor: number | null
          fgts_percent: number | null
          fgts_valor: number | null
          horas_por_dia: number | null
          horas_totais_mes: number | null
          id: string
          inss_percent: number | null
          inss_valor: number | null
          nome: string
          outros_percent: number | null
          outros_valor: number | null
          plano_saude_percent: number | null
          plano_saude_valor: number | null
          rat_percent: number | null
          rat_valor: number | null
          salario_base: number
          semanas_por_mes: number | null
          tipo_mao_obra: string | null
          updated_at: string
          user_id: string
          vale_alimentacao_percent: number | null
          vale_alimentacao_valor: number | null
          vale_refeicao_percent: number | null
          vale_refeicao_valor: number | null
          vale_transporte_percent: number | null
          vale_transporte_valor: number | null
        }
        Insert: {
          adicional?: number | null
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          custo_por_hora?: number | null
          desconto?: number | null
          dias_por_semana?: number | null
          ferias_percent?: number | null
          ferias_valor?: number | null
          fgts_percent?: number | null
          fgts_valor?: number | null
          horas_por_dia?: number | null
          horas_totais_mes?: number | null
          id?: string
          inss_percent?: number | null
          inss_valor?: number | null
          nome: string
          outros_percent?: number | null
          outros_valor?: number | null
          plano_saude_percent?: number | null
          plano_saude_valor?: number | null
          rat_percent?: number | null
          rat_valor?: number | null
          salario_base?: number
          semanas_por_mes?: number | null
          tipo_mao_obra?: string | null
          updated_at?: string
          user_id: string
          vale_alimentacao_percent?: number | null
          vale_alimentacao_valor?: number | null
          vale_refeicao_percent?: number | null
          vale_refeicao_valor?: number | null
          vale_transporte_percent?: number | null
          vale_transporte_valor?: number | null
        }
        Update: {
          adicional?: number | null
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          custo_por_hora?: number | null
          desconto?: number | null
          dias_por_semana?: number | null
          ferias_percent?: number | null
          ferias_valor?: number | null
          fgts_percent?: number | null
          fgts_valor?: number | null
          horas_por_dia?: number | null
          horas_totais_mes?: number | null
          id?: string
          inss_percent?: number | null
          inss_valor?: number | null
          nome?: string
          outros_percent?: number | null
          outros_valor?: number | null
          plano_saude_percent?: number | null
          plano_saude_valor?: number | null
          rat_percent?: number | null
          rat_valor?: number | null
          salario_base?: number
          semanas_por_mes?: number | null
          tipo_mao_obra?: string | null
          updated_at?: string
          user_id?: string
          vale_alimentacao_percent?: number | null
          vale_alimentacao_valor?: number | null
          vale_refeicao_percent?: number | null
          vale_refeicao_valor?: number | null
          vale_transporte_percent?: number | null
          vale_transporte_valor?: number | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cnpj_cpf: string | null
          contato: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          representante: string | null
          telefone: string | null
          telefone_representante: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cnpj_cpf?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          representante?: string | null
          telefone?: string | null
          telefone_representante?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          cnpj_cpf?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          representante?: string | null
          telefone?: string | null
          telefone_representante?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marcas: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      markups: {
        Row: {
          ativo: boolean
          created_at: string
          despesas_fixas_selecionadas: Json | null
          encargos_sobre_venda: number
          encargos_venda_selecionados: Json | null
          folha_pagamento_selecionada: Json | null
          gasto_sobre_faturamento: number
          id: string
          margem_lucro: number
          markup_aplicado: number
          markup_ideal: number
          nome: string
          periodo: string
          preco_sugerido: number
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          despesas_fixas_selecionadas?: Json | null
          encargos_sobre_venda?: number
          encargos_venda_selecionados?: Json | null
          folha_pagamento_selecionada?: Json | null
          gasto_sobre_faturamento?: number
          id?: string
          margem_lucro?: number
          markup_aplicado?: number
          markup_ideal?: number
          nome: string
          periodo?: string
          preco_sugerido?: number
          tipo?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          despesas_fixas_selecionadas?: Json | null
          encargos_sobre_venda?: number
          encargos_venda_selecionados?: Json | null
          folha_pagamento_selecionada?: Json | null
          gasto_sobre_faturamento?: number
          id?: string
          margem_lucro?: number
          markup_aplicado?: number
          markup_ideal?: number
          nome?: string
          periodo?: string
          preco_sugerido?: number
          tipo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      movimentacoes: {
        Row: {
          created_at: string
          custo_unitario: number | null
          data: string
          fornecedor_id: string | null
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number | null
          data?: string
          fornecedor_id?: string | null
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number | null
          data?: string
          fornecedor_id?: string | null
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["tipo_movimentacao"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          categorias: string[] | null
          codigo_barras: string | null
          codigo_interno: string | null
          created_at: string
          custo_medio: number
          custo_total: number | null
          custo_unitario: number | null
          estoque_atual: number
          estoque_minimo: number | null
          fornecedor_ids: string[] | null
          id: string
          imagem_url: string | null
          marcas: string[] | null
          nome: string
          rotulo_carb: number | null
          rotulo_fibra: number | null
          rotulo_gord_sat: number | null
          rotulo_gord_total: number | null
          rotulo_gord_trans: number | null
          rotulo_kcal: number | null
          rotulo_porcao: string | null
          rotulo_prot: number | null
          rotulo_sodio: number | null
          sku: string | null
          total_embalagem: number | null
          unidade: Database["public"]["Enums"]["unidade_medida"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          categorias?: string[] | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          created_at?: string
          custo_medio?: number
          custo_total?: number | null
          custo_unitario?: number | null
          estoque_atual?: number
          estoque_minimo?: number | null
          fornecedor_ids?: string[] | null
          id?: string
          imagem_url?: string | null
          marcas?: string[] | null
          nome: string
          rotulo_carb?: number | null
          rotulo_fibra?: number | null
          rotulo_gord_sat?: number | null
          rotulo_gord_total?: number | null
          rotulo_gord_trans?: number | null
          rotulo_kcal?: number | null
          rotulo_porcao?: string | null
          rotulo_prot?: number | null
          rotulo_sodio?: number | null
          sku?: string | null
          total_embalagem?: number | null
          unidade?: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          categorias?: string[] | null
          codigo_barras?: string | null
          codigo_interno?: string | null
          created_at?: string
          custo_medio?: number
          custo_total?: number | null
          custo_unitario?: number | null
          estoque_atual?: number
          estoque_minimo?: number | null
          fornecedor_ids?: string[] | null
          id?: string
          imagem_url?: string | null
          marcas?: string[] | null
          nome?: string
          rotulo_carb?: number | null
          rotulo_fibra?: number | null
          rotulo_gord_sat?: number | null
          rotulo_gord_total?: number | null
          rotulo_gord_trans?: number | null
          rotulo_kcal?: number | null
          rotulo_porcao?: string | null
          rotulo_prot?: number | null
          rotulo_sodio?: number | null
          sku?: string | null
          total_embalagem?: number | null
          unidade?: Database["public"]["Enums"]["unidade_medida"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bairro: string | null
          business_name: string | null
          business_type: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          complemento: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string
          data_abertura: string | null
          descricao_empresa: string | null
          email_comercial: string | null
          estado: string | null
          full_name: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          instagram: string | null
          is_admin: boolean
          logo_empresa_url: string | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          pais: string | null
          pdf_exports_count: number | null
          pdf_exports_reset_at: string | null
          phone: string | null
          plan: string | null
          plan_expires_at: string | null
          porte_empresa: string | null
          razao_social: string | null
          regime_tributario: string | null
          responsavel_cargo: string | null
          responsavel_cpf: string | null
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          role: string
          setor_atividade: string | null
          telefone_comercial: string | null
          updated_at: string
          user_id: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          business_name?: string | null
          business_type?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          data_abertura?: string | null
          descricao_empresa?: string | null
          email_comercial?: string | null
          estado?: string | null
          full_name?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          instagram?: string | null
          is_admin?: boolean
          logo_empresa_url?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          pais?: string | null
          pdf_exports_count?: number | null
          pdf_exports_reset_at?: string | null
          phone?: string | null
          plan?: string | null
          plan_expires_at?: string | null
          porte_empresa?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel_cargo?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          role?: string
          setor_atividade?: string | null
          telefone_comercial?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          business_name?: string | null
          business_type?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string
          data_abertura?: string | null
          descricao_empresa?: string | null
          email_comercial?: string | null
          estado?: string | null
          full_name?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          instagram?: string | null
          is_admin?: boolean
          logo_empresa_url?: string | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          pais?: string | null
          pdf_exports_count?: number | null
          pdf_exports_reset_at?: string | null
          phone?: string | null
          plan?: string | null
          plan_expires_at?: string | null
          porte_empresa?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel_cargo?: string | null
          responsavel_cpf?: string | null
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          role?: string
          setor_atividade?: string | null
          telefone_comercial?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      receita_embalagens: {
        Row: {
          created_at: string
          custo_total: number | null
          custo_unitario: number | null
          id: string
          nome: string
          produto_id: string
          quantidade: number
          receita_id: string
          unidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          nome: string
          produto_id: string
          quantidade: number
          receita_id: string
          unidade: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          nome?: string
          produto_id?: string
          quantidade?: number
          receita_id?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receita_embalagens_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      receita_ingredientes: {
        Row: {
          created_at: string
          custo_total: number | null
          custo_unitario: number | null
          id: string
          marcas: string[] | null
          nome: string
          produto_id: string
          quantidade: number
          receita_id: string
          unidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          marcas?: string[] | null
          nome: string
          produto_id: string
          quantidade: number
          receita_id: string
          unidade: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          marcas?: string[] | null
          nome?: string
          produto_id?: string
          quantidade?: number
          receita_id?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receita_ingredientes_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      receita_mao_obra: {
        Row: {
          created_at: string
          custo_por_hora: number
          funcionario_cargo: string
          funcionario_id: string
          funcionario_nome: string
          id: string
          receita_id: string
          tempo: number
          unidade_tempo: string | null
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          custo_por_hora: number
          funcionario_cargo: string
          funcionario_id: string
          funcionario_nome: string
          id?: string
          receita_id: string
          tempo: number
          unidade_tempo?: string | null
          updated_at?: string
          valor_total: number
        }
        Update: {
          created_at?: string
          custo_por_hora?: number
          funcionario_cargo?: string
          funcionario_id?: string
          funcionario_nome?: string
          id?: string
          receita_id?: string
          tempo?: number
          unidade_tempo?: string | null
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "receita_mao_obra_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      receita_passos_preparo: {
        Row: {
          created_at: string
          descricao: string
          id: string
          imagem_url: string | null
          ordem: number
          receita_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          imagem_url?: string | null
          ordem: number
          receita_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          imagem_url?: string | null
          ordem?: number
          receita_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      receita_sub_receitas: {
        Row: {
          created_at: string
          custo_total: number | null
          custo_unitario: number | null
          id: string
          nome: string
          quantidade: number
          receita_id: string
          sub_receita_id: string
          unidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          nome: string
          quantidade: number
          receita_id: string
          sub_receita_id: string
          unidade: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          id?: string
          nome?: string
          quantidade?: number
          receita_id?: string
          sub_receita_id?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receita_sub_receitas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_sub_receitas_sub_receita_id_fkey"
            columns: ["sub_receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          conservacao: Json | null
          created_at: string
          id: string
          imagem_url: string | null
          markup_id: string | null
          nome: string
          observacoes: string | null
          peso_unitario: number | null
          preco_venda: number | null
          rendimento_unidade: string | null
          rendimento_valor: number | null
          status: string | null
          tempo_preparo_mao_obra: number | null
          tempo_preparo_total: number | null
          tipo_produto: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conservacao?: Json | null
          created_at?: string
          id?: string
          imagem_url?: string | null
          markup_id?: string | null
          nome: string
          observacoes?: string | null
          peso_unitario?: number | null
          preco_venda?: number | null
          rendimento_unidade?: string | null
          rendimento_valor?: number | null
          status?: string | null
          tempo_preparo_mao_obra?: number | null
          tempo_preparo_total?: number | null
          tipo_produto?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conservacao?: Json | null
          created_at?: string
          id?: string
          imagem_url?: string | null
          markup_id?: string | null
          nome?: string
          observacoes?: string | null
          peso_unitario?: number | null
          preco_venda?: number | null
          rendimento_unidade?: string | null
          rendimento_valor?: number | null
          status?: string | null
          tempo_preparo_mao_obra?: number | null
          tempo_preparo_total?: number | null
          tipo_produto?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receitas_markup_id_fkey"
            columns: ["markup_id"]
            isOneToOne: false
            referencedRelation: "markups"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          created_at: string
          description: string
          eta: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          eta?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          eta?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_votes: {
        Row: {
          created_at: string
          id: string
          roadmap_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          roadmap_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          roadmap_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_votes_roadmap_item_id_fkey"
            columns: ["roadmap_item_id"]
            isOneToOne: false
            referencedRelation: "roadmap_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_data_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          id: string
          ip_address: unknown | null
          record_id: string | null
          sensitive_fields: string[] | null
          table_name: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          action: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          sensitive_fields?: string[] | null
          table_name: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          action?: string
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          sensitive_fields?: string[] | null
          table_name?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suggestions: {
        Row: {
          allow_contact: boolean
          app_version: string | null
          attachment_url: string | null
          category: string
          created_at: string
          description: string
          id: string
          impact: string
          plan: string | null
          status: string
          title: string
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          allow_contact?: boolean
          app_version?: string | null
          attachment_url?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          impact: string
          plan?: string | null
          status?: string
          title: string
          updated_at?: string
          urgency: string
          user_id: string
        }
        Update: {
          allow_contact?: boolean
          app_version?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          impact?: string
          plan?: string | null
          status?: string
          title?: string
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: []
      }
      tipos_produto: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_configurations: {
        Row: {
          configuration: Json
          created_at: string
          id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          configuration: Json
          created_at?: string
          id?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_plan_limits: {
        Args: {
          feature_count?: number
          feature_type: string
          user_uuid: string
        }
        Returns: Json
      }
      count_user_suggestions_24h: {
        Args: { check_user_id: string }
        Returns: number
      }
      generate_codigo_interno: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_role: {
        Args: { check_user_id?: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role_or_higher: {
        Args: {
          check_user_id?: string
          required_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      initialize_user_filters: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      reset_monthly_pdf_counter: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "hr_manager" | "employee" | "viewer"
      tipo_movimentacao: "entrada" | "saida"
      unidade_medida: "g" | "kg" | "ml" | "L" | "un"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "hr_manager", "employee", "viewer"],
      tipo_movimentacao: ["entrada", "saida"],
      unidade_medida: ["g", "kg", "ml", "L", "un"],
    },
  },
} as const
