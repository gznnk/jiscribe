// The temporary file must be created with the destination's mode, not chmod'd
// into it afterwards: between the two the contents of a 0600 file would sit in a
// world-readable one. The window is too short to catch by watching the
// directory, so what the write was asked for is what is checked.
//
// node:fs/promises is mocked here rather than in atomicWrite.test.ts, where
// every other case wants the plain module.

import * as fsPromises from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { writeFileAtomically } from "../atomicWrite";

vi.mock("node:fs/promises", async (importActual) => {
	const actual = await importActual<typeof fsPromises>();
	return { ...actual, writeFile: vi.fn(actual.writeFile) };
});

let dir: string;

/** The options the last creation of a temporary file was given */
const lastWriteOptions = (): unknown =>
	vi.mocked(fsPromises.writeFile).mock.calls.at(-1)?.[2];

beforeEach(async () => {
	dir = await fsPromises.mkdtemp(join(tmpdir(), "jiscribe-atomic-mode-"));
});

afterEach(async () => {
	vi.mocked(fsPromises.writeFile).mockClear();
	await fsPromises.rm(dir, { recursive: true, force: true });
});

describe("writeFileAtomically", () => {
	it("creates the temporary file with the mode the destination has", async () => {
		const target = join(dir, "restricted.jis.json");
		await fsPromises.writeFile(target, "old", "utf8");
		await fsPromises.chmod(target, 0o600);
		vi.mocked(fsPromises.writeFile).mockClear();

		await writeFileAtomically(target, "new");

		const options = lastWriteOptions();
		expect(options).toMatchObject({ mode: expect.any(Number) });
		expect((options as { mode: number }).mode & 0o777).toBe(0o600);
		expect((await fsPromises.stat(target)).mode & 0o777).toBe(0o600);
	});

	it("asks for no mode at all when there is no destination to take one from", async () => {
		await writeFileAtomically(join(dir, "fresh.jis.json"), "new");

		expect(lastWriteOptions()).toBeUndefined();
	});
});
