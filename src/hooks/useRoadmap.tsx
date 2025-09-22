import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useActivity } from "@/contexts/ActivityContext";

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "planned" | "in_progress" | "released";
  eta?: string;
  created_at: string;
  updated_at: string;
}

export interface RoadmapItemWithVotes extends RoadmapItem {
  vote_count: number;
  user_voted: boolean;
  is_new?: boolean;
}

export type RoadmapStatus = "planned" | "in_progress" | "released" | "all";
export type RoadmapSort = "votes" | "date";

export const useRoadmap = () => {
  const [loading, setLoading] = useState(false);
  const [roadmapItems, setRoadmapItems] = useState<RoadmapItemWithVotes[]>([]);
  const [statusFilter, setStatusFilter] = useState<RoadmapStatus>("all");
  const [sortBy, setSortBy] = useState<RoadmapSort>("votes");
  const { user } = useAuth();
  const { logActivity } = useActivity();

  const fetchRoadmapItems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('roadmap_items')
        .select(`
          *,
          roadmap_votes!inner(count)
        `);

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq('status', statusFilter);
      }

      // Apply sorting
      if (sortBy === "votes") {
        query = query.order('created_at', { ascending: false }); // We'll sort by votes in JS
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: items, error } = await query;

      if (error) {
        console.error("Erro ao buscar roadmap:", error);
        return;
      }

      // Get vote counts and user votes separately for better performance
      const itemsWithVotes = await Promise.all(
        (items || []).map(async (item) => {
          // Get vote count
          const { count: voteCount } = await supabase
            .from('roadmap_votes')
            .select('*', { count: 'exact', head: true })
            .eq('roadmap_item_id', item.id);

          // Check if user voted (only if logged in)
          let userVoted = false;
          if (user?.id) {
            const { data: userVote } = await supabase
              .from('roadmap_votes')
              .select('id')
              .eq('roadmap_item_id', item.id)
              .eq('user_id', user.id)
              .single();
            
            userVoted = !!userVote;
          }

          // Check if item is new (released within 14 days)
          const isNew = item.status === 'released' && 
            new Date(item.updated_at) > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            status: item.status as "planned" | "in_progress" | "released",
            eta: item.eta || undefined,
            created_at: item.created_at,
            updated_at: item.updated_at,
            vote_count: voteCount || 0,
            user_voted: userVoted,
            is_new: isNew,
          };
        })
      );

      // Sort by votes if needed
      if (sortBy === "votes") {
        itemsWithVotes.sort((a, b) => b.vote_count - a.vote_count);
      }

      setRoadmapItems(itemsWithVotes);
    } catch (error) {
      console.error("Erro ao buscar roadmap:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, user?.id]);

  const toggleVote = useCallback(async (itemId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) {
      toast({
        title: "Login necessário",
        description: "Faça login para votar nos itens do roadmap.",
        variant: "destructive",
      });
      return { success: false, error: "User not authenticated" };
    }

    try {
      // Check if user already voted
      const { data: existingVote, error: checkError } = await supabase
        .from('roadmap_votes')
        .select('id')
        .eq('roadmap_item_id', itemId)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error("Erro ao verificar voto:", checkError);
        return { success: false, error: checkError.message };
      }

      let action: string;
      let message: string;

      if (existingVote) {
        // Remove vote
        const { error: deleteError } = await supabase
          .from('roadmap_votes')
          .delete()
          .eq('id', existingVote.id);

        if (deleteError) {
          console.error("Erro ao remover voto:", deleteError);
          toast({
            title: "Erro",
            description: "Erro ao remover voto. Tente novamente.",
            variant: "destructive",
          });
          return { success: false, error: deleteError.message };
        }

        action = "Voto removido";
        message = "Voto removido";
      } else {
        // Add vote
        const { error: insertError } = await supabase
          .from('roadmap_votes')
          .insert([{
            roadmap_item_id: itemId,
            user_id: user.id,
          }]);

        if (insertError) {
          console.error("Erro ao adicionar voto:", insertError);
          toast({
            title: "Erro",
            description: "Erro ao registrar voto. Tente novamente.",
            variant: "destructive",
          });
          return { success: false, error: insertError.message };
        }

        action = "Voto registrado";
        message = "Voto registrado";
      }

      // Log activity
      logActivity(action, "roadmap_votes", itemId, `${action} no roadmap`);

      toast({
        title: "Sucesso!",
        description: message,
      });

      // Refresh roadmap to show updated vote count
      await fetchRoadmapItems();

      return { success: true };

    } catch (error: any) {
      console.error("Erro geral ao votar:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao votar.",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    }
  }, [user?.id, logActivity, fetchRoadmapItems]);

  const createRoadmapItem = useCallback(async (itemData: {
    title: string;
    description: string;
    status: "planned" | "in_progress" | "released";
    eta?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('roadmap_items')
        .insert([itemData]);

      if (error) {
        console.error("Erro ao criar item do roadmap:", error);
        toast({
          title: "Erro",
          description: "Erro ao criar item do roadmap.",
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      logActivity("Item criado", "roadmap_items", undefined, "Novo item do roadmap criado");
      
      toast({
        title: "Sucesso!",
        description: "Item do roadmap criado com sucesso.",
      });

      await fetchRoadmapItems();
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao criar item:", error);
      return { success: false, error: error.message };
    }
  }, [logActivity, fetchRoadmapItems]);

  const updateRoadmapItem = useCallback(async (
    itemId: string,
    updates: {
      title?: string;
      description?: string;
      status?: "planned" | "in_progress" | "released";
      eta?: string;
    }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('roadmap_items')
        .update(updates)
        .eq('id', itemId);

      if (error) {
        console.error("Erro ao atualizar item do roadmap:", error);
        toast({
          title: "Erro",
          description: "Erro ao atualizar item do roadmap.",
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      logActivity("Item atualizado", "roadmap_items", itemId, "Item do roadmap atualizado");
      
      toast({
        title: "Sucesso!",
        description: "Item do roadmap atualizado com sucesso.",
      });

      await fetchRoadmapItems();
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao atualizar item:", error);
      return { success: false, error: error.message };
    }
  }, [logActivity, fetchRoadmapItems]);

  const deleteRoadmapItem = useCallback(async (itemId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // First delete all votes for this item
      await supabase
        .from('roadmap_votes')
        .delete()
        .eq('roadmap_item_id', itemId);

      // Then delete the item
      const { error } = await supabase
        .from('roadmap_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error("Erro ao excluir item do roadmap:", error);
        toast({
          title: "Erro",
          description: "Erro ao excluir item do roadmap.",
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      logActivity("Item excluído", "roadmap_items", itemId, "Item do roadmap excluído");
      
      toast({
        title: "Sucesso!",
        description: "Item do roadmap excluído com sucesso.",
      });

      await fetchRoadmapItems();
      return { success: true };
    } catch (error: any) {
      console.error("Erro ao excluir item:", error);
      return { success: false, error: error.message };
    }
  }, [logActivity, fetchRoadmapItems]);

  // Fetch roadmap items when filters change or component mounts
  useEffect(() => {
    fetchRoadmapItems();
  }, [fetchRoadmapItems]);

  return {
    roadmapItems,
    loading,
    statusFilter,
    sortBy,
    setStatusFilter,
    setSortBy,
    toggleVote,
    createRoadmapItem,
    updateRoadmapItem,
    deleteRoadmapItem,
    refreshRoadmap: fetchRoadmapItems,
  };
};