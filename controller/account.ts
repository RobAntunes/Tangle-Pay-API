import { z } from "zod";
import { Account, id, QueryFilterFlags } from "npm:tigerbeetle-node";
import { batcher, db, kv, supabase } from "../main.ts";
import { Context } from "jsr:@oak/oak";

export const createTemplateAccount = (id: bigint): Account => {
  return {
    id: id, // Unique identifier
    debits_pending: 0n, // Pending debits amount
    debits_posted: 0n, // Posted debits amount
    credits_pending: 0n, // Pending credits amount
    credits_posted: 0n, // Posted credits amount
    user_data_128: 0n, // User defined data (first 128 bits)
    user_data_64: 0n, // User defined data (next 64 bits)
    user_data_32: 0, // User defined data (next 32 bits)
    reserved: 0, // Reserved for future use
    ledger: 700, // Ledger identifier
    code: 10, // Account type code
    flags: 0, // Account flags
    timestamp: 0n, // Creation timestamp
  };
};

export const populateAccount = (
  ledger: number,
  code?: number,
  flags?: QueryFilterFlags
): Account => {
  return {
    ...createTemplateAccount(id()),
    id: id(),
    ledger: ledger,
    code: code ?? 10,
    flags: flags ?? 0,
  };
};

const path = "/accounts";

export async function lookupAccounts(ctx: Context): Promise<void> {
  // Validate request path and method
  if (
    ctx.request.url.pathname !== path ||
    ctx.request.method.toLowerCase() !== "get"
  ) {
    ctx.response.body = { message: "Not Found" };
    ctx.response.status = 404;
    ctx.response.type = "application/json";
    return;
  }

  try {
    const body = await ctx.request.body.json();
    console.log(body);

    let bigId: bigint;
    if (requestId) {
      bigId = BigInt(+requestId);
    } else {
      ctx.response.body = { message: "Bad Request" };
      ctx.response.status = 400;
      ctx.response.type = "application/json";
      return;
    }

    const accounts = await db.lookupAccounts([bigId]);
    console.log(accounts);

    if (accounts.length) {
      ctx.response.body = accounts;
      ctx.response.status = 200;
      ctx.response.type = "application/json";
      return;
    } else {
      const newAccount = populateAccount(700, 10, undefined);
      const accountId = await batcher.createAccount(newAccount);

      if (!accountId) {
        ctx.response.body = { message: "Failed to create account" };
        ctx.response.status = 500;
        ctx.response.type = "application/json";
        return;
      }

      ctx.response.body = accountId;
      ctx.response.status = 200;
      ctx.response.type = "application/json";
      return;
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      ctx.response.body = {
        message: "Validation Error",
        errors: e.errors,
      };
      ctx.response.status = 400;
    } else {
      ctx.response.body = { message: (e as Error).message };
      ctx.response.status = 500;
    }
    ctx.response.type = "application/json";
    return;
  }
}
