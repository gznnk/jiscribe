import { describe, expect, it } from "vitest";

import { crc32, insertPngTextChunk, readPngTextChunk } from "../pngChunks";

/** 1x1 透過 PNG（実エンコーダ出力）。構造検証のベースに使う。 */
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

/** チャンク列を [type, dataLength] のリストにする（テスト用の素朴な walker） */
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
	it("PNG 仕様の既知ベクトルと一致する（空データの IEND チャンク）", () => {
		// IEND チャンクの CRC は常に 0xAE426082（type "IEND" のみ、データ無し）
		const iendType = new Uint8Array([0x49, 0x45, 0x4e, 0x44]);
		expect(crc32(iendType)).toBe(0xae426082);
	});
});

describe("insertPngTextChunk / readPngTextChunk", () => {
	it("UTF-8 テキスト（日本語含む）を埋め込んで取り出せる", () => {
		const text = JSON.stringify({ version: 1, ラベル: "日本語テキスト🎨" });
		const embedded = insertPngTextChunk(tinyPng(), "jiscribe", text);
		expect(readPngTextChunk(embedded, "jiscribe")).toBe(text);
	});

	it("iTXt は IEND の直前に挿入され、他のチャンクは保持される", () => {
		const embedded = insertPngTextChunk(tinyPng(), "jiscribe", "data");
		const types = listChunkTypes(embedded);
		expect(types).toEqual(["IHDR", "IDAT", "iTXt", "IEND"]);
	});

	it("挿入したチャンクの CRC が type+data の CRC32 と一致する", () => {
		const embedded = insertPngTextChunk(tinyPng(), "jiscribe", "abc");
		// iTXt チャンクを探す
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

	it("同じ keyword の再埋め込みは置き換えになる（重複しない）", () => {
		const once = insertPngTextChunk(tinyPng(), "jiscribe", "first");
		const twice = insertPngTextChunk(once, "jiscribe", "second");
		expect(readPngTextChunk(twice, "jiscribe")).toBe("second");
		expect(
			listChunkTypes(twice).filter((type) => type === "iTXt"),
		).toHaveLength(1);
	});

	it("別 keyword の iTXt は温存される", () => {
		const withOther = insertPngTextChunk(tinyPng(), "other", "keep me");
		const embedded = insertPngTextChunk(withOther, "jiscribe", "data");
		expect(readPngTextChunk(embedded, "other")).toBe("keep me");
		expect(readPngTextChunk(embedded, "jiscribe")).toBe("data");
	});

	it("keyword が無い PNG からの読み出しは null", () => {
		expect(readPngTextChunk(tinyPng(), "jiscribe")).toBeNull();
	});

	it("PNG でないバイト列は読み出し null / 挿入は throw", () => {
		const notPng = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(readPngTextChunk(notPng, "jiscribe")).toBeNull();
		expect(() => insertPngTextChunk(notPng, "jiscribe", "x")).toThrow(
			/Not a PNG/,
		);
	});

	it("IEND を欠く PNG への挿入は throw", () => {
		const truncated = tinyPng().subarray(0, 40);
		expect(() => insertPngTextChunk(truncated, "jiscribe", "x")).toThrow(
			/missing IEND/,
		);
	});
});
