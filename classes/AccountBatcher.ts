import { Account, Client, CreateAccountError } from "npm:tigerbeetle-node";
import { db } from "../main.ts";

class AccountBatcher {
  private batch: Account[] = [];
  private batchPromises: Array<{
    account: Account;
    resolve: (result: bigint | CreateAccountError) => void;
    reject: (error: any) => void;
  }> = [];
  private timeoutId: number | null = null;
  private readonly maxBatchSize: number = 128;
  private readonly maxWaitMs: number = 2000;
  private client: Client;
  private isProcessing: boolean = false;

  constructor(client: Client) {
    this.client = client;
  }

  createAccount(account: Account): Promise<bigint | CreateAccountError> {
    console.log("Attempting to create account:", account); // Add logging
    return new Promise((resolve, reject) => {
      this.batchPromises.push({ account, resolve, reject });
      this.batch.push(account);

      if (this.batch.length >= this.maxBatchSize) {
        console.log("Max batch size reached, processing immediately");
        if (this.timeoutId) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
        void this.processBatch();
      } else if (!this.timeoutId && !this.isProcessing) {
        console.log("Starting timeout for batch processing");
        this.timeoutId = setTimeout(() => {
          void this.processBatch();
        }, this.maxWaitMs);
      }
    });
  }

  private async processBatch(): Promise<void> {
    console.log("Starting processBatch"); // Add logging

    if (this.isProcessing) {
      console.log("Already processing, returning");
      return;
    }
    this.isProcessing = true;

    try {
      if (this.timeoutId) {
        clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      if (this.batch.length === 0) {
        console.log("Empty batch, returning");
        this.isProcessing = false;
        return;
      }

      const currentBatch = [...this.batch];
      const currentPromises = [...this.batchPromises];

      console.log("Current batch size:", currentBatch.length);
      console.log("First account in batch:", currentBatch[0]);

      this.batch = [];
      this.batchPromises = [];

      if (!currentBatch.every((account) => account.id)) {
        throw new Error("Invalid account data: missing required id field");
      }

      console.log("Calling TigerBeetle client.createAccounts");
      const errors = await this.client.createAccounts(currentBatch);

      currentBatch.forEach((account, index) => {
        const { resolve, reject } = currentPromises[index];
        const error = errors[index];

        if (error) {
          console.error("Error for account:", account.id, "Error:", error);
          reject(error);
        } else {
          console.log("Successfully created account:", account.id);
          resolve(account.id);
        }
      });
    } catch (err) {
      const error = err as Error;
      console.error("Batch processing error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });

      this.batchPromises.forEach(({ reject }) => {
        if (error instanceof TypeError) {
          reject(new Error("Network or serialization error: " + error.message));
        } else if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "TIMEOUT"
        ) {
          reject(new Error("Operation timed out"));
        } else {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    } finally {
      this.isProcessing = false;

      if (this.batch.length > 0) {
        console.log("New items in batch, scheduling processing");
        setTimeout(() => void this.processBatch(), 0);
      }
    }
  }
  catch(err) {
    console.error("Batch processing error:", err);
    this.batchPromises.forEach(({ reject }) => {
      reject(err);
    });
  }

  destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.batch = [];
    this.batchPromises = [];
    this.isProcessing = false;
  }
}

export default AccountBatcher;
