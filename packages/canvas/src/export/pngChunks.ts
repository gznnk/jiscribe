/**
 * Minimal PNG chunk reader/writer for embedding text metadata.
 *
 * Only what the PNG round-trip needs is implemented: walking the chunk
 * sequence, inserting an `iTXt` chunk before `IEND`, and reading it back.
 * `iTXt` is used (rather than `tEXt`/`zTXt`) because the embedded
 * `.jis.json` contains non-Latin-1 text and `iTXt` is natively UTF-8.
 * The chunk is written uncompressed: the JSON is small, and skipping zlib
 * keeps extraction synchronous and dependency-free.
 */

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const ITXT_TYPE = "iTXt";
const IEND_TYPE = "IEND";

/** CRC32 lookup table (IEEE 802.3 polynomial), built once on first use. */
let crcTable: Uint32Array | null = null;

const getCrcTable = (): Uint32Array => {
	if (crcTable) {
		return crcTable;
	}
	crcTable = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		crcTable[n] = c >>> 0;
	}
	return crcTable;
};

/** CRC32 as defined by the PNG spec (over chunk type + chunk data). */
export const crc32 = (bytes: Uint8Array): number => {
	const table = getCrcTable();
	let c = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
};

type PngChunk = {
	/** Chunk type (e.g. "IHDR", "iTXt") */
	type: string;
	/** Offset of the 4-byte length field (= start of the whole chunk) */
	chunkOffset: number;
	/** Offset of the chunk data */
	dataOffset: number;
	/** Length of the chunk data */
	dataLength: number;
};

const isPng = (bytes: Uint8Array): boolean =>
	bytes.length >= PNG_SIGNATURE.length &&
	PNG_SIGNATURE.every((byte, i) => bytes[i] === byte);

const readUint32 = (bytes: Uint8Array, offset: number): number =>
	((bytes[offset] << 24) |
		(bytes[offset + 1] << 16) |
		(bytes[offset + 2] << 8) |
		bytes[offset + 3]) >>>
	0;

const readChunkType = (bytes: Uint8Array, offset: number): string =>
	String.fromCharCode(
		bytes[offset],
		bytes[offset + 1],
		bytes[offset + 2],
		bytes[offset + 3],
	);

/** Walks the chunk sequence. Stops at (and includes) IEND or a truncated tail. */
const listChunks = (bytes: Uint8Array): PngChunk[] => {
	const chunks: PngChunk[] = [];
	let offset = PNG_SIGNATURE.length;
	// A chunk needs at least length(4) + type(4) + crc(4) bytes
	while (offset + 12 <= bytes.length) {
		const dataLength = readUint32(bytes, offset);
		const type = readChunkType(bytes, offset + 4);
		if (offset + 12 + dataLength > bytes.length) {
			break;
		}
		chunks.push({
			type,
			chunkOffset: offset,
			dataOffset: offset + 8,
			dataLength,
		});
		if (type === IEND_TYPE) {
			break;
		}
		offset += 12 + dataLength;
	}
	return chunks;
};

/** Builds a complete iTXt chunk (length + type + data + CRC). */
const buildITxtChunk = (
	keyword: string,
	text: string,
): Uint8Array<ArrayBuffer> => {
	const encoder = new TextEncoder();
	const keywordBytes = encoder.encode(keyword);
	const textBytes = encoder.encode(text);

	// keyword \0 compressionFlag(0) compressionMethod(0) languageTag \0 translatedKeyword \0 text
	const dataLength = keywordBytes.length + 5 + textBytes.length;
	const chunk = new Uint8Array(12 + dataLength);
	const view = new DataView(chunk.buffer);

	view.setUint32(0, dataLength);
	chunk.set(encoder.encode(ITXT_TYPE), 4);
	chunk.set(keywordBytes, 8);
	// The 5 bytes after the keyword (NUL, flags, empty tags) are already 0
	chunk.set(textBytes, 8 + keywordBytes.length + 5);
	view.setUint32(8 + dataLength, crc32(chunk.subarray(4, 8 + dataLength)));

	return chunk;
};

/**
 * Returns a copy of the PNG with an uncompressed `iTXt` chunk carrying
 * `text` under `keyword`, inserted right before `IEND`. An existing `iTXt`
 * chunk with the same keyword is replaced, keeping the operation idempotent.
 *
 * @throws Error when the bytes are not a structurally valid PNG
 */
export const insertPngTextChunk = (
	png: Uint8Array,
	keyword: string,
	text: string,
): Uint8Array<ArrayBuffer> => {
	if (!isPng(png)) {
		throw new Error("Not a PNG: signature mismatch");
	}
	const chunks = listChunks(png);
	const iend = chunks.find((chunk) => chunk.type === IEND_TYPE);
	if (!iend) {
		throw new Error("Not a valid PNG: missing IEND chunk");
	}

	const keywordBytes = new TextEncoder().encode(keyword);
	const removed = chunks.filter(
		(chunk) =>
			chunk.type === ITXT_TYPE &&
			bytesEqual(readITxtKeywordBytes(png, chunk), keywordBytes),
	);
	const textChunk = buildITxtChunk(keyword, text);

	const removedLength = removed.reduce(
		(sum, chunk) => sum + 12 + chunk.dataLength,
		0,
	);
	const result = new Uint8Array(png.length - removedLength + textChunk.length);
	let write = 0;
	let read = 0;
	for (const chunk of removed) {
		result.set(png.subarray(read, chunk.chunkOffset), write);
		write += chunk.chunkOffset - read;
		read = chunk.chunkOffset + 12 + chunk.dataLength;
	}
	// Everything up to IEND, then the new chunk, then IEND and any trailing bytes
	result.set(png.subarray(read, iend.chunkOffset), write);
	write += iend.chunkOffset - read;
	result.set(textChunk, write);
	write += textChunk.length;
	result.set(png.subarray(iend.chunkOffset), write);

	return result;
};

/**
 * Reads the raw keyword bytes of an iTXt chunk (up to the first NUL, capped
 * at the spec's 79-byte keyword limit + NUL).
 */
const readITxtKeywordBytes = (
	bytes: Uint8Array,
	chunk: PngChunk,
): Uint8Array => {
	const end = Math.min(
		chunk.dataOffset + chunk.dataLength,
		chunk.dataOffset + 80,
	);
	let keywordEnd = chunk.dataOffset;
	while (keywordEnd < end && bytes[keywordEnd] !== 0) {
		keywordEnd++;
	}
	return bytes.subarray(chunk.dataOffset, keywordEnd);
};

const bytesEqual = (a: Uint8Array, b: Uint8Array): boolean =>
	a.length === b.length && a.every((byte, i) => byte === b[i]);

/**
 * Reads back the text stored by {@link insertPngTextChunk} under `keyword`.
 * Returns null when the bytes are not a PNG, the chunk is missing, or the
 * chunk is compressed (this module only ever writes uncompressed chunks).
 *
 * The keyword is compared as UTF-8 bytes — the encoding this module writes.
 * Note the PNG spec expects Latin-1 keywords, so prefer ASCII keywords for
 * interoperability with other readers.
 */
export const readPngTextChunk = (
	png: Uint8Array,
	keyword: string,
): string | null => {
	if (!isPng(png)) {
		return null;
	}
	const keywordBytes = new TextEncoder().encode(keyword);
	for (const chunk of listChunks(png)) {
		if (chunk.type !== ITXT_TYPE) {
			continue;
		}
		if (!bytesEqual(readITxtKeywordBytes(png, chunk), keywordBytes)) {
			continue;
		}
		const dataEnd = chunk.dataOffset + chunk.dataLength;
		let cursor = chunk.dataOffset + keywordBytes.length + 1;
		const compressionFlag = png[cursor];
		cursor += 2; // compression flag + compression method
		// Skip language tag and translated keyword (both NUL-terminated)
		for (let fields = 0; fields < 2; fields++) {
			while (cursor < dataEnd && png[cursor] !== 0) {
				cursor++;
			}
			cursor++;
		}
		if (compressionFlag !== 0 || cursor > dataEnd) {
			return null;
		}
		return new TextDecoder("utf-8").decode(png.subarray(cursor, dataEnd));
	}
	return null;
};
