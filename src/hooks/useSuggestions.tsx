import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useActivity } from "@/contexts/ActivityContext";

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: "bug" | "improvement" | "feature";
  impact: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high";
  allow_contact: boolean;
  status: "new" | "review" | "in_progress" | "released" | "rejected";
  attachment_url?: string;
  plan?: string;
  app_version?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSuggestionData {
  title: string;
  description: string;
  category: "bug" | "improvement" | "feature";
  impact: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high";
  allow_contact: boolean;
  attachment_url?: string;
}

export const useSuggestions = () => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const { user } = useAuth();
  const { logActivity } = useActivity();

  const checkRateLimit = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { data, error } = await supabase
        .rpc('count_user_suggestions_24h', { check_user_id: user.id });

      if (error) {
        console.error("Erro ao verificar rate limit:", error);
        return true; // Allow in case of error
      }

      return (data || 0) < 3; // Allow max 3 suggestions per 24h
    } catch (error) {
      console.error("Erro ao verificar rate limit:", error);
      return true;
    }
  }, [user?.id]);

  const createSuggestion = useCallback(async (data: CreateSuggestionData): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      return { success: false, error: "Usuário não autenticado" };
    }

    setLoading(true);

    try {
      // Check rate limit
      const canCreate = await checkRateLimit();
      if (!canCreate) {
        toast({
          title: "Limite atingido",
          description: "Você atingiu o limite diário de sugestões. Tente novamente amanhã.",
          variant: "destructive",
        });
        return { success: false, error: "Rate limit exceeded" };
      }

      // Get user profile for plan info
      const { data: profile } = await supabase
        .from('profiles')
        .select('business_name')
        .eq('user_id', user.id)
        .single();

      // Create suggestion
      const suggestionData = {
        ...data,
        user_id: user.id,
        plan: profile?.business_name || "Não informado",
        app_version: "1.0.0", // You can get this from package.json or environment
      };

      const { data: newSuggestion, error: insertError } = await supabase
        .from('suggestions')
        .insert([suggestionData])
        .select()
        .single();

      if (insertError) {
        console.error("Erro ao criar sugestão:", insertError);
        toast({
          title: "Erro",
          description: "Erro ao enviar sugestão. Tente novamente.",
          variant: "destructive",
        });
        return { success: false, error: insertError.message };
      }

      // Send email notification
      try {
        const emailResponse = await supabase.functions.invoke('send-suggestion-email', {
          body: {
            title: data.title,
            description: data.description,
            category: data.category,
            impact: data.impact,
            urgency: data.urgency,
            user_id: user.id,
            plan: suggestionData.plan,
            allow_contact: data.allow_contact,
          }
        });

        if (emailResponse.error) {
          console.warn("Aviso: Erro ao enviar email de notificação:", emailResponse.error);
          // Don't fail the whole operation if email fails
        }
      } catch (emailError) {
        console.warn("Aviso: Erro ao enviar email de notificação:", emailError);
        // Don't fail the whole operation if email fails
      }

      // Log activity
      logActivity(
        "Sugestão enviada", 
        "suggestions", 
        newSuggestion.id, 
        `Nova sugestão: ${data.title}`
      );

      toast({
        title: "Sucesso!",
        description: "Obrigado! Recebemos sua sugestão.",
      });

      return { success: true };

    } catch (error: any) {
      console.error("Erro geral ao criar sugestão:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao enviar sugestão.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkRateLimit, logActivity]);

  const fetchUserSuggestions = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar sugestões:", error);
        return;
      }

      setSuggestions((data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        category: item.category as "bug" | "improvement" | "feature",
        impact: item.impact as "low" | "medium" | "high",
        urgency: item.urgency as "low" | "medium" | "high",
        allow_contact: item.allow_contact,
        status: item.status as "new" | "review" | "in_progress" | "released" | "rejected",
        attachment_url: item.attachment_url,
        plan: item.plan,
        app_version: item.app_version,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })));
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    suggestions,
    loading,
    createSuggestion,
    fetchUserSuggestions,
    checkRateLimit,
  };
};