/**
 * Server di sviluppo/anteprima (usato da `npm run dev` e da AI Studio).
 * L'app è una SPA statica che parla direttamente con Firebase: in produzione
 * viene pubblicata su GitHub Pages e non richiede alcun backend.
 */
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT) || 3000;
const BASE = '/grest_oppeano/';

async function startServer() {
  const app = express();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(BASE, express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.get('/', (_req, res) => res.redirect(BASE));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato su http://localhost:${PORT}${BASE}`);
  });
}

startServer();
