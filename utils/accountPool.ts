import { Account } from "npm:tigerbeetle-node";
import { kv } from "../main.ts";
  
  /**
   * Adds an account to the creation pool in KV storage
   */
  export const addAccountToPool = async (account: Account): Promise<void> => {
    try {
      // Get existing pool or initialize if it doesn't exist
      const pool = await kv.get<Account[]>(["account_creation_pool"]);
      const currentPool = pool?.value || [];
      
      // Create new pool with the added account
      const updatedPool = [...currentPool, account];
      
      // Update the pool in KV storage
      await kv.set(["account_creation_pool"], updatedPool);
      
    } catch (error) {
      console.error('Failed to add account to pool:', error);
      throw new Error('Failed to add account to creation pool');
    }
  };
  
  /**
   * Gets all accounts currently in the creation pool
   */
  export const getAccountPool = async (): Promise<Account[]> => {
    try {
      const pool = await kv.get<Account[]>(["account_creation_pool"]);
      return pool?.value || [];
    } catch (error) {
      console.error('Failed to get account pool:', error);
      return [];
    }
  };
  
  /**
   * Removes an account from the pool by some identifier
   */
  export const removeAccountFromPool = async (accountId: bigint): Promise<void> => {
    try {
      const pool = await kv.get<Account[]>(["account_creation_pool"]);
      const currentPool = pool?.value || [];
      
      const updatedPool = currentPool.filter(account => account.id !== accountId);
      
      await kv.set(["account_creation_pool"], updatedPool);
      
    } catch (error) {
      console.error('Failed to remove account from pool:', error);
      throw new Error('Failed to remove account from creation pool');
    }
  };
  
  /**
   * Clears the entire account creation pool
   */
  export const clearAccountPool = async (): Promise<void> => {
    try {
      await kv.set(["account_creation_pool"], []);
    } catch (error) {
      console.error('Failed to clear account pool:', error);
      throw new Error('Failed to clear account creation pool');
    }
  };