import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  buildAuthCookie,
  ensureCheckoutSession,
  getStripe,
  issueLoginJWT,
  upsertUserByEmail,
  upsertSubscription,
} from "../_shared/billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://calculaaibr.com",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

const redirectResponse = (location: string, cookie?: string) => {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
  });

  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  if (cookie) {
    headers.set("Set-Cookie", cookie);
  }

  return new Response(null, { status: 302, headers });
};

const errorRedirect = (code: string) => redirectResponse(`/planos?e=${code}`);

const handleCheckoutSuccess = async (stripe: Stripe, sessionId: string) => {
  const { email, subscriptionId, plan } = await ensureCheckoutSession(stripe, sessionId);
  const user = await upsertUserByEmail(email);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  await upsertSubscription({
    userId: user.id,
    stripeSubscriptionId: subscription.id,
    plan,
    status: subscription.status,
    currentPeriodEnd,
  });

  const token = await issueLoginJWT(user.id);
  const cookie = buildAuthCookie(token);

  return redirectResponse("/dashboard", cookie);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    if (!sessionId) {
      return errorRedirect("missing_session");
    }

    const stripe = getStripe();

    let response: Response;
    try {
      response = await handleCheckoutSuccess(stripe, sessionId);
    } catch (checkoutError) {
      const errorMessage = checkoutError instanceof Error ? checkoutError.message : String(checkoutError);

      if (errorMessage === "payment_not_confirmed") {
        return errorRedirect("payment_not_confirmed");
      }

      if (errorMessage === "missing_email") {
        return errorRedirect("missing_email");
      }

      if (errorMessage === "missing_subscription") {
        return errorRedirect("missing_subscription");
      }

      console.error(`[STRIPE-COMPLETE] Error handling session ${sessionId}`, checkoutError);
      return errorRedirect("session_error");
    }

    return response;
  } catch (error) {
    console.error("[STRIPE-COMPLETE] Unexpected error", error);
    return errorRedirect("server_error");
  }
});
