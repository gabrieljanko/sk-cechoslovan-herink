import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit", 
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const requestPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (requestPath.startsWith("/api")) {
        let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }
        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Serve static files
  app.use(express.static(path.join(process.cwd(), 'dist', 'public')));

  // SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    const indexPath = path.join(process.cwd(), 'dist', 'public', 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        res.status(404).json({ 
          status: 'SK Čechoslovan Herink API Running', 
          error: 'Frontend not built',
          path: req.path 
        });
      }
    });
  });

  return app;
}

if (process.env.NODE_ENV === "production") {
  (async () => {
    const app = await createApp();
    const port = parseInt(process.env.PORT || '10000', 10);
    
    app.listen(port, '0.0.0.0', () => {
      log(`serving on port ${port}`);
    });
  })();
}
