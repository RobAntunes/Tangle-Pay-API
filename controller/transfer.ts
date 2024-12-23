import { Transfer } from "npm:tigerbeetle-node";
import { db } from "../main.ts";
import {
  type TanglePayTransfer,
  TransferQueryFilter,
} from "../models/transfer.ts";
import { Context } from "jsr:@oak/oak/context";

type TransferReq = Request & {
  body: {
    transfers: TanglePayTransfer[];
    query?: {
      filter?: TransferQueryFilter;
    };
  };
};

const TRANSFERS_PATH = new URLPattern({ pathname: "/transfers" });

export async function createTransfers(ctx: Context): Promise<Response> {
  const match = TRANSFERS_PATH.exec(ctx.request.url);
  const data = await ctx.request.body.json();
  if (match && ctx.request.method.toLowerCase() === "post") {
    if (!data.length) {
      return new Response("No transfers provided", { status: 400 });
    }

    try {
      const errors = await db.createTransfers(
        data.transfers as Transfer[],
      );
      if (errors.length) {
        for (const error of errors) {
          console.log(error);
        }
        return new Response(JSON.stringify(errors), { status: 400 });
      }
      return new Response("Success", { status: 200 });
    } catch (e) {
      return new Response(JSON.stringify(e), { status: 500 });
    }
  }
  return new Response("Bad Request", { status: 400 });
}

export async function lookupTransfers(ctx: Context): Promise<Response> {
  const match = TRANSFERS_PATH.exec(ctx.request.url);
  const data = await ctx.request.body.json();

  if (match && ctx.request.method.toLowerCase() === "get") {
    if (!data.transfers?.length) {
      return new Response("No transfers provided", { status: 400 });
    }

    try {
      const transfers = await db.lookupTransfers(
        data.transfers.map((t) => t.id),
      );
      if (transfers.length) {
        return new Response(JSON.stringify(transfers), { status: 200 });
      }
      return new Response("No transfers found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify(e), { status: 500 });
    }
  }
  return new Response("Bad Request", { status: 400 });
}

export async function queryTransfers(req: TransferReq): Promise<Response> {
  const match = TRANSFERS_PATH.exec(req.url);

  if (match && req.method.toLowerCase() === "get") {
    if (!req.body.query?.filter) {
      return new Response("No query filter provided", { status: 400 });
    }

    try {
      const transfers = await db.queryTransfers(req.body.query.filter);
      if (transfers.length) {
        return new Response(JSON.stringify(transfers), { status: 200 });
      }
      return new Response("No transfers found", { status: 404 });
    } catch (e) {
      return new Response(JSON.stringify(e), { status: 500 });
    }
  }
  return new Response("Bad Request", { status: 400 });
}
