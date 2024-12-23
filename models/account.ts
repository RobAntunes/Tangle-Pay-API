import type { QueryFilterFlags } from "npm:tigerbeetle-node";

export interface TanglePayAccount {
    id: bigint;
    debits_pending?: bigint;
    debits_posted?: bigint;
    credits_pending?: bigint;
    credits_posted?: bigint;
    user_data_128?: bigint;
    user_data_64?: bigint;
    user_data_32?: number;
    reserved?: number;
    ledger: number;
    code: number;
    flags: QueryFilterFlags;
    timestamp: bigint;
}

export interface AccountTransferFilter {
    account_id: bigint;
    user_data_128: bigint;
    user_data_64: bigint;
    user_data_32: number;
    code: number;
    timestamp_min: bigint;
    timestamp_max: bigint;
    limit: number;
    flags: QueryFilterFlags;
}

export interface AccountBalanceFilter {
    account_id: bigint;
    user_data_128: bigint;
    user_data_64: bigint;
    user_data_32: number;
    code: number;
    timestamp_min: bigint;
    timestamp_max: bigint;
    limit: number;
    flags: QueryFilterFlags;
}

export interface AccountQueryFilter {
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
