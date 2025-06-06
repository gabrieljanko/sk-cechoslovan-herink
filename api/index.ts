import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';

let app: express.Application;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!app) {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Initialize routes
    await registerRoutes(app);
  }

  return app(req, res);
}