export const serializeBigInts = (obj: any): any => {
    if (typeof obj === 'bigint') {
        return { type: 'BigInt', value: obj.toString() };
    }
    if (obj instanceof Uint8Array) {
        return { type: 'Uint8Array', data: Array.from(obj) };
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeBigInts);
    }
    if (typeof obj === 'object' && obj !== null) {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, serializeBigInts(v)])
        );
    }
    return obj;
};

export const deserializeBigInts = (obj: any): any => {
    if (obj?.type === 'BigInt' && typeof obj.value === 'string') {
        return BigInt(obj.value);
    }
    if (obj?.type === 'Uint8Array' && Array.isArray(obj.data)) {
        return new Uint8Array(obj.data);
    }
    if (Array.isArray(obj)) {
        return obj.map(deserializeBigInts);
    }
    if (typeof obj === 'object' && obj !== null) {
        return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, deserializeBigInts(v)])
        );
    }
    return obj;
};