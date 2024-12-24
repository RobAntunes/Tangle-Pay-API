import * as oak from "jsr:@oak/oak";
import { createClient } from "npm:tigerbeetle-node";
import { router } from "./routes/routes.ts";
import * as supabase_js from "jsr:@supabase/supabase-js@2";
import AccountBatcher from "./classes/AccountBatcher.ts";
import { timeoutMiddleware } from "./middleware/timeout.ts";
import { sanitizeMiddleware } from "./middleware/sanitizer.ts";
import { tokenRefresher } from "./middleware/tokenRefresher.ts";

const supabaseUrl = Deno.env.get(
  "SUPABASE_URL"
);
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

export const supabase = supabase_js.createClient(supabaseUrl as string, supabaseKey as string, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

export const db = createClient({
  cluster_id: 0n,
  replica_addresses: ["3000"],
});

export const batcher = new AccountBatcher(db);

export const kv = await Deno.openKv();

const app = new oak.Application();

app.use(timeoutMiddleware);
app.use(sanitizeMiddleware);
app.use(tokenRefresher);
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Error handler caught:", err); // Log the error
    ctx.response.status = (err as oak.HttpError).status || 500;
    ctx.response.body = {
      message: (err as oak.HttpError).message || "Internal Server Error",
    };
  }
});
app.use(router.routes());
app.use(router.allowedMethods());
app.use(async (ctx, next) => {
  const response = ctx.response;
  response.headers.set("Access-Control-Allow-Origin", "*");
  await next();
});

app.addEventListener("listen", ({ hostname, port }) => {
  console.log(`Server running on http://${hostname}:${port}`);
});

await app.listen({ port: 8000 });
