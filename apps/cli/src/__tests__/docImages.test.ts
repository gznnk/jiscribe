import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { readDocImage, toDocImageDataUri } from "../docImages";

const workDir = mkdtempSync(join(tmpdir(), "jiscribe-doc-images-"));
const docDirPath = join(workDir, "doc");
mkdirSync(join(docDirPath, "assets"), { recursive: true });
writeFileSync(join(docDirPath, "assets", "logo.png"), Buffer.from([1, 2, 3]));
// A sibling of the document's directory, which no `src` may reach.
writeFileSync(join(workDir, "outside.png"), Buffer.from([9]));
afterAll(() => {
	rmSync(workDir, { recursive: true, force: true });
});

describe("readDocImage", () => {
	it("reads a file below the document's directory with the type its extension names", () => {
		const image = readDocImage(docDirPath, "assets/logo.png");
		expect(image).toEqual({
			ok: true,
			body: Buffer.from([1, 2, 3]),
			contentType: "image/png",
		});
	});

	it.each(["../outside.png", "/etc/passwd.png", "assets\\logo.png"])(
		"refuses %s, which leaves the document's directory or breaks the separator rule",
		(src) => {
			const image = readDocImage(docDirPath, src);
			expect(image.ok).toBe(false);
			expect(!image.ok && image.reason).toBe(
				`"${src}" is not a relative path inside the document's directory`,
			);
		},
	);

	it("refuses an extension the canvas cannot draw before touching the disk", () => {
		const image = readDocImage(docDirPath, "assets/notes.txt");
		expect(!image.ok && image.reason).toBe(
			`"assets/notes.txt" is not an image file type the canvas can draw`,
		);
	});

	it("reports a missing file as a reason instead of throwing", () => {
		const image = readDocImage(docDirPath, "assets/missing.png");
		expect(image.ok).toBe(false);
		expect(!image.ok && image.reason).toMatch(
			/^cannot read "assets\/missing\.png": .*ENOENT/,
		);
	});
});

describe("toDocImageDataUri", () => {
	it("carries the bytes as base64 under the image's content type", () => {
		expect(
			toDocImageDataUri({
				body: Buffer.from("<svg/>"),
				contentType: "image/svg+xml",
			}),
		).toBe(
			`data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`,
		);
	});
});
