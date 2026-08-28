import {
	chmod,
	mkdtemp,
	readdir,
	readFile,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { writeFileAtomically } from "../atomicWrite";

let dir: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "jiscribe-atomic-"));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe("writeFileAtomically", () => {
	it("creates a file that was not there", async () => {
		const target = join(dir, "new.jis.json");

		await writeFileAtomically(target, "hello");

		expect(await readFile(target, "utf8")).toBe("hello");
	});

	it("replaces what was there", async () => {
		const target = join(dir, "existing.jis.json");
		await writeFile(target, "old", "utf8");

		await writeFileAtomically(target, "new");

		expect(await readFile(target, "utf8")).toBe("new");
	});

	it("leaves no scratch file behind", async () => {
		const target = join(dir, "clean.jis.json");

		await writeFileAtomically(target, "hello");

		expect(await readdir(dir)).toEqual(["clean.jis.json"]);
	});

	it("keeps the permissions the file already had", async () => {
		const target = join(dir, "restricted.jis.json");
		await writeFile(target, "old", "utf8");
		await chmod(target, 0o600);

		await writeFileAtomically(target, "new");

		// Without carrying them over the mode falls back to umask's default, which
		// can be looser than the original
		expect((await stat(target)).mode & 0o777).toBe(0o600);
	});

	it("leaves the original alone when the write fails", async () => {
		// The parent does not exist, so it fails from the creation of the
		// temporary file onward
		const target = join(dir, "missing-dir", "file.jis.json");

		await expect(writeFileAtomically(target, "hello")).rejects.toThrow();
		expect(await readdir(dir)).toEqual([]);
	});

	it("never shows a half-written file to a reader", async () => {
		const target = join(dir, "big.jis.json");
		// The lengths differ. At the same length a half-written file cannot be
		// told from a finished one
		const shortContents = "s".repeat(400_000);
		const longContents = "l".repeat(900_000);
		await writeFile(target, shortContents, "utf8");

		// Keeps reading while the rewrite is in flight. A direct overwrite would
		// let an intermediate length be read
		const seen = new Set<number>();
		let keepReading = true;
		const reader = (async () => {
			while (keepReading) {
				try {
					seen.add((await readFile(target, "utf8")).length);
				} catch {
					// The file may not open in the gap during the replacement. Lengths
					// are what we are after, so this is ignored
				}
			}
		})();

		for (let round = 0; round < 20; round += 1) {
			await writeFileAtomically(
				target,
				round % 2 === 0 ? longContents : shortContents,
			);
		}
		keepReading = false;
		await reader;

		// Only the two finished forms were ever read; no intermediate length ever
		// appeared
		expect([...seen].sort((a, b) => a - b)).toEqual([
			shortContents.length,
			longContents.length,
		]);
	});
});
