-- Inserir alguns itens de exemplo no roadmap para demonstração
INSERT INTO public.roadmap_items (title, description, status, eta) VALUES
(
  'Sistema de Relatórios Avançados',
  'Implementação de relatórios personalizáveis com gráficos avançados e exportação em múltiplos formatos (PDF, Excel, CSV). Incluirá análises de tendência e comparativos históricos.',
  'planned',
  'Q2 2025'
),
(
  'Integração com Sistemas de ERP',
  'Conectar o CalculaAI com os principais sistemas de ERP do mercado (SAP, TOTVS, Sankhya) para sincronização automática de dados de produtos, custos e vendas.',
  'in_progress',
  'Q1 2025'
),
(
  'Aplicativo Mobile Nativo',
  'Desenvolvimento de aplicativo mobile para iOS e Android com funcionalidades offline para consulta de produtos, precificação rápida e cadastros básicos.',
  'planned',
  'Q3 2025'
),
(
  'Dashboard Executivo Aprimorado',
  'Nova versão do dashboard com widgets personalizáveis, alertas automáticos de baixo estoque, indicadores de performance em tempo real e análises preditivas.',
  'released',
  'Janeiro 2025'
),
(
  'Sistema de Etiquetas e Códigos de Barra',
  'Geração automática de etiquetas de preço e códigos de barra com integração para impressoras térmicas e layout customizável por tipo de produto.',
  'planned',
  'Q4 2025'
);