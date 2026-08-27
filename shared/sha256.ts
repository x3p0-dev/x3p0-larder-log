/**
 * SHA-256, in plain ECMAScript.
 *
 * The hosted runtime is `quickjs-rust` and exposes no `crypto` (confirmed in
 * production 2026-08-27), so there is no host primitive to reach for. This is
 * the mixing function behind `codeFromSeed` in `./invite`, which is the only
 * thing that stands between a sequential row id and a guessable invite code.
 *
 * Deliberately dependency-free and side-effect-free: `shared/` imports nothing,
 * and this has to run on an engine that offers little beyond the language
 * itself. Verified against the published FIPS 180-4 vectors in `npm test`.
 */

const K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/** UTF-8 bytes for a string. `TextEncoder` is not assumed to exist. */
export function utf8Bytes(text: string): number[] {
	const out: number[] = [];

	for (let i = 0; i < text.length; i++) {
		let code = text.charCodeAt(i);

		// Recombine a surrogate pair into the code point it encodes.
		if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
			const low = text.charCodeAt(i + 1);

			if (low >= 0xdc00 && low <= 0xdfff) {
				code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
				i++;
			}
		}

		if (code < 0x80) {
			out.push(code);
		} else if (code < 0x800) {
			out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
		} else if (code < 0x10000) {
			out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
		} else {
			out.push(
				0xf0 | (code >> 18),
				0x80 | ((code >> 12) & 0x3f),
				0x80 | ((code >> 6) & 0x3f),
				0x80 | (code & 0x3f)
			);
		}
	}

	return out;
}

const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0;

/** The 32-byte digest of `text`. */
export function sha256(text: string): Uint8Array {
	const bytes = utf8Bytes(text);
	const bitLength = bytes.length * 8;

	bytes.push(0x80);

	while (bytes.length % 64 !== 56) bytes.push(0);

	// Length is a 64-bit big-endian count of bits. The high word is written
	// from a float divide because the input is never near 2^32 bits.
	const high = Math.floor(bitLength / 0x100000000);

	bytes.push(
		(high >>> 24) & 0xff, (high >>> 16) & 0xff, (high >>> 8) & 0xff, high & 0xff,
		(bitLength >>> 24) & 0xff, (bitLength >>> 16) & 0xff, (bitLength >>> 8) & 0xff, bitLength & 0xff
	);

	let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
	let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

	const w = new Array<number>(64);

	for (let offset = 0; offset < bytes.length; offset += 64) {
		for (let i = 0; i < 16; i++) {
			w[i] = (
				((bytes[offset + i * 4] ?? 0) << 24) |
				((bytes[offset + i * 4 + 1] ?? 0) << 16) |
				((bytes[offset + i * 4 + 2] ?? 0) << 8) |
				(bytes[offset + i * 4 + 3] ?? 0)
			) >>> 0;
		}

		for (let i = 16; i < 64; i++) {
			const a = w[i - 15] ?? 0, b = w[i - 2] ?? 0;
			const s0 = (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) >>> 0;
			const s1 = (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)) >>> 0;

			w[i] = (((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) >>> 0);
		}

		let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

		for (let i = 0; i < 64; i++) {
			const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
			const ch = ((e & f) ^ (~e & g)) >>> 0;
			const t1 = (h + S1 + ch + (K[i] ?? 0) + (w[i] ?? 0)) >>> 0;
			const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
			const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
			const t2 = (S0 + maj) >>> 0;

			h = g; g = f; f = e; e = (d + t1) >>> 0;
			d = c; c = b; b = a; a = (t1 + t2) >>> 0;
		}

		h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
		h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
	}

	const out = new Uint8Array(32);

	[h0, h1, h2, h3, h4, h5, h6, h7].forEach((word, i) => {
		out[i * 4] = (word >>> 24) & 0xff;
		out[i * 4 + 1] = (word >>> 16) & 0xff;
		out[i * 4 + 2] = (word >>> 8) & 0xff;
		out[i * 4 + 3] = word & 0xff;
	});

	return out;
}

/** The digest as lowercase hex. Used by the tests and nothing else. */
export function sha256Hex(text: string): string {
	return [...sha256(text)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
