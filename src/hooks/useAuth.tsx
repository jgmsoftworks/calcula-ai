import type { BusinessCountry, AppLanguage } from '@/lib/business-region';

import { createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailVerified: boolean;
  isAdmin: boolean;
  isFornecedor: boolean;
  signUp: (email: string, password: string, fullName?: string, businessName?: string, phone?: string, country?: BusinessCountry, language?: AppLanguage) => Promise<{ data: Awaited<ReturnType<typeof supabase.auth.signUp>>['data']; error: import('@supabase/supabase-js').AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: import('@supabase/supabase-js').AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null; openedInNewTab: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: import('@supabase/supabase-js').AuthError | null }>;
  resendConfirmation: (email: string) => Promise<{ error: import('@supabase/supabase-js').AuthError | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
