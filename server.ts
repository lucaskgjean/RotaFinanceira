import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicialização do Firebase Admin (Opcional para automação de Webhooks)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    // Lida com diferentes formas de importação ESM/CJS
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON (exceto para o webhook que precisa do corpo bruto)
  app.use((req, res, next) => {
    if (req.originalUrl === '/api/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
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

  // Rota de carregamento do checkout (para evitar popups bloqueados/brancos)
  app.get("/checkout-loading", (req, res) => {
    const { plan, userId } = req.query;
    res.send(`
      <html>
        <head>
          <title>Redirecionando para o Checkout...</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              display: flex; flex-direction: column; justify-content: center; align-items: center; 
              height: 100vh; font-family: -apple-system, system-ui, sans-serif; 
              background: #f8fafc; color: #64748b; margin: 0; 
            }
            .spinner { 
              width: 40px; height: 40px; border: 4px solid #e2e8f0; 
              border-top: 4px solid #6366f1; border-radius: 50%; 
              animation: spin 1s linear infinite; 
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { margin-top: 24px; color: #1e293b; font-size: 18px; }
            p { margin-top: 8px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <h2>Preparando seu checkout seguro</h2>
          <p>Você será redirecionado em instantes...</p>
          <script>
            async function startCheckout() {
              try {
                const response = await fetch('/api/create-checkout-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: '${userId}', planType: '${plan}' }),
                });
                const data = await response.json();
                if (data.url) {
                  window.location.replace(data.url);
                } else {
                  document.body.innerHTML = '<h2>Erro ao carregar checkout</h2><p>' + (data.error || 'Tente novamente.') + '</p>';
                }
              } catch (e) {
                document.body.innerHTML = '<h2>Erro de conexão</h2><p>Verifique sua internet e tente novamente.</p>';
              }
            }
            startCheckout();
          </script>
        </body>
      </html>
    `);
  });

  // Rota do Stripe Checkout
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

  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Servir arquivos estáticos em produção
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
