/** How many bytes go to btoa at a time; small enough not to touch the argument limit on a spread */
const BASE64_CHUNK_SIZE = 0x2000;

/**
 * Encodes bytes as base64 in the browser, without Node's Buffer.
 *
 * @param bytes - The bytes to encode, of any length; an empty array gives ""
 * @returns The base64 text, with padding and no data-URL prefix
 */
export const toBase64 = (bytes: Uint8Array): string => {
	const chunks: string[] = [];
	for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
		chunks.push(
			String.fromCharCode(
				...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE),
			),
		);
	}
	return btoa(chunks.join(""));
};
