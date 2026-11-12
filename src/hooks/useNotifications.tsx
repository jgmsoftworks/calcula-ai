import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  created_at: string;
  related_id?: string | null;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const userId = user?.id;
  const requestVersion = useRef(0);
  const accountVersion = useRef(0);

  const loadNotifications = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!userId) { setNotifications([]); setLoading(false); return; }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (version !== requestVersion.current) return;
      setNotifications(data ? data.map(item => ({
        ...item,
        type: item.type as 'info' | 'warning' | 'success' | 'error'
      })) : []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    if (!userId) return;
    const account = accountVersion.current;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId).eq('user_id', userId);

      if (error) throw error;

      if (account !== accountVersion.current) return;
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const account = accountVersion.current;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      if (account !== accountVersion.current) return;
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const createNotification = async (
    title: string,
    message: string,
    type: 'info' | 'warning' | 'success' | 'error' = 'info',
    relatedId?: string
  ) => {
    if (!user) return;
    const account = accountVersion.current;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title,
          message,
          type,
          related_id: relatedId
        })
        .select()
        .single();

      if (error) throw error;

      if (account === accountVersion.current) {
        setNotifications(prev => [data as Notification, ...prev.filter(item => item.id !== data.id)]);
      }
      return data;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
    }
  };

  useEffect(() => {
    accountVersion.current += 1;
    setNotifications([]);
    void loadNotifications();
    return () => { requestVersion.current += 1; accountVersion.current += 1; };
  }, [loadNotifications]);

  // Configurar real-time para novas notificações
  useEffect(() => {
    if (!userId) return;
    let active = true;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (!active) return;
          const newNotification = {
            ...payload.new,
            type: payload.new.type as 'info' | 'warning' | 'success' | 'error'
          } as Notification;
          setNotifications(prev => [newNotification, ...prev.filter(item => item.id !== newNotification.id)]);
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
  };
};