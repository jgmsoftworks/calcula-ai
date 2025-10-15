-- Migration 1: Apenas adicionar o valor ao enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fornecedor';