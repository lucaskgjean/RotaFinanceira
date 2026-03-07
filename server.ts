import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Middleware para JSON
  app.use(express.json());

  // API de Saúde
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "RotaFinanceira Backend is running" });
  });

  // Rota do Stripe Checkout
  app.post("/api/create-checkout-session", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({ error: "Stripe não configurado no servidor." });
    }

    const { userId } = req.body;
    const appUrl = process.env.APP_URL || `https://${req.get('host')}`;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: "RotaFinanceira PRO",
                description: "Acesso total, backup em nuvem e IA ilimitada.",
              },
              unit_amount: 1990, // R$ 19,90
              recurring: {
                interval: "month",
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
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Erro Stripe:", error);
      res.status(500).json({ error: error.message });
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
