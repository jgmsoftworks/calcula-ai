import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  emailVerified: boolean;
  isAdmin: boolean;
  isFornecedor: boolean;
  signUp: (email: string, password: string, fullName?: string, businessName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFornecedor, setIsFornecedor] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update email verification status
        if (session?.user) {
          setEmailVerified(!!session.user.email_confirmed_at);
          
          // Check if user is admin using secure role system
          // CRITICAL: Always use user_is_admin() function, never check profile.is_admin directly
          setTimeout(async () => {
            try {
              // First ensure profile exists
              const { data: profile } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('user_id', session.user.id)
                .maybeSingle();

              if (!profile) {
                // Create profile if it doesn't exist - trigger will initialize role
                await supabase
                  .from('profiles')
                  .insert({
                    user_id: session.user.id,
                    full_name: session.user.user_metadata?.full_name,
                    business_name: session.user.user_metadata?.business_name,
                  });
              }

              // Use security definer function to check admin status
              // This prevents privilege escalation attacks
              const { data: isAdminData, error: adminError } = await supabase
                .rpc('has_role_or_higher', { 
                  required_role: 'admin',
                  check_user_id: session.user.id 
                });

              if (adminError) {
                console.error('Error checking admin status:', adminError);
                setIsAdmin(false);
              } else {
                setIsAdmin(isAdminData || false);
              }

              // Check fornecedor status via RPC call
              const { data: isFornecedorData, error: fornecedorError } = await supabase
                .rpc('user_is_fornecedor', { check_user_id: session.user.id });

              if (fornecedorError) {
                console.error('Error checking fornecedor status:', fornecedorError);
                setIsFornecedor(false);
              } else {
                setIsFornecedor(isFornecedorData || false);
              }
            } catch (error) {
              console.error('Error handling profile:', error);
              setIsAdmin(false);
              setIsFornecedor(false);
            }
          }, 0);
        } else {
          setEmailVerified(false);
          setIsAdmin(false);
          setIsFornecedor(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, businessName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          business_name: businessName,
        }
      }
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
    session,
    loading,
    emailVerified,
    isAdmin,
    isFornecedor,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      resetPassword,
      resendConfirmation,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};