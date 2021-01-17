import blake from 'blakejs';
import bs58check from 'bs58check';
import bs58 from 'bs58';

export const Curves = {
	ED25519: 0x00,
	SECP256K1: 0x01,
	SECP256R1: 0x02
};

const PubKeyHashCurvePrefix = [
	Buffer.of(6, 161, 159),
	Buffer.of(6, 161, 161),
	Buffer.of(6, 161, 164)
];

const PubKeyPrefix = [
	Buffer.of(13, 15, 37, 217),
	Buffer.of(3, 254, 226, 86),
	Buffer.of(3, 178, 139, 127)
];

const SignaturePrefix = [
	Buffer.of(9, 245, 205, 134, 18),
	Buffer.of(13, 115, 101, 19, 63),
	Buffer.of(54, 240, 44, 52)
];

export const encodeSignature = (signature: string, curve: number) =>
	b58encode(hexToBuffer(signature), SignaturePrefix[curve]);

const b58encode = (payload: Uint8Array, prefix: Uint8Array): string => {
	const buffer = Buffer.alloc(prefix.length + payload.length);
	buffer.set(prefix);
	buffer.set(payload, prefix.length);
	return bs58check.encode(buffer);
};

const hexToBuffer = (hex: string) =>
	Buffer.from(hex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));

const compressPublicKey = (publicKey: Uint8Array, curve: number) =>
	curve === Curves.ED25519
		? publicKey.slice(1)
		: Buffer.concat([Buffer.of(0x02 + (publicKey[64] & 0x01)), publicKey.slice(1, 33)]);

/**
 * Converts uncompressed ledger key to standard tezos binary representation (Base58)
 */
export const encodeToBase58 = (publicKey: Uint8Array, curve: number) => {
	publicKey = compressPublicKey(publicKey, curve);
	return {
		publicKey: encodePublicKey(publicKey, curve),
		pkh: encodePublicKeyHash(publicKey, curve)
	};
};

const encodePublicKey = (publicKey: Uint8Array, curve: number) =>
	bs58check.encode(Buffer.concat([PubKeyPrefix[curve], publicKey]));

export const encodePublicKeyHash = (pubKey: Uint8Array, curve: number) =>
	b58encode(blake.blake2b(pubKey, null, 20), PubKeyHashCurvePrefix[curve]);

export const getOperationHash = (rawOpHex: string):string => {
	const rawOp = Buffer.concat([Buffer.of(0x03), Buffer.from(rawOpHex, 'hex')]);
	return bs58.encode(Buffer.from(blake.blake2b(rawOp, null, 32)));
}