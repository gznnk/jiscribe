import { describe, expect, it } from "vitest";

import {
	GENERATED_NOTICE,
	isGeneratedFileContent,
} from "../generatedFileNotice";

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe("isGeneratedFileContent", () => {
	it("accepts a file written with the notice on its first line", () => {
		expect(
			isGeneratedFileContent(
				encode(`${GENERATED_NOTICE}\n\n# Jiscribe reference\n`),
			),
		).toBe(true);
	});

	it("accepts the notice followed by a CRLF or a trailing space", () => {
		expect(isGeneratedFileContent(encode(`${GENERATED_NOTICE}\r\nbody`))).toBe(
			true,
		);
		expect(isGeneratedFileContent(encode(`${GENERATED_NOTICE}  \nbody`))).toBe(
			true,
		);
	});

	it("accepts a file saved with a UTF-8 BOM", () => {
		const withBom = new Uint8Array([
			0xef,
			0xbb,
			0xbf,
			...encode(`${GENERATED_NOTICE}\n`),
		]);

		expect(isGeneratedFileContent(withBom)).toBe(true);
	});

	it("rejects a user's own file, including one that mentions the notice later", () => {
		for (const text of [
			"# Team notes\n\nOur shape conventions.\n",
			"",
			"\n",
			`# Team notes\n\n${GENERATED_NOTICE}\n`,
			`<!-- ${GENERATED_NOTICE}`,
		]) {
			expect(isGeneratedFileContent(encode(text))).toBe(false);
		}
	});

	it("rejects bytes that are not text", () => {
		expect(
			isGeneratedFileContent(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0xff])),
		).toBe(false);
	});
});
