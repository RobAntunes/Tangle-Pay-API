import * as oak from "jsr:@oak/oak";
import { createClient } from "npm:tigerbeetle-node";
import { router } from "./routes/routes.ts";
import * as supabase_js from "jsr:@supabase/supabase-js@2";
import AccountBatcher from "./classes/AccountBatcher.ts";
import { timeoutMiddleware } from "./middleware/timeout.ts";
import { sanitizeMiddleware } from "./middleware/sanitizer.ts";
import { tokenRefresher } from "./middleware/tokenRefresher.ts";

const supabaseUrl = "https://gfsiyznswfgnylijruzv.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmc2l5em5zd2ZnbnlsaWpydXp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQxMTI0NywiZXhwIjoyMDQ5OTg3MjQ3fQ.V4BAvO-hKXF75jiTJoCjXy2jp0FH_SG7ZiNCK4NZriE";
export const supabase = supabase_js.createClient(supabaseUrl, supabaseKey, {
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
