import { QueryFilterFlags } from "npm:tigerbeetle-node";

export interface TanglePayTransfer {
    id: bigint;
    debit_account_id: bigint;
    credit_account_id: bigint;
    amount: bigint;
    pending_id?: bigint;
    user_data_128?: bigint;
    user_data_64?: bigint;
    user_data_32?: number;
    timeout?: number;
    ledger: number;
    code?: number;
    flags?: QueryFilterFlags;
    timestamp: bigint;
}

export interface TransferQueryFilter {
    user_data_128: bigint;
    user_data_64: bigint;
    user_data_32: number;
    code: number;
    ledger: number;
    timestamp_min: bigint;
    timestamp_max: bigint;
    limit: number;
    flags: QueryFilterFlags;
}
