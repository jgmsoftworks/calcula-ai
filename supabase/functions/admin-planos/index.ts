// Central de gestão de planos (Master ADM).
// Ações: list, update_plano, subscribers, historico
// Ao alterar preço, cria um NOVO Stripe Price (nunca apaga o antigo) para não
// afetar assinantes legados (grandfathering).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import {
  corsHeaders,
  handlePreflight,
  jsonResponse,
  requireAdmin,
} from "../_shared/stripeAdmin.ts";

const log = (step: string, details?: unknown) =>
  console.log(`[ADMIN-PLANOS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const { supabase, stripe, userId } = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "list";
    log("action", { action, userId });

    switch (action) {
      case "list": {
        const { data, error } = await supabase
          .from("planos")
          .select("*")
          .order("ordem", { ascending: true });
        if (error) throw error;
        return jsonResponse({ planos: data });
      }

      case "historico": {
        const { data, error } = await supabase
          .from("planos_precos_historico")
          .select("*")
          .order("vigente_de", { ascending: false })
          .limit(200);
        if (error) throw error;
        return jsonResponse({ historico: data });
      }

      case "subscribers": {
        // Assinantes agrupados por plano no banco + assinaturas ativas no Stripe
        const { data: perfis, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, business_name, plan, plan_expires_at, created_at")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (error) throw error;

        const subs = await stripe.subscriptions.list({
          status: "active",
          limit: 100,
          expand: ["data.customer"],
        });

        const stripeSubs = subs.data.map((s) => {
          const customer = s.customer as Stripe.Customer | string;
          const item = s.items.data[0];
          return {
            id: s.id,
            email: typeof customer === "string" ? null : customer.email,
            amount: (item?.price.unit_amount ?? 0) / 100,
            price_id: item?.price.id ?? null,
            product_id:
              typeof item?.price.product === "string" ? item?.price.product : null,
            interval: item?.price.recurring?.interval ?? null,
            current_period_end: s.current_period_end,
            cancel_at_period_end: s.cancel_at_period_end,
          };
        });

        return jsonResponse({ perfis, stripeSubs });
      }

      case "update_plano": {
        const slug = String(body.slug ?? "").trim();
        if (!slug) throw new Error("slug obrigatório");

        const { data: plano, error: planoErr } = await supabase
          .from("planos")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();
        if (planoErr) throw planoErr;
        if (!plano) throw new Error("Plano não encontrado");

        const updates: Record<string, unknown> = { updated_by: userId };

        if (typeof body.nome_publico === "string" && body.nome_publico.trim()) {
          updates.nome_publico = body.nome_publico.trim();
        }
        if (typeof body.descricao === "string") updates.descricao = body.descricao;
        if (Array.isArray(body.features)) updates.features = body.features;
        if (body.limites && typeof body.limites === "object") updates.limites = body.limites;
        if (typeof body.ativo === "boolean") updates.ativo = body.ativo;

        const novoPreco = Number.isFinite(Number(body.preco_centavos))
          ? Math.round(Number(body.preco_centavos))
          : null;
        const precoMudou =
          novoPreco !== null && novoPreco !== plano.preco_centavos;

        if (precoMudou) {
          if (novoPreco < 0) throw new Error("Preço inválido");

          if (novoPreco > 0) {
            // Garantir produto no Stripe
            let productId = plano.stripe_product_id as string | null;
            if (!productId) {
              const product = await stripe.products.create({
                name: (updates.nome_publico as string) ?? plano.nome_publico,
                description: (updates.descricao as string) ?? plano.descricao ?? undefined,
              });
              productId = product.id;
            } else if (updates.nome_publico) {
              await stripe.products.update(productId, {
                name: updates.nome_publico as string,
              });
            }

            // NOVO price — o antigo continua ativo para assinantes legados
            const price = await stripe.prices.create({
              product: productId,
              currency: plano.moeda ?? "brl",
              unit_amount: novoPreco,
              recurring: { interval: plano.periodicidade === "yearly" ? "year" : "month" },
            });

            // Fecha vigência do preço anterior no histórico
            await supabase
              .from("planos_precos_historico")
              .update({ vigente_ate: new Date().toISOString() })
              .eq("plano_slug", slug)
              .is("vigente_ate", null);

            await supabase.from("planos_precos_historico").insert({
              plano_slug: slug,
              preco_centavos: novoPreco,
              moeda: plano.moeda ?? "brl",
              periodicidade: plano.periodicidade ?? "monthly",
              stripe_price_id: price.id,
              stripe_product_id: productId,
              versao_preco: (plano.versao_preco ?? 1) + 1,
              vigente_de: new Date().toISOString(),
              criado_por: userId,
              observacao: body.observacao ?? "Alteração via Master ADM",
            });

            updates.preco_centavos = novoPreco;
            updates.stripe_price_id = price.id;
            updates.stripe_product_id = productId;
            updates.versao_preco = (plano.versao_preco ?? 1) + 1;
            log("novo price criado", { slug, priceId: price.id, novoPreco });
          } else {
            updates.preco_centavos = 0;
            updates.stripe_price_id = null;
            updates.versao_preco = (plano.versao_preco ?? 1) + 1;
          }
        }

        const { data: atualizado, error: upErr } = await supabase
          .from("planos")
          .update(updates)
          .eq("slug", slug)
          .select()
          .single();
        if (upErr) throw upErr;

        // Auditoria
        await supabase.from("admin_actions").insert({
          admin_user_id: userId,
          action_type: precoMudou ? "plano_preco_alterado" : "plano_atualizado",
          old_value: JSON.stringify({
            nome_publico: plano.nome_publico,
            preco_centavos: plano.preco_centavos,
            stripe_price_id: plano.stripe_price_id,
          }),
          new_value: JSON.stringify({ slug, ...updates }),
          reason: body.observacao ?? "Alteração de plano via Master ADM",
        });

        return jsonResponse({ plano: atualizado, novo_price: precoMudou });
      }

      default:
        return jsonResponse({ error: "Ação inválida" }, 400);
    }
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin-planos] erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
