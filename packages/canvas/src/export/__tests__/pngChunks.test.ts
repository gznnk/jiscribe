import { describe, expect, it } from "vitest";

import { crc32, insertPngTextChunk, readPngTextChunk } from "../pngChunks";

/** 1x1 transparent PNG (real encoder output). Used as the base for structural checks. */
const TINY_PNG_BASE64 =
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const tinyPng = (): Uint8Array =>
	new Uint8Array(Buffer.from(TINY_PNG_BASE64, "base64"));

const readUint32 = (bytes: Uint8Array, offset: number): number =>
	((bytes[offset] << 24) |
		(bytes[offset + 1] << 16) |
		(bytes[offset + 2] << 8) |
		bytes[offset + 3]) >>>
	0;

const chunkTypeAt = (bytes: Uint8Array, offset: number): string =>
	String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));

/** Turns the chunk sequence into a list of [type, dataLength] (a naive walker for tests) */
const listChunkTypes = (bytes: Uint8Array): string[] => {
	const types: string[] = [];
	let offset = 8;
	while (offset + 12 <= bytes.length) {
		const length = readUint32(bytes, offset);
		types.push(chunkTypeAt(bytes, offset));
		offset += 12 + length;
	}
	return types;
};

describe("crc32", () => {
	it("matches the known PNG-spec vector (IEND chunk with empty data)", () => {
		// the IEND chunk CRC is always 0xAE426082 (type "IEND" only, no data)
		const iendType = new Uint8Array([0x49, 0x45, 0x4e, 0x44]);
		expect(crc32(iendType)).toBe(0xae426082);
	});
});

describe("insertPngTextChunk / readPngTextChunk", () => {
	it("embeds and reads back UTF-8 text (including Japanese)", () => {
		const text = JSON.stringify({ version: 1, ラベル: "日本語テキスト🎨" });
		const embedded = insertPngTextChunk(tinyPng(), "jiscribe", text);
		expect(readPngTextChunk(embedded, "jiscribe")).toBe(text);
	});

	it("inserts iTXt right before IEND and preserves the other chunks", () => {
		const embedded = insertPngTextChunk(tinyPng(), "jiscribe", "data");
		const types = listChunkTypes(embedded);
		expect(types).toEqual(["IHDR", "IDAT", "iTXt", "IEND"]);
	});

	it("the inserted chunk's CRC matches the CRC32 of type+data", () => {
		const embedded = insertPngTextChunk(tinyPng(), "jiscribe", "abc");
		// find the iTXt chunk
		let offset = 8;
		while (chunkTypeAt(embedded, offset) !== "iTXt") {
			offset += 12 + readUint32(embedded, offset);
		}
		const dataLength = readUint32(embedded, offset);
		const stored = readUint32(embedded, offset + 8 + dataLength);
		const computed = crc32(
			embedded.subarray(offset + 4, offset + 8 + dataLength),
		);
		expect(stored).toBe(computed);
	});

	it("re-embedding the same keyword replaces rather than duplicates", () => {
		const once = insertPngTextChunk(tinyPng(), "jiscribe", "first");
		const twice = insertPngTextChunk(once, "jiscribe", "second");
		expect(readPngTextChunk(twice, "jiscribe")).toBe("second");
		expect(
			listChunkTypes(twice).filter((type) => type === "iTXt"),
		).toHaveLength(1);
	});

	it("preserves an iTXt chunk with a different keyword", () => {
		const withOther = insertPngTextChunk(tinyPng(), "other", "keep me");
		const embedded = insertPngTextChunk(withOther, "jiscribe", "data");
		expect(readPngTextChunk(embedded, "other")).toBe("keep me");
		expect(readPngTextChunk(embedded, "jiscribe")).toBe("data");
	});

	it("round-trips a non-ASCII keyword (multi-byte UTF-8)", () => {
		const embedded = insertPngTextChunk(tinyPng(), "メモ", "非ASCIIキーワード");
		expect(readPngTextChunk(embedded, "メモ")).toBe("非ASCIIキーワード");
	});

	it("round-trips a Latin-1 keyword (café)", () => {
		const embedded = insertPngTextChunk(tinyPng(), "café", "latin-1 keyword");
		expect(readPngTextChunk(embedded, "café")).toBe("latin-1 keyword");
	});

	it("re-embedding a non-ASCII keyword also replaces rather than duplicates", () => {
		const once = insertPngTextChunk(tinyPng(), "メモ", "first");
		const twice = insertPngTextChunk(once, "メモ", "second");
		expect(readPngTextChunk(twice, "メモ")).toBe("second");
		expect(
			listChunkTypes(twice).filter((type) => type === "iTXt"),
		).toHaveLength(1);
	});

	it("returns null when reading a keyword absent from the PNG", () => {
		expect(readPngTextChunk(tinyPng(), "jiscribe")).toBeNull();
	});

	it("non-PNG bytes read as null and insertion throws", () => {
		const notPng = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(readPngTextChunk(notPng, "jiscribe")).toBeNull();
		expect(() => insertPngTextChunk(notPng, "jiscribe", "x")).toThrow(
			/Not a PNG/,
		);
	});

	it("inserting into a PNG missing IEND throws", () => {
		const truncated = tinyPng().subarray(0, 40);
		expect(() => insertPngTextChunk(truncated, "jiscribe", "x")).toThrow(
			/missing IEND/,
		);
	});
});
