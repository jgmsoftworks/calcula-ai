import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const AUTH_COOKIE_NAME = "calc_auth";
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

let stripeClient: Stripe | null = null;
let supabaseClient: SupabaseClient | null = null;
let jwtKeyPromise: Promise<CryptoKey> | null = null;

const encoder = new TextEncoder();

export type UpsertSubscriptionPayload = {
  userId: string;
  stripeSubscriptionId: string;
  plan: string;
  status: string;
  currentPeriodEnd?: string | null;
};

export type MarkSubscriptionPaidPayload = {
  stripeSubscriptionId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  periodStart?: string | null;
  periodEnd?: string | null;
};

const buildSupabaseClient = () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
};

const getJwtKey = async () => {
  const secret = Deno.env.get("JWT_SECRET");
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!jwtKeyPromise) {
    jwtKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }

  return jwtKeyPromise;
};

const normaliseDate = (value?: number | null): string | null => {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
};

const ensureStripe = () => {
  if (stripeClient) return stripeClient;

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  stripeClient = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });
  return stripeClient;
};

export const getStripe = () => ensureStripe();

export const getSupabase = () => {
  if (!supabaseClient) {
    supabaseClient = buildSupabaseClient();
  }
  return supabaseClient;
};

export const issueLoginJWT = async (userId: string) => {
  const key = await getJwtKey();
  const now = Math.floor(Date.now() / 1000);

  return await create({
    alg: "HS256",
    typ: "JWT",
  },
  { sub: userId, iat: now, exp: getNumericDate(60 * 10) },
  key);
};

export const buildAuthCookie = (token: string) => {
  const appDomain = Deno.env.get("APP_DOMAIN") ?? "https://calculaaibr.com";
  const hostname = (() => {
    try {
      return new URL(appDomain).hostname;
    } catch (_error) {
      return appDomain.replace(/^https?:\/\//, "");
    }
  })();

  const domain = hostname === "localhost" ? "localhost" : `.${hostname}`;

  const parts = [
    `${AUTH_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${AUTH_COOKIE_MAX_AGE}`,
    `Domain=${domain}`,
  ];

  const expires = new Date(Date.now() + AUTH_COOKIE_MAX_AGE * 1000).toUTCString();
  parts.push(`Expires=${expires}`);

  return parts.join("; ");
};

export const upsertUserByEmail = async (email: string) => {
  const client = getSupabase();

  const { data: existing, error: selectError } = await client
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to fetch user by email: ${selectError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: insertError } = await client
    .from("users")
    .insert({ email })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to create user: ${insertError.message}`);
  }

  return created;
};

export const upsertSubscription = async ({
  userId,
  stripeSubscriptionId,
  plan,
  status,
  currentPeriodEnd,
}: UpsertSubscriptionPayload) => {
  const client = getSupabase();

  const { data, error } = await client
    .from("subscriptions")
    .upsert({
      user_id: userId,
      stripe_subscription_id: stripeSubscriptionId,
      provider: "stripe",
      plan,
      status,
      current_period_end: currentPeriodEnd ?? null,
    }, { onConflict: "stripe_subscription_id" })
    .select("id, user_id, plan, status, current_period_end")
    .single();

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }

  return data;
};

export const markSubscriptionPaid = async ({
  stripeSubscriptionId,
  invoiceId,
  amount,
  currency,
  periodStart,
  periodEnd,
}: MarkSubscriptionPaidPayload) => {
  const client = getSupabase();

  const { data: subscription, error: subError } = await client
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (subError) {
    throw new Error(`Failed to fetch subscription: ${subError.message}`);
  }

  if (!subscription) {
    console.log(`[BILLING] Subscription ${stripeSubscriptionId} not found while marking invoice ${invoiceId}`);
    return null;
  }

  const updateData: Record<string, unknown> = { status: "active" };
  if (periodEnd) {
    updateData.current_period_end = periodEnd;
  }

  const { error: updateError } = await client
    .from("subscriptions")
    .update(updateData)
    .eq("id", subscription.id);

  if (updateError) {
    throw new Error(`Failed to update subscription period: ${updateError.message}`);
  }

  const { error: invoiceError } = await client
    .from("invoices")
    .upsert({
      subscription_id: subscription.id,
      stripe_invoice_id: invoiceId,
      amount,
      currency,
      period_start: periodStart ?? null,
      period_end: periodEnd ?? null,
    }, { onConflict: "stripe_invoice_id" });

  if (invoiceError) {
    throw new Error(`Failed to upsert invoice: ${invoiceError.message}`);
  }

  return subscription.id;
};

export const markSubscriptionCanceled = async (stripeSubscriptionId: string) => {
  const client = getSupabase();
  const { error } = await client
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    throw new Error(`Failed to mark subscription as canceled: ${error.message}`);
  }
};

export const extractPlanFromMetadata = (metadata?: Stripe.Metadata | null) => {
  const plan = metadata?.plan ?? metadata?.Plan ?? metadata?.PLAN;
  return plan ? String(plan).toLowerCase() : "profissional";
};

export const syncSubscriptionFromStripe = async (
  stripe: Stripe,
  subscriptionId: string,
  explicitPlan?: string,
) => {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);

  if (!customer || (customer as Stripe.DeletedCustomer).deleted) {
    throw new Error(`Customer ${customerId} not found for subscription ${subscriptionId}`);
  }

  const email = (customer as Stripe.Customer).email;
  if (!email) {
    throw new Error(`Customer ${customerId} missing email`);
  }

  const user = await upsertUserByEmail(email);
  const plan = explicitPlan ?? extractPlanFromMetadata(subscription.metadata);
  const currentPeriodEnd = normaliseDate(subscription.current_period_end);

  await upsertSubscription({
    userId: user.id,
    stripeSubscriptionId: subscription.id,
    plan,
    status: subscription.status,
    currentPeriodEnd,
  });

  return { userId: user.id, subscription };
};

export const ensureCheckoutSession = async (stripe: Stripe, sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session) {
    throw new Error(`Checkout session ${sessionId} not found`);
  }

  if (session.payment_status !== "paid") {
    throw new Error("payment_not_confirmed");
  }

  const email = session.customer_details?.email ?? session.customer_email ?? undefined;
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  if (!email) {
    throw new Error("missing_email");
  }

  if (!subscriptionId) {
    throw new Error("missing_subscription");
  }

  const plan = extractPlanFromMetadata(session.metadata);

  return { email, subscriptionId, plan, session };
};

export const isoFromSeconds = (value?: number | null) => {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
};

export const centsToCurrency = (amount?: number | null) => {
  if (!amount) return 0;
  return amount;
};
