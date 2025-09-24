import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface BackupHistory {
  id: string;
  backup_type: string;
  status: string;
  file_path?: string | null;
  file_size?: number | null;
  tables_included: string[];
  records_count?: Json;
  started_at: string;
  completed_at?: string | null;
  error_message?: string | null;
  created_by?: string | null;
  backup_data?: Json;
  created_at: string;
  updated_at: string;
}

interface BackupStats {
  total_backups: number;
  successful_backups: number;
  failed_backups: number;
  last_backup_date?: string;
  total_size: number;
}

export const useBackupManager = () => {
  const [backups, setBackups] = useState<BackupHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<BackupStats>({
    total_backups: 0,
    successful_backups: 0,
    failed_backups: 0,
    total_size: 0
  });
  const { isAdmin, user } = useAuth();

  const fetchBackups = useCallback(async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('backup_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching backups:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao carregar histórico de backups',
          variant: 'destructive',
        });
        return;
      }

      const backupData = data || [];
      setBackups(backupData);

      // Calculate statistics
      const totalBackups = backupData.length;
      const successfulBackups = backupData.filter(b => b.status === 'completed').length;
      const failedBackups = backupData.filter(b => b.status === 'failed' || b.error_message).length;
      const lastBackup = backupData[0];
      const totalSize = backupData.reduce((sum, backup) => sum + (backup.file_size || 0), 0);

      setStats({
        total_backups: totalBackups,
        successful_backups: successfulBackups,
        failed_backups: failedBackups,
        last_backup_date: lastBackup?.completed_at || lastBackup?.started_at,
        total_size: totalSize
      });

    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico de backups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const createBackup = useCallback(async (backupType: 'full' | 'incremental' = 'full', customTables?: string[]) => {
    if (!isAdmin || !user) {
      toast({
        title: 'Erro',
        description: 'Acesso negado. Apenas administradores podem criar backups.',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-backup', {
        body: {
          backup_type: backupType,
          tables: customTables
        }
      });

      if (error) {
        console.error('Error creating backup:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao criar backup: ' + error.message,
          variant: 'destructive',
        });
        return null;
      }

      toast({
        title: 'Sucesso',
        description: `Backup ${backupType} criado com sucesso!`,
      });

      // Refresh backups list
      fetchBackups();

      return data;
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar backup',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user, fetchBackups]);

  const deleteBackup = useCallback(async (backupId: string) => {
    if (!isAdmin) return false;

    try {
      const { error } = await supabase
        .from('backup_history')
        .delete()
        .eq('id', backupId);

      if (error) {
        console.error('Error deleting backup:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao excluir backup',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Sucesso',
        description: 'Backup excluído com sucesso',
      });

      // Refresh backups list
      fetchBackups();
      return true;
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir backup',
        variant: 'destructive',
      });
      return false;
    }
  }, [isAdmin, fetchBackups]);

  const downloadBackup = useCallback(async (backupId: string) => {
    if (!isAdmin) return;

    try {
      const { data: backupData, error } = await supabase
        .from('backup_history')
        .select('*')
        .eq('id', backupId)
        .single();

      if (error) {
        console.error('Error fetching backup data:', error);
        toast({
          title: 'Erro',
          description: 'Erro ao baixar backup',
          variant: 'destructive',
        });
        return;
      }

      if (!backupData.backup_data) {
        toast({
          title: 'Aviso',
          description: 'Este backup não contém dados para download',
          variant: 'destructive',
        });
        return;
      }

      // Create downloadable file
      const dataStr = JSON.stringify(backupData.backup_data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `backup_${backupData.backup_type}_${new Date(backupData.created_at).toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast({
        title: 'Sucesso',
        description: 'Backup baixado com sucesso',
      });

    } catch (error) {
      console.error('Error downloading backup:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao baixar backup',
        variant: 'destructive',
      });
    }
  }, [isAdmin]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchBackups();
    }
  }, [isAdmin, fetchBackups]);

  return {
    backups,
    loading,
    stats,
    createBackup,
    deleteBackup,
    downloadBackup,
    fetchBackups,
    formatFileSize
  };
};