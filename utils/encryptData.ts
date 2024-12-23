import { utf8ToBytes } from "@noble/ciphers/utils";
import { randomBytes } from "@noble/ciphers/webcrypto";
import { gcm } from "@noble/ciphers/aes";
import { bytesToHex } from "@noble/hashes/utils";

//TODO: Change key to something more secure
//TODO: Change to more secure encryption algorithm
export function encryptWithAESGCM(data: Uint8Array) {
  const key = utf8ToBytes("secretsecretsecretsecretsecrets.");
  const nonce = randomBytes(24);
  const aes = gcm(key, nonce);
  return [aes.encrypt(data), nonce];
}

export function decryptWithAESGCM(data: Uint8Array, nonce: Uint8Array) {
  const key = utf8ToBytes("secretsecretsecretsecretsecrets.");
  const aes = gcm(key, nonce);
  return aes.decrypt(data);
}
