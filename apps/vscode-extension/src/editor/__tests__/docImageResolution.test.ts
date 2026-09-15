import { describe, expect, it, vi } from "vitest";

import {
	buildImageResolvedMessage,
	MAX_ENCODABLE_IMAGE_BYTES,
	resolveDocImageContent,
	type DocImageReader,
} from "../docImageResolution";

/** Reader returning fixed bytes and recording the segments it was asked for. */
const makeReader = (
	bytes: Uint8Array,
): { read: DocImageReader; requested: readonly string[][] } => {
	const requested: string[][] = [];
	return {
		read: async (segments) => {
			requested.push([...segments]);
			return bytes;
		},
		requested,
	};
};

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

describe("resolveDocImageContent", () => {
	it("reads the file at the src's segments and returns base64 with its MIME type", async () => {
		const { read, requested } = makeReader(PNG_BYTES);

		const content = await resolveDocImageContent("images/logo.png", read);

		expect(content).toEqual({
			ok: true,
			base64: Buffer.from(PNG_BYTES).toString("base64"),
			mimeType: "image/png",
		});
		// The segments go to Uri.joinPath as-is, so the split must not be collapsed.
		expect(requested).toEqual([["images", "logo.png"]]);
	});

	it("round-trips the bytes through base64", async () => {
		// Every byte value, so a mangled encoding (utf8 / latin1) cannot pass.
		const allBytes = new Uint8Array(256).map((_, index) => index);
		const { read } = makeReader(allBytes);

		const content = await resolveDocImageContent("a.png", read);

		expect(content.ok).toBe(true);
		expect(
			new Uint8Array(Buffer.from(content.ok ? content.base64 : "", "base64")),
		).toEqual(allBytes);
	});

	it("refuses a src that leaves the document's folder, without reading anything", async () => {
		const read = vi.fn<DocImageReader>(async () => PNG_BYTES);

		for (const src of [
			"../secret.png",
			"/etc/logo.png",
			"C:/logo.png",
			"https://example.com/logo.png",
			"images\\logo.png",
			"",
		]) {
			const content = await resolveDocImageContent(src, read);
			expect(content.ok).toBe(false);
			expect(content.ok ? "" : content.error).toContain(
				"relative path inside the document's folder",
			);
		}
		expect(read).not.toHaveBeenCalled();
	});

	it("refuses an unsupported file type before reading", async () => {
		const read = vi.fn<DocImageReader>(async () => PNG_BYTES);

		const content = await resolveDocImageContent("docs/notes.txt", read);

		expect(content).toEqual({
			ok: false,
			error: 'Unsupported image file type: "docs/notes.txt"',
		});
		expect(read).not.toHaveBeenCalled();
	});

	it("reports a failed read with the reader's message", async () => {
		const content = await resolveDocImageContent(
			"images/logo.png",
			async () => {
				throw new Error("EntryNotFound");
			},
		);

		expect(content).toEqual({
			ok: false,
			error: 'Could not read image "images/logo.png": EntryNotFound',
		});
	});

	it("refuses a file whose base64 cannot fit in a string, without encoding it", async () => {
		// Only the length is read before the refusal, so the test states one instead
		// of allocating the 384 MB it would take to reach the limit for real.
		const oversized = { length: MAX_ENCODABLE_IMAGE_BYTES + 1 } as Uint8Array;

		const content = await resolveDocImageContent(
			"images/huge.png",
			async () => oversized,
		);

		expect(content.ok).toBe(false);
		expect(content.ok ? "" : content.error).toContain(
			'Image "images/huge.png" is too large to display',
		);
	});

	it("answers rather than throwing when the encoding itself fails", async () => {
		// What the size check cannot foresee: an allocation that fails on the way to
		// the string. The caller voids this Promise, so a throw would leave the
		// Webview waiting for an imageResolved that never comes.
		const encode = vi.spyOn(Buffer, "from").mockImplementation(() => {
			throw new RangeError("Array buffer allocation failed");
		});

		try {
			const content = await resolveDocImageContent(
				"a.png",
				async () => PNG_BYTES,
			);

			expect(content).toEqual({
				ok: false,
				error: 'Could not encode image "a.png": Array buffer allocation failed',
			});
		} finally {
			encode.mockRestore();
		}
	});

	it("reports a failed read that threw a non-Error", async () => {
		const content = await resolveDocImageContent("a.png", () =>
			Promise.reject("nope"),
		);

		expect(content).toEqual({
			ok: false,
			error: 'Could not read image "a.png"',
		});
	});
});

describe("buildImageResolvedMessage", () => {
	it("addresses a success to the request", () => {
		expect(
			buildImageResolvedMessage("page-7", {
				ok: true,
				base64: "AAA=",
				mimeType: "image/png",
			}),
		).toEqual({
			type: "imageResolved",
			requestId: "page-7",
			ok: true,
			base64: "AAA=",
			mimeType: "image/png",
		});
	});

	it("addresses a failure to the request", () => {
		expect(
			buildImageResolvedMessage("page-8", { ok: false, error: "boom" }),
		).toEqual({
			type: "imageResolved",
			requestId: "page-8",
			ok: false,
			error: "boom",
		});
	});
});
