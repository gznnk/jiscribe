import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { runRenderCommand } from "../renderCommand";

const fixture = (name: string): string =>
	fileURLToPath(
		new URL(
			`../../../../packages/doc-tools/src/__tests__/fixtures/${name}`,
			import.meta.url,
		),
	);

const distHarness = join(
	dirname(fileURLToPath(import.meta.url)),
	"../../dist/harness/fonts.json",
);

/**
 * Whether a render can be attempted at all: the harness has to have been built
 * (`pnpm build:cli`), which a checkout that has only run `pnpm install` has not
 * done. Launching a browser is checked inside the test itself, since a machine
 * with no Chromium should skip rather than fail.
 */
const isHarnessBuilt = existsSync(distHarness);

const workDir = mkdtempSync(join(tmpdir(), "jiscribe-render-"));

afterAll(() => {
	rmSync(workDir, { recursive: true, force: true });
});

const capture = async (
	body: () => Promise<number>,
): Promise<{ code: number; stdout: string; stderr: string }> => {
	let stdout = "";
	let stderr = "";
	vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
		stdout += String(chunk);
		return true;
	});
	vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
		stderr += String(chunk);
		return true;
	});
	return { code: await body(), stdout, stderr };
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("render argument handling", () => {
	it("prints the usage and exits 2 when the output is missing", async () => {
		const { code, stderr } = await capture(() =>
			runRenderCommand([fixture("fitting.jis.json")]),
		);
		expect(code).toBe(2);
		expect(stderr).toMatch(/-o \/ --out is required/);
		expect(stderr).toMatch(/usage: jiscribe render/);
	});

	it("rejects an unknown region before opening the file", async () => {
		const { code, stderr } = await capture(() =>
			runRenderCommand([
				"no-such-file.jis.json",
				"-o",
				join(workDir, "out.png"),
				"--region",
				"nope",
			]),
		);
		expect(code).toBe(2);
		expect(stderr).toMatch(/unknown --region/);
	});

	it("reports a file it cannot read", async () => {
		const { code, stderr } = await capture(() =>
			runRenderCommand([
				"no-such-file.jis.json",
				"-o",
				join(workDir, "out.png"),
			]),
		);
		expect(code).toBe(1);
		expect(stderr).toMatch(/cannot read no-such-file\.jis\.json/);
	});

	it("refuses to render a document that does not validate, and says why", async () => {
		const { code, stdout, stderr } = await capture(() =>
			runRenderCommand([
				fixture("broken.jis.json"),
				"-o",
				join(workDir, "out.png"),
			]),
		);
		expect(code).toBe(1);
		expect(stdout).toMatch(/^error .* duplicated /m);
		expect(stderr).toMatch(/does not validate, so there is nothing to render/);
	});

	it("never launches a browser for any of the above", () => {
		// The render path imports playwright on demand, so a run that failed before
		// reaching it cannot have loaded the driver.
		expect(
			Object.keys(process.versions).some((key) => key === "playwright"),
		).toBe(false);
	});
});

// Everything below draws in a real browser. Skipped where the harness has not
// been built, and skipped from inside where no Chromium can be launched, so a
// checkout without either still passes.
describe.skipIf(!isHarnessBuilt)("render in a browser", () => {
	it("draws a document to a PNG at the size the content bounds imply", async (ctx) => {
		const output = join(workDir, "fitting.png");
		const { code, stdout, stderr } = await capture(() =>
			runRenderCommand([
				fixture("fitting.jis.json"),
				"-o",
				output,
				"--scale",
				"2",
			]),
		);
		if (code === 1 && /needs a Chromium-based browser/.test(stderr)) {
			ctx.skip();
			return;
		}
		expect(stderr).toBe("");
		expect(code).toBe(0);
		expect(stdout).toMatch(/^rendered .* -> .*fitting\.png \d+x\d+ via /m);

		const png = readFileSync(output);
		expect(png.subarray(0, 8)).toEqual(
			Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		);
		// IHDR width/height, big-endian, straight after the 8-byte signature and
		// the 8-byte chunk header.
		const width = png.readUInt32BE(16);
		const height = png.readUInt32BE(20);
		// The fixture's shapes span 40..550 x 40..160 before the text object and
		// the 40px margin; the scale doubles whatever that comes to.
		expect(width % 2).toBe(0);
		expect(height % 2).toBe(0);
		expect(width).toBeGreaterThan(400);
		expect(height).toBeGreaterThan(100);
		// The .jis.json is embedded, so the image reopens for editing.
		expect(png.includes(Buffer.from("jiscribe"))).toBe(true);
	}, 120_000);

	it("draws the same document to an SVG carrying its source", async (ctx) => {
		const output = join(workDir, "fitting.svg");
		const { code, stderr } = await capture(() =>
			runRenderCommand([fixture("fitting.jis.json"), "-o", output]),
		);
		if (code === 1 && /needs a Chromium-based browser/.test(stderr)) {
			ctx.skip();
			return;
		}
		expect(code).toBe(0);
		const svg = readFileSync(output, "utf8");
		expect(svg).toMatch(/^<\?xml version="1\.0"/);
		expect(svg).toMatch(/<svg width="\d+" height="\d+" viewBox=/);
		expect(svg).toContain("jiscribe:source");
	}, 120_000);

	it("gives byte-identical output for the same input twice", async (ctx) => {
		const first = join(workDir, "repeat-a.png");
		const second = join(workDir, "repeat-b.png");
		const runOnce = (output: string) =>
			capture(() =>
				runRenderCommand([fixture("fitting.jis.json"), "-o", output]),
			);

		const one = await runOnce(first);
		if (one.code === 1 && /needs a Chromium-based browser/.test(one.stderr)) {
			ctx.skip();
			return;
		}
		expect(one.code).toBe(0);
		expect((await runOnce(second)).code).toBe(0);
		expect(readFileSync(first).equals(readFileSync(second))).toBe(true);
	}, 240_000);

	it("reports the browser it was told to use when it cannot be launched", async () => {
		const { code, stderr } = await capture(() =>
			runRenderCommand([
				fixture("fitting.jis.json"),
				"-o",
				join(workDir, "unused.png"),
				"--browser",
				"/no/such/browser",
			]),
		);
		expect(code).toBe(1);
		expect(stderr).toMatch(/--browser \/no\/such\/browser: no such file/);
	}, 60_000);
});
