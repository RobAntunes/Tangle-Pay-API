import { Context } from "jsr:@oak/oak";
import { supabase, kv } from "../main.ts";
import { decryptWithAESGCM, encryptWithAESGCM } from "../utils/encryptData.ts";
import { utf8ToBytes } from "@noble/ciphers/utils";


export async function tokenRefresher(ctx: Context, next: () => Promise<unknown>) {
  const userId = ctx.state.user?.id;

  if (!userId) {
    // No user information available, proceed to next middleware/handler
    //  This assumes you have a middleware that sets user information in ctx.state
    return await next(); 
  }

  try {
    const expiryData = await kv.get([`${userId}_expires_at`]);
    const isExpired = !expiryData.value || Date.now() >= (expiryData.value as number);


    if (isExpired) {
      const refreshData: { value: { token: Uint8Array; nonce: Uint8Array } | null } = await kv.get([`${userId}_refresh_token`]);

      if (!refreshData.value) {
        // No refresh token, redirect to login
        ctx.response.status = 401; //Unauthorized
        ctx.response.body = { message: "Refresh token not found. Please login again." };
        return;
      }

      const decryptedRefresh = decryptWithAESGCM(refreshData.value.token, refreshData.value.nonce);
      const refreshToken = new TextDecoder().decode(decryptedRefresh);

      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

      if (error) {
        // Refresh token invalid, redirect to login
        console.error("Refresh token invalid:", error);
        ctx.response.status = 401; //Unauthorized
        ctx.response.body = { message: "Refresh token invalid. Please login again." };
        return;
      }

      if (data.session) {
        // Encrypt and store the NEW access token
        const [encryptedAccess, nonceAccess] = encryptWithAESGCM(utf8ToBytes(data.session.access_token));
        await kv.set([`${userId}_access_token`], { token: encryptedAccess, nonce: nonceAccess });
        await kv.set([`${userId}_expires_at`], Date.now() + data.session.expires_in * 1000);


        // Set the new access token in the Supabase client for subsequent requests in this lifecycle
        supabase.auth.setSession(data.session); 
      }
    } 
    // Get and decrypt the access token to potentially use it downstream.
    // const accessData: { value: { token: Uint8Array; nonce: Uint8Array } | null } = await kv.get([`${userId}_access_token`]);
    // if (accessData.value) {
    //   const decryptedAccess = decryptWithAESGCM(accessData.value.token, accessData.value.nonce);
    //   ctx.state.accessToken = new TextDecoder().decode(decryptedAccess);
    // 
  } catch (error) {
    console.error("Token refresh error:", error);
    ctx.response.status = 500;
    ctx.response.body = { message: "An error occurred during token refresh." };
    return;
  }


  await next();
}

