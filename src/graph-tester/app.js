import express from "express";
import { fileURLToPath } from "node:url";
import { createGraphTesterRouter } from "./routes/graphTesterRoutes.js";

const publicDirectory = fileURLToPath(new URL("./public/", import.meta.url));

export function createGraphTesterApp({ config, authStore }) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use((request, response, next) => {
    if (
      request.path.startsWith("/api/") ||
      request.path.startsWith("/auth/")
    ) {
      response.set("Cache-Control", "no-store");
    }

    next();
  });

  app.use(createGraphTesterRouter({ config, authStore }));
  app.use(express.static(publicDirectory));

  app.use((request, response) => {
    response.status(404).type("text/plain").send("Graph tester route not found.");
  });

  app.use((error, request, response, next) => {
    response.status(error.statusCode || 500).json({
      ok: false,
      error: error.message || "Unexpected Graph tester server error.",
    });
  });

  return app;
}
