import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import admin from "firebase-admin";
import { MercadoPagoConfig, Preference } from 'mercadopago';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicialização do Firebase Admin (Opcional para automação de Webhooks)
const firebaseServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
if (firebaseServiceAccount) {
  try {
    const serviceAccount = JSON.parse(firebaseServiceAccount);
    const firebaseAdmin = (admin as any).default || admin;
    
    if (firebaseAdmin.apps.length === 0) {
      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin inicializado.");
    }
  } catch (e) {
    console.error("❌ Erro ao inicializar Firebase Admin:", e);
  }
}

// Inicialização Preguiçosa do Stripe
let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      console.warn("⚠️ STRIPE_SECRET_KEY não configurada. Pagamentos desativados.");
      return null;
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

// Inicialização do Mercado Pago
let mpClient: MercadoPagoConfig | null = null;
function getMercadoPago() {
  if (!mpClient) {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn("⚠️ MP_ACCESS_TOKEN não configurada. Pagamentos Mercado Pago desativados.");
      return null;
    }
    mpClient = new MercadoPagoConfig({ accessToken });
  }
  return mpClient;
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON (exceto para o webhook que precisa do corpo bruto)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Servir arquivos estáticos da pasta public explicitamente
app.use(express.static(path.join(__dirname, "public")));

// Rota específica para o Service Worker para garantir o MIME type correto
app.get("/sw.js", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "sw.js"), {
    headers: {
      'Content-Type': 'application/javascript'
    }
  });
});

// Rota de Webhook do Stripe
app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !sig || !webhookSecret) {
    console.warn("⚠️ Webhook recebido mas Stripe ou Segredo não configurados.");
    return res.status(400).send("Webhook Error: Missing configuration");
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Erro na assinatura do Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manipular o evento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    
    console.log(`💰 Pagamento confirmado para o usuário: ${userId}`);

    const firebaseAdmin = (admin as any).default || admin;
    if (userId && firebaseAdmin.apps.length > 0) {
      try {
        const db = firebaseAdmin.firestore();
        const userRef = db.collection('users').doc(userId);
        
        // Busca a config atual para não sobrescrever tudo
        const doc = await userRef.get();
        const currentData = doc.exists ? doc.data() : {};
        const currentConfig = currentData?.config || {};

        await userRef.set({
          config: {
            ...currentConfig,
            profile: {
              ...(currentConfig.profile || {}),
              isPro: true,
              subscriptionStatus: 'active',
              updatedAt: new Date().toISOString()
            }
          }
        }, { merge: true });
        
        console.log(`✅ Status PRO ativado no Firestore para ${userId}`);
      } catch (e) {
        console.error("❌ Erro ao atualizar Firestore via Webhook:", e);
      }
    }
  }

  res.json({ received: true });
});

// API de Saúde
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "RotaFinanceira Backend is running" });
});

// Rota de redirecionamento direto (GET) para evitar problemas de fetch/CORS/Popups
app.get("/api/checkout-redirect", async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).send("Stripe não configurado.");
  }

  const { userId, plan } = req.query;
  if (!userId) {
    return res.status(400).send("ID do usuário é obrigatório.");
  }

  const appUrl = process.env.APP_URL || `https://${req.get('host')}`;
  const isYearly = plan === 'yearly';
  const amount = isYearly ? 11990 : 1990;
  const interval = isYearly ? 'year' : 'month';

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `RotaFinanceira PRO - ${isYearly ? 'Anual' : 'Mensal'}`,
              description: "Acesso total, backup em nuvem e IA ilimitada.",
            },
            unit_amount: amount,
            recurring: {
              interval: interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/api/stripe-callback?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${appUrl}/api/stripe-callback?status=cancel`,
      client_reference_id: userId as string,
      metadata: {
        userId: userId as string,
        planType: (plan as string) || 'monthly',
      },
    });

    // Redireciona o navegador diretamente para o Stripe
    res.redirect(303, session.url!);
  } catch (error: any) {
    console.error("❌ Erro no redirecionamento Stripe:", error);
    res.status(500).send(`Erro ao iniciar checkout: ${error.message}`);
  }
});

// Rota do Stripe Checkout (mantida para compatibilidade se necessário)
app.post("/api/create-checkout-session", async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).json({ error: "Stripe não configurado no servidor." });
  }

  const { userId, planType } = req.body;
  const appUrl = process.env.APP_URL || `https://${req.get('host')}`;

  const isYearly = planType === 'yearly';
  const amount = isYearly ? 11990 : 1990; // R$ 119,90 ou R$ 19,90
  const interval = isYearly ? 'year' : 'month';

  try {
    console.log(`🛒 Criando sessão de checkout para o usuário: ${userId}, plano: ${planType}`);
    
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `RotaFinanceira PRO - ${isYearly ? 'Anual' : 'Mensal'}`,
              description: "Acesso total, backup em nuvem e IA ilimitada.",
            },
            unit_amount: amount,
            recurring: {
              interval: interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${appUrl}/api/stripe-callback?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${appUrl}/api/stripe-callback?status=cancel`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        planType: planType || 'monthly',
      },
    });

    console.log(`✅ Sessão criada com sucesso: ${session.id}`);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Erro ao criar sessão no Stripe:", error);
    res.status(500).json({ error: `Erro no Stripe: ${error.message}` });
  }
});

// Rota para verificar se o pagamento foi concluído
app.get("/api/verify-session", async (req, res) => {
  const stripe = getStripe();
  const { session_id } = req.query;

  if (!stripe || !session_id) {
    return res.status(400).json({ error: "Sessão inválida." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id as string);
    if (session.payment_status === "paid") {
      res.json({ success: true, userId: session.client_reference_id });
    } else {
      res.json({ success: false });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Handler para o retorno do Stripe (Popup)
app.get("/api/stripe-callback", (req, res) => {
  const { session_id, status } = req.query;
  
  res.send(`
    <html>
      <body style="background: #0f172a; color: white; font-family: sans-serif; display: flex; items-center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
          <h2 style="margin-bottom: 10px;">${status === 'success' ? 'Pagamento Processado! 🎉' : 'Pagamento Cancelado'}</h2>
          <p style="color: #94a3b8; font-size: 14px;">Esta janela fechará automaticamente...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'STRIPE_CHECKOUT_COMPLETED', 
                status: '${status}',
                sessionId: '${session_id || ''}' 
              }, '*');
              setTimeout(() => window.close(), 2000);
            } else {
              window.location.href = '/';
            }
          </script>
        </div>
      </body>
    </html>
  `);
});

// --- MERCADO PAGO ROUTES ---

// Criar Preferência de Pagamento (Checkout)
app.post("/api/mercadopago/create-preference", async (req, res) => {
  const client = getMercadoPago();
  if (!client) {
    return res.status(500).json({ error: "Mercado Pago não configurado no servidor." });
  }

  const { userId, planType, email } = req.body;
  const appUrl = process.env.APP_URL || `https://${req.get('host')}`;

  const isYearly = planType === 'yearly';
  const amount = isYearly ? 119.90 : 19.90;
  const title = `RotaFinanceira PRO - ${isYearly ? 'Anual' : 'Mensal'}`;

  try {
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: planType,
            title: title,
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL'
          }
        ],
        payer: {
          email: email || 'usuario@rotafinanceira.com'
        },
        back_urls: {
          success: `${appUrl}/api/mercadopago/callback?status=success&userId=${userId}`,
          failure: `${appUrl}/api/mercadopago/callback?status=failure`,
          pending: `${appUrl}/api/mercadopago/callback?status=pending`
        },
        auto_return: 'approved',
        external_reference: userId, // Importante para o Webhook
        metadata: {
          userId: userId,
          planType: planType
        }
      }
    });

    res.json({ id: result.id, init_point: result.init_point });
  } catch (error: any) {
    console.error("❌ Erro ao criar preferência no Mercado Pago:", error);
    res.status(500).json({ error: error.message });
  }
});

// Callback do Mercado Pago (Redirecionamento do usuário)
app.get("/api/mercadopago/callback", (req, res) => {
  const { status, userId } = req.query;
  
  res.send(`
    <html>
      <body style="background: #0f172a; color: white; font-family: sans-serif; display: flex; items-center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
          <h2 style="margin-bottom: 10px;">${status === 'approved' || status === 'success' ? 'Pagamento Recebido! 🎉' : 'Processando Pagamento...'}</h2>
          <p style="color: #94a3b8; font-size: 14px;">Estamos atualizando seu acesso. Esta janela fechará automaticamente...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'MP_PAYMENT_COMPLETED', 
                status: '${status}',
                userId: '${userId || ''}'
              }, '*');
              setTimeout(() => window.close(), 3000);
            } else {
              window.location.href = '/';
            }
          </script>
        </div>
      </body>
    </html>
  `);
});

// Webhook do Mercado Pago (Notificação Server-to-Server)
app.post("/api/mercadopago/webhook", async (req, res) => {
  const { action, data } = req.body;
  
  // O Mercado Pago envia várias notificações. Queremos apenas quando um pagamento é criado/atualizado.
  if (action === "payment.created" || action === "payment.updated" || req.query.topic === "payment") {
    const paymentId = data?.id || req.query.id;
    const client = getMercadoPago();
    
    if (paymentId && client) {
      try {
        // Busca os detalhes do pagamento para confirmar o status
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        });
        const paymentData = await response.json();
        
        if (paymentData.status === 'approved') {
          const userId = paymentData.external_reference;
          console.log(`💰 [MP] Pagamento aprovado para o usuário: ${userId}`);

          const firebaseAdmin = (admin as any).default || admin;
          if (userId && firebaseAdmin.apps.length > 0) {
            const db = firebaseAdmin.firestore();
            const userRef = db.collection('users').doc(userId);
            
            await userRef.set({
              config: {
                profile: {
                  isPro: true,
                  subscriptionStatus: 'active',
                  updatedAt: new Date().toISOString()
                }
              }
            }, { merge: true });
            
            console.log(`✅ [MP] Status PRO ativado para ${userId}`);
          }
        }
      } catch (e) {
        console.error("❌ Erro ao processar Webhook do Mercado Pago:", e);
      }
    }
  }

  res.status(200).send("OK");
});

// Vite middleware para desenvolvimento
if (process.env.NODE_ENV !== "production") {
  import("vite").then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }).catch(e => {
    console.warn("⚠️ Falha ao carregar Vite middleware em desenvolvimento:", e);
  });
} else {
  // Servir arquivos estáticos em produção
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

// Apenas inicia o servidor se não estiver em ambiente serverless
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

export default app;
