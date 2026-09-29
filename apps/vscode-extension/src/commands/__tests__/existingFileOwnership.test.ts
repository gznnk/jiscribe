import { describe, expect, it } from "vitest";

import { classifyExistingFile } from "../existingFileOwnership";
import { GENERATED_NOTICE } from "../generatedFileNotice";

const GENERATED_ADAPTER = new TextEncoder().encode(
	`${GENERATED_NOTICE}\n\nRead .jiscribe/ai-guide.md and follow it.\n`,
);
const USER_ADAPTER = new TextEncoder().encode(
	"---\nname: jiscribe\n---\n\nOur own skill.\n",
);

/** A reader over fixed bytes; null stands for a file that is not there. */
const makeReader =
	(bytes: Uint8Array | null) => async (): Promise<Uint8Array> => {
		if (bytes === null) {
			throw new Error("EntryNotFound");
		}
		return bytes;
	};

describe("classifyExistingFile", () => {
	it("reports a destination with nothing at it", async () => {
		expect(await classifyExistingFile(makeReader(null))).toBe("absent");
	});

	it("recognises a copy an earlier run wrote", async () => {
		expect(await classifyExistingFile(makeReader(GENERATED_ADAPTER))).toBe(
			"generated",
		);
	});

	it("treats a file without the notice as the user's", async () => {
		expect(await classifyExistingFile(makeReader(USER_ADAPTER))).toBe(
			"foreign",
		);
	});

	it("treats an empty file as the user's, not as an absent one", async () => {
		expect(await classifyExistingFile(makeReader(new Uint8Array()))).toBe(
			"foreign",
		);
	});

	it("takes a notice buried below the first line as the user's", async () => {
		const buried = new TextEncoder().encode(`# Notes\n\n${GENERATED_NOTICE}\n`);

		expect(await classifyExistingFile(makeReader(buried))).toBe("foreign");
	});
});
