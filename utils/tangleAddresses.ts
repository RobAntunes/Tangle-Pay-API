import { blake3 } from '@noble/hashes/blake3';

// Custom alphabet excluding ambiguous characters
const ALPHABET = 'abcdefghkmnpqrstuvwxyz23456789';

// Constants
const PREFIX = 'tgl';
const CHUNK_SIZE = 4;
const CHECKSUM_SIZE = 4; // bytes
const ACCOUNT_BYTES = 16; // 128 bits for TigerBeetle u128

export class AddressEncoder {
    /**
     * Encodes a TigerBeetle account ID into our custom format
     * Accepts either BigInt or string representation
     * Format: tgl-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
     */
    static encode(accountId: bigint | string): string {
        // Convert to BigInt if string
        const id = typeof accountId === 'string' ? BigInt(accountId) : accountId;

        // Convert BigInt to bytes (16 bytes for u128)
        const bytes = this.bigIntToBytes(id);
        
        // Calculate checksum
        const checksum = this.calculateChecksum(bytes);
        
        // Combine account bytes and checksum
        const combined = new Uint8Array(ACCOUNT_BYTES + CHECKSUM_SIZE);
        combined.set(bytes);
        combined.set(checksum, ACCOUNT_BYTES);

        // Convert to our custom base32
        let encoded = this.toBase32(combined);

        // Pad to fixed length if needed
        encoded = encoded.padEnd(32, ALPHABET[0]);

        // Add hyphens for readability
        encoded = this.addHyphens(encoded);

        // Add prefix
        return `${PREFIX}-${encoded}`;
    }

    /**
     * Decodes a formatted address back to TigerBeetle account ID
     * Returns BigInt
     */
    static decode(formattedAddress: string): bigint {
        // Basic format validation
        if (!formattedAddress.startsWith(PREFIX + '-')) {
            throw new Error('Invalid address prefix');
        }

        // Remove prefix and hyphens
        const cleaned = formattedAddress
            .slice(PREFIX.length + 1)
            .replace(/-/g, '');

        // Convert from base32
        const decoded = this.fromBase32(cleaned);

        // Split into account bytes and checksum
        const accountBytes = decoded.slice(0, ACCOUNT_BYTES);
        const receivedChecksum = decoded.slice(ACCOUNT_BYTES, ACCOUNT_BYTES + CHECKSUM_SIZE);

        // Verify checksum
        const expectedChecksum = this.calculateChecksum(accountBytes);
        if (!this.compareBytes(receivedChecksum, expectedChecksum)) {
            throw new Error('Invalid checksum');
        }

        // Convert bytes back to BigInt
        return this.bytesToBigInt(accountBytes);
    }

    /**
     * Verifies if a string is a valid formatted address
     */
    static isValid(address: string): boolean {
        try {
            this.decode(address);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Converts BigInt to fixed-length byte array
     */
    private static bigIntToBytes(num: bigint): Uint8Array {
        const bytes = new Uint8Array(ACCOUNT_BYTES);
        for (let i = 0; i < ACCOUNT_BYTES; i++) {
            bytes[ACCOUNT_BYTES - 1 - i] = Number(num & 0xFFn);
            num = num >> 8n;
        }
        return bytes;
    }

    /**
     * Converts byte array back to BigInt
     */
    private static bytesToBigInt(bytes: Uint8Array): bigint {
        let result = 0n;
        for (const byte of bytes) {
            result = (result << 8n) + BigInt(byte);
        }
        return result;
    }

    /**
     * Calculates checksum for account bytes using BLAKE3
     */
    private static calculateChecksum(accountBytes: Uint8Array): Uint8Array {
        const hash = blake3(accountBytes);
        return hash.slice(0, CHECKSUM_SIZE);
    }

    /**
     * Converts bytes to our custom base32 encoding
     */
    private static toBase32(bytes: Uint8Array): string {
        let bits = 0;
        let value = 0;
        let output = '';

        for (let i = 0; i < bytes.length; i++) {
            value = (value << 8) | bytes[i];
            bits += 8;

            while (bits >= 5) {
                output += ALPHABET[(value >>> (bits - 5)) & 31];
                bits -= 5;
            }
        }

        if (bits > 0) {
            output += ALPHABET[(value << (5 - bits)) & 31];
        }

        return output;
    }

    /**
     * Converts our custom base32 string back to bytes
     */
    private static fromBase32(encoded: string): Uint8Array {
        const output = new Uint8Array(Math.ceil(encoded.length * 5 / 8));
        let bits = 0;
        let value = 0;
        let index = 0;

        for (let i = 0; i < encoded.length; i++) {
            const char = encoded[i];
            const charValue = ALPHABET.indexOf(char);
            if (charValue === -1) {
                throw new Error(`Invalid character: ${char}`);
            }

            value = (value << 5) | charValue;
            bits += 5;

            if (bits >= 8) {
                output[index++] = (value >>> (bits - 8)) & 255;
                bits -= 8;
            }
        }

        return output;
    }

    /**
     * Adds hyphens every CHUNK_SIZE characters
     */
    private static addHyphens(str: string): string {
        const chunks = str.match(new RegExp(`.{${CHUNK_SIZE}}`, 'g')) || [];
        return chunks.join('-');
    }

    /**
     * Constant-time byte comparison
     */
    private static compareBytes(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a[i] ^ b[i];
        }
        return result === 0;
    }
}