import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicialização do Firebase Admin (Opcional para automação)
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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON
app.use(express.json());

// Servir arquivos estáticos da pasta public
app.use(express.static(path.resolve(__dirname, "public")));

// Rota específica para o Service Worker
app.get("/sw.js", (req, res) => {
  const swPath = path.resolve(__dirname, "public", "sw.js");
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(swPath);
});

// Rota específica para o manifest.json
app.get("/manifest.json", (req, res) => {
  const manifestPath = path.resolve(__dirname, "public", "manifest.json");
  res.setHeader('Content-Type', 'application/json');
  res.sendFile(manifestPath);
});

// API de Saúde
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "RotaFinanceira Backend is running" });
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
  const distPath = path.resolve(__dirname, "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Apenas inicia o servidor se não estiver em ambiente serverless
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  });
}

export default app;
