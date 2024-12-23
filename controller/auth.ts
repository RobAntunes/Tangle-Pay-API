import { Context, httpErrors } from "jsr:@oak/oak";
import { batcher, supabase } from "../main.ts";
import { populateAccount } from "./account.ts";
import { AddressEncoder } from "../utils/tangleAddresses.ts";
import { kv } from "../main.ts";
import { encryptWithAESGCM } from "../utils/encryptData.ts";
import { utf8ToBytes } from "@noble/ciphers/utils";

const path = "/users";

export const createUser = async (ctx: Context) => {
  if (
    path !== ctx.request.url.pathname ||
    ctx.request.method.toLowerCase() !== "post"
  ) {
    ctx.response.body = { message: "Not found" };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
    return;
  }
  const body = await ctx.request.body.json();
  const already = await supabase.from("users").select().eq("email", body.email);
  if (already.data?.length) {
    ctx.response.body = { message: "User already exists." };
    ctx.response.status = 400;
    ctx.response.type = "application/json";
    return;
  }
  const populatedAccount = populateAccount(700, 10, undefined);
  try {
    await batcher.createAccount(populatedAccount);
  } catch (error) {
    ctx.response.body = { message: (error as Error).message };
    ctx.response.status = 500;
    ctx.response.type = "application/json";
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      data: {
        account_id: AddressEncoder.encode(populatedAccount.id),
      },
    },
  });
  console.log(data);
  if (error) {
    ctx.response.body = { message: error.message };
    ctx.response.status = error.code ? httpErrors[error.code] : 400;
    ctx.response.type = "application/json";
    return;
  }
  return data;
};

const basePath = "/auth";

export const loginWithPassword = async (ctx: Context) => {
  if (
    basePath !== ctx.request.url.pathname ||
    ctx.request.method.toLowerCase() !== "post"
  ) {
    ctx.response.body = { message: "Not found" };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
    return;
  }

  const body = await ctx.request.body.json();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  const id = await supabase.from("users").select().eq("email", body.email);

  console.log(error?.status);
  if (error?.status === 400) {
    ctx.response.body = { message: "Not Found" };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
    return;
  }

  const verified = !!(await supabase.auth.getUser()).data.user
    ?.email_confirmed_at;

  if (!verified) {
    ctx.response.body = {
      message: "Please verify your account before loggin in",
    };
    ctx.response.status = 401;
    ctx.response.type = "application/json";
    return;
  }

  if (data.session) {
    kv.set([id + "_access_token"], data.session.access_token);
    kv.set([id + "_refresh_token"], data.session.refresh_token);
    await supabase.auth.setSession(data.session);
    ctx.response.body = data;
    ctx.response.status = 200;
    ctx.response.type = "application/json";
  } else if (error) {
    ctx.response.body = { message: error.message };
    ctx.response.status = 403;
    ctx.response.type = "application/json";
  }
  return;
};

const oauthPath = "/auth/oauth";

export const loginWithOAuth = async (ctx: Context) => {
  // Simplified check - if path matches AND method is GET, proceed
  if (
    oauthPath === ctx.request.url.pathname &&
    ctx.request.method.toLowerCase() === "get"
  ) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "tangle://home",
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      ctx.response.body = { message: error.message };
      ctx.response.status = 400;
      ctx.response.type = "application/json";
      return;
    }

    ctx.response.body = { url: data.url };
    ctx.response.status = 200;
    ctx.response.type = "application/json";
  }
};

const oauthCallbackPath = "/auth/oauth/callback";

export const handleOAuthCallback = async (ctx: Context) => {
  if (oauthCallbackPath !== ctx.request.url.pathname) {
    ctx.response.body = { message: "Not found" };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
    return;
  }

  const { code } = await ctx.request.body.json();
  console.log("OAuth code:", code);

  if (!code) {
    ctx.response.body = { message: "Missing code parameter" };
    ctx.response.status = 400;
    ctx.response.type = "application/json";
    return;
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !session) {
      throw error || new Error("Failed to get session");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(session.access_token);

    if (userError || !user?.email) {
      throw userError || new Error("Failed to get user data");
    }

    // Check if user exists
    const existing = await supabase
      .from("users")
      .select()
      .eq("email", user.email)
      .single();

    if (!existing.data) {
      try {
        const populatedAccount = populateAccount(700, 10, undefined);
        const rawAccountId = populatedAccount.id;
        console.log("Raw account ID:", rawAccountId);

        // Create the account and wait for it
        const result = await batcher.createAccount(populatedAccount);
        console.log("TigerBeetle account created:", result);

        const encodedId = AddressEncoder.encode(rawAccountId);
        console.log("Encoded ID:", encodedId);

        // Wait a short time for trigger to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // First get current account_ids
        const { data: currentAccount, error: getError } = await supabase
          .from("accounts")
          .select("account_ids")
          .eq("user_id", user.id)
          .single();

        if (getError) {
          console.error("Failed to get current account:", getError);
          throw getError;
        }

        // Create the new jsonb object
        const newAccountObject = {
          encoded: encodedId,
          raw: rawAccountId.toString(),
        };

        // Get current array or initialize if empty
        const currentIds = currentAccount?.account_ids || [];

        // Update with new array by appending the new object
        const { error: updateError } = await supabase
          .from("accounts")
          .update({
            account_ids:
              currentIds.length && Object.values(currentIds[0]).length > 0
                ? [...currentIds, newAccountObject]
                : [newAccountObject],
          })
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Failed to update account_ids:", updateError);
          throw updateError;
        }

        console.log("Updated account_ids successfully");
      } catch (accountError) {
        console.error("Failed to setup user account:", accountError);
        console.error("Error details:", accountError);
        throw new Error(
          `Account creation failed: ${(accountError as Error).message}`
        );
      }
    }

    // Store session tokens
    await kv.set(
      [`${user.id}_access_token`],
      encryptWithAESGCM(utf8ToBytes(session.access_token))
    );
    await kv.set(
      [`${user.id}_refresh_token`],
      encryptWithAESGCM(utf8ToBytes(session.refresh_token))
    );

    ctx.response.body = { userId: user.id };
    ctx.response.status = 200;
    ctx.response.type = "application/json";
  } catch (error) {
    console.error("OAuth callback error:", error);
    ctx.response.body = { message: (error as Error).message };
    ctx.response.status = 500;
    ctx.response.type = "application/json";
    return;
  }
};

const signOutPath = "/auth/signout";

export const signOut = async (ctx: Context) => {
  if (
    signOutPath !== ctx.request.url.pathname ||
    ctx.request.method.toLowerCase() !== "get"
  ) {
    ctx.response.body = { message: "Not found" };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
    return;
  }

  const userId = ctx.state.user?.id;
  if (userId) {
    // Clear stored tokens
    await kv.delete([`${userId}_access_token`]);
    await kv.delete([`${userId}_refresh_token`]);
    await kv.delete([`${userId}_expires_at`]);
  }

  await supabase.auth.signOut();
  ctx.response.status = 200;
  ctx.response.type = "application/json";
};
