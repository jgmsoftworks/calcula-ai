import { Stripe, billingDb, billingStripe, withBillingLock, fulfillCheckout, syncBillingSubscription, invoiceSubscription, notifyInvoice } from '../_shared/billing.ts';
import { billingWebhookSecret } from '../_shared/billingWebhook.ts';
const logStep = (step: string, _details?: unknown) => console.log(`[STRIPE-WEBHOOK] ${step}`);
const logError = (_error: unknown, context: string, _details?: unknown) => console.error(`[STRIPE-WEBHOOK] ${context}`);

// Existing affiliate accounting is preserved separately from account fulfillment.
async function recordAffiliateEvent(event: any, stripe: any, supabaseClient: any) {
  switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        const session = await stripe.checkout.sessions.retrieve((event.data.object as any).id);
        if (session.payment_status !== 'paid') break;
        const { data: recordedSale, error: saleLookupError } = await supabaseClient.from('affiliate_sales').select('id').eq('stripe_session_id', session.id).limit(1).maybeSingle();
        if (saleLookupError) throw new Error('affiliate_lookup_failed');
        if (recordedSale) break;
        
        logStep("Processing checkout session completed", {
          sessionId: session.id,
          customerId: session.customer,
          amountTotal: session.amount_total,
          metadata: session.metadata
        });

        // Verificar se há código de afiliado nos metadados
        const affiliateCode = session.metadata?.affiliate_code;
        if (affiliateCode) {
          try {
            logStep("Processing affiliate sale", { 
              affiliateCode, 
              sessionId: session.id,
              customerId: session.customer 
            });

            // Buscar link de afiliado
            const { data: affiliateLink, error: linkError } = await supabaseClient
              .from('affiliate_links')
              .select(`
                *,
                affiliate:affiliates(*)
              `)
              .eq('link_code', affiliateCode)
              .eq('is_active', true)
              .single();

            if (linkError || !affiliateLink) {
              logStep("Affiliate link not found", { affiliateCode });
            } else {
              // Recuperar customer do Stripe
              const customer = await stripe.customers.retrieve(session.customer as string);
              const customerEmail = (customer as Stripe.Customer).email;
              const customerName = (customer as Stripe.Customer).name;
              
              // Determinar tipo de plano e valor
              const planType = session.metadata?.plan_type || 'professional';
              const saleAmount = (session.amount_total || 0) / 100; // Converter de centavos
              
              // Calcular comissão
              const affiliate = affiliateLink.affiliate;
              let commissionAmount = 0;
              
              if (affiliate.commission_type === 'percentage') {
                commissionAmount = (saleAmount * affiliate.commission_percentage) / 100;
              } else {
                commissionAmount = affiliate.commission_fixed_amount || 0;
              }

              // Registrar venda de afiliado
              const { data: sale, error: saleError } = await supabaseClient
                .from('affiliate_sales')
                .insert({
                  affiliate_id: affiliate.id,
                  affiliate_link_id: affiliateLink.id,
                  customer_email: customerEmail || '',
                  customer_name: customerName,
                  plan_type: planType,
                  sale_amount: saleAmount,
                  commission_amount: commissionAmount,
                  stripe_session_id: session.id,
                  status: 'confirmed'
                })
                .select()
                .single();

              if (saleError) {
                logError(saleError, "Failed to create affiliate sale", { affiliateCode, sessionId: session.id });
              } else {
                logStep("Affiliate sale created", { 
                  saleId: sale.id, 
                  affiliateId: affiliate.id,
                  commissionAmount 
                });

                // Criar comissão
                const { error: commissionError } = await supabaseClient
                  .from('affiliate_commissions')
                  .insert({
                    affiliate_id: affiliate.id,
                    sale_id: sale.id,
                    amount: commissionAmount,
                    status: 'pending'
                  });

                if (commissionError) {
                  logError(commissionError, "Failed to create commission", { saleId: sale.id });
                } else {
                  logStep("Commission created successfully", { 
                    affiliateId: affiliate.id,
                    amount: commissionAmount 
                  });
                }

                // Atualizar contador de conversões no link
                await supabaseClient
                  .from('affiliate_links')
                  .update({ 
                    conversions_count: (affiliateLink.conversions_count || 0) + 1 
                  })
                  .eq('id', affiliateLink.id);

                // Atualizar totais do afiliado
                await supabaseClient
                  .from('affiliates')
                  .update({
                    total_sales: (affiliate.total_sales || 0) + saleAmount,
                    total_commissions: (affiliate.total_commissions || 0) + commissionAmount,
                    total_customers: (affiliate.total_customers || 0) + 1
                  })
                  .eq('id', affiliate.id);
              }
            }
          } catch (affiliateError) {
            logError(affiliateError, "Error processing affiliate sale", { 
              affiliateCode, 
              sessionId: session.id 
            });
          }
        }
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as any;
        
        logStep("Processing successful payment (recurrence)", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          amountPaid: invoice.amount_paid,
          subscriptionId: invoiceSubscription(invoice)
        });

        // Processar comissões recorrentes se houver assinatura
        if (invoiceSubscription(invoice) && invoice.billing_reason === 'subscription_cycle') {
          try {
            // Buscar customer do Stripe
            const customer = await stripe.customers.retrieve(invoice.customer as string);
            const customerEmail = (customer as Stripe.Customer).email;

            if (customerEmail) {
              // Buscar vendas existentes deste cliente para encontrar afiliados
              const { data: existingSales, error: salesError } = await supabaseClient
                .from('affiliate_sales')
                .select(`
                  *,
                  affiliate:affiliates(*)
                `)
                .eq('customer_email', customerEmail)
                .eq('status', 'confirmed');

              if (salesError) {
                logError(salesError, "Error fetching existing sales for recurrence", { customerEmail });
              } else if (existingSales && existingSales.length > 0) {
                // Para cada venda encontrada, criar comissão recorrente
                for (const sale of existingSales) {
                  const affiliate = sale.affiliate;
                  
                  // Contar ciclos existentes para esta venda
                  const { data: existingCommissions } = await supabaseClient
                    .from('affiliate_commissions')
                    .select('cycle_number')
                    .eq('sale_id', sale.id)
                    .order('cycle_number', { ascending: false })
                    .limit(1);

                  const nextCycle = existingCommissions && existingCommissions.length > 0 
                    ? (existingCommissions[0].cycle_number || 1) + 1 
                    : 2; // Primeiro ciclo já foi criado no checkout

                  // Calcular comissão baseada no valor pago (em centavos)
                  const amountPaid = (invoice.amount_paid || 0) / 100; // Converter de centavos
                  let commissionAmount = 0;
                  
                  if (affiliate.commission_type === 'percentage') {
                    commissionAmount = (amountPaid * affiliate.commission_percentage) / 100;
                  } else {
                    commissionAmount = affiliate.commission_fixed_amount || 0;
                  }

                  // Criar comissão recorrente
                  const { error: commissionError } = await supabaseClient
                    .from('affiliate_commissions')
                    .insert({
                      affiliate_id: affiliate.id,
                      sale_id: sale.id,
                      amount: commissionAmount,
                      status: 'pending',
                      cycle_number: nextCycle,
                      recurring_from_sale_id: sale.id
                    });

                  if (commissionError) {
                    logError(commissionError, "Failed to create recurring commission", { 
                      saleId: sale.id,
                      cycle: nextCycle 
                    });
                  } else {
                    logStep("Recurring commission created", { 
                      affiliateId: affiliate.id,
                      saleId: sale.id,
                      cycle: nextCycle,
                      amount: commissionAmount 
                    });

                    // Atualizar totais do afiliado
                    await supabaseClient
                      .from('affiliates')
                      .update({
                        total_commissions: (affiliate.total_commissions || 0) + commissionAmount
                      })
                      .eq('id', affiliate.id);
                  }
                }
              }
            }
          } catch (recurrenceError) {
            logError(recurrenceError, "Error processing recurring commissions", { 
              invoiceId: invoice.id 
            });
          }
        }
        break;


  }
}

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });
  const stripe = billingStripe();
  const db = billingDb();
  let signingSecret: string;
  try { signingSecret = await billingWebhookSecret(db); }
  catch { return new Response('Webhook temporarily unavailable', { status: 503 }); }
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, signingSecret, undefined, Stripe.createSubtleCryptoProvider());
  } catch { return new Response('Invalid signature', { status: 400 }); }
  try {
    await withBillingLock(db, `event:${event.id}`, async () => {
      const object = event.data.object as any;
      if (['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed'].includes(event.type)) {
        await fulfillCheckout(db, stripe, object.id, event.type === 'checkout.session.async_payment_failed');
      } else if (['customer.subscription.updated','customer.subscription.deleted'].includes(event.type)) {
        await syncBillingSubscription(db, stripe, object.id);
      } else if (['invoice.payment_succeeded','invoice.payment_failed'].includes(event.type)) {
        const subscriptionId = invoiceSubscription(object);
        if (subscriptionId) {
          await syncBillingSubscription(db, stripe, subscriptionId);
          await notifyInvoice(db, stripe, object, event.type === 'invoice.payment_failed');
          // Retry initial account provisioning if invoice and checkout arrive out of order.
          const sessions = await stripe.checkout.sessions.list({ subscription: subscriptionId, limit: 10 });
          for (const session of sessions.data) {
            if (session.status === 'complete') await fulfillCheckout(db, stripe, session.id);
          }
        }
      }
      await recordAffiliateEvent(event, stripe, db);
      const { error } = await db.from('stripe_events').upsert({ stripe_event_id: event.id, event_type: event.type, processed: true, processed_at: new Date().toISOString(), error_message: null }, { onConflict: 'stripe_event_id' });
      if (error) throw new Error('event_receipt_failed');
    }, true);
    return Response.json({ received: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'processing_failed';
    console.error('[STRIPE-WEBHOOK]', event.id, code);
    // A failed step is NOT acknowledged: Stripe can safely retry the event.
    return Response.json({ error: 'Processing failed; retry required' }, { status: 500 });
  }
});
