import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  extractPlanFromMetadata,
  getStripe,
  isoFromSeconds,
  markSubscriptionCanceled,
  markSubscriptionPaid,
  syncSubscriptionFromStripe,
} from "../_shared/billing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

if (!webhookSecret) {
  console.warn("[STRIPE-WEBHOOK] STRIPE_WEBHOOK_SECRET not configured");
}

const logEvent = (message: string, payload?: Record<string, unknown>) => {
  const suffix = payload ? ` ${JSON.stringify(payload)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${message}${suffix}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing Stripe signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret ?? "");
  } catch (error) {
    console.error("[STRIPE-WEBHOOK] Signature verification failed", error);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

        if (!subscriptionId) {
          logEvent("Checkout session without subscription", { sessionId: session.id });
          break;
        }

        const plan = extractPlanFromMetadata(session.metadata);
        await syncSubscriptionFromStripe(stripe, subscriptionId, plan);
        logEvent("Processed checkout.session.completed", {
          sessionId: session.id,
          subscriptionId,
          plan,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string | null;

        if (!subscriptionId) {
          logEvent("Invoice without subscription", { invoiceId: invoice.id });
          break;
        }

        await syncSubscriptionFromStripe(stripe, subscriptionId);

        await markSubscriptionPaid({
          stripeSubscriptionId: subscriptionId,
          invoiceId: invoice.id,
          amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
          currency: invoice.currency ?? "brl",
          periodStart: isoFromSeconds(invoice.lines?.data?.[0]?.period?.start ?? invoice.period_start),
          periodEnd: isoFromSeconds(invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end),
        });

        logEvent("Registered invoice.payment_succeeded", {
          invoiceId: invoice.id,
          subscriptionId,
          amount: invoice.amount_paid ?? invoice.amount_due ?? 0,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await markSubscriptionCanceled(subscription.id);
        logEvent("Marked subscription as canceled", { subscriptionId: subscription.id });
        break;
      }

      default:
        logEvent("Unhandled event", { type: event.type });
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (handlerError) {
    console.error(`[STRIPE-WEBHOOK] Error processing ${event.type}`, handlerError);
    return new Response(JSON.stringify({ error: "Handler failure" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
