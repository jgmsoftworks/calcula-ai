import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import type { Database as GeneratedDatabase, Json } from '../../../src/integrations/supabase/types.ts';
export type { Tables, TablesInsert, TablesUpdate, Json } from '../../../src/integrations/supabase/types.ts';

type Table<Row, Insert> = { Row: Row; Insert: Insert; Update: Partial<Insert>; Relationships: [] };
type Checkout = {
  session_id: string; subscription_id: string | null; customer_id: string; email: string;
  user_id: string | null; plan: string | null; status: 'pending' | 'approved' | 'trial' | 'failed';
  needs_password_setup: boolean; updated_at: string;
};
type Email = { key: string; payload: Json | null; provider_id: string | null; created_at: string; sent_at: string | null };
// Server-only tables/RPCs already defined in 20260930150000_payment_access_flow.sql
// and 20261001133508_billing_webhook_vault.sql, absent from the browser generator snapshot.
// This extends the compile-time schema only; it does not modify or migrate a database.
export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Tables' | 'Functions'> & {
    Tables: GeneratedDatabase['public']['Tables'] & {
      billing_checkouts: Table<Checkout, Pick<Checkout, 'session_id' | 'customer_id' | 'email' | 'status'> & Partial<Checkout>>;
      billing_emails: Table<Email, Pick<Email, 'key'> & Partial<Email>>;
    };
    Functions: GeneratedDatabase['public']['Functions'] & {
      claim_billing_job: { Args: { job_key: string; token: string }; Returns: string };
      release_billing_job: { Args: { job_key: string; token: string; completed?: boolean }; Returns: undefined };
      billing_webhook_signing_secret: { Args: Record<never, never>; Returns: string };
    };
  };
};
export type AppDatabaseClient = SupabaseClient<Database>;
