import * as account from "../controller/account.ts";
import * as transfer from "../controller/transfer.ts";
import * as auth from "../controller/auth.ts";
import * as oak from "jsr:@oak/oak";

const router = new oak.Router();

// Apply validator middleware before each route handler
router
  .get("/auth/oauth", auth.loginWithOAuth)
  .post("/auth/oauth/callback", auth.handleOAuthCallback)
  .post("/auth", auth.loginWithPassword)
  .get("/auth/signout", auth.signOut)
  .get("/accounts", account.lookupAccounts)
  .post("/transfers", transfer.createTransfers)
  .get("/transfers", transfer.lookupTransfers)
  .post("/users", auth.createUser);

export { router };
