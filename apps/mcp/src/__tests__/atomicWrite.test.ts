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

		// 引き継がないと umask 由来の既定モードになり、元より緩くなりうる
		expect((await stat(target)).mode & 0o777).toBe(0o600);
	});

	it("leaves the original alone when the write fails", async () => {
		// 親が存在しないので一時ファイルの作成から失敗する
		const target = join(dir, "missing-dir", "file.jis.json");

		await expect(writeFileAtomically(target, "hello")).rejects.toThrow();
		expect(await readdir(dir)).toEqual([]);
	});

	it("never shows a half-written file to a reader", async () => {
		const target = join(dir, "big.jis.json");
		// 長さを変えておく。同じ長さだと、途中まで書かれた姿と完成品を見分けられない
		const shortContents = "s".repeat(400_000);
		const longContents = "l".repeat(900_000);
		await writeFile(target, shortContents, "utf8");

		// 書き換えている最中に読み続ける。直接上書きなら途中の長さで読めてしまう
		const seen = new Set<number>();
		let keepReading = true;
		const reader = (async () => {
			while (keepReading) {
				try {
					seen.add((await readFile(target, "utf8")).length);
				} catch {
					// 置き換えの隙間で開けないことは有りうる。長さの確認が目的なので無視する
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

		// 読めたのは完成品の 2 種類だけで、途中の長さは 1 度も現れないこと
		expect([...seen].sort((a, b) => a - b)).toEqual([
			shortContents.length,
			longContents.length,
		]);
	});
});
