/**
 * Juicy Merge — Devvit Server
 *
 * Hono backend for Redis storage, Reddit API, and payments.
 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { createServer, getServerPort } from "@devvit/web/server";
import { api } from "./routes/api";
import { menu } from "./routes/menu";

const app = new Hono();

app.route("/api", api);
app.route("/internal/menu", menu);

serve({
  fetch: app.fetch,
  port: getServerPort(),
  createServer,
});

console.log("Juicy Merge server started");
