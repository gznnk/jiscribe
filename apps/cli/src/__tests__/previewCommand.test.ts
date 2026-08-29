import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { PREVIEW_DIR_CANDIDATES } from "../preview/previewAssets";
import { runPreviewCommand } from "../previewCommand";

const fixture = (name: string): string =>
	fileURLToPath(
		new URL(
			`../../../../packages/doc-tools/src/__tests__/fixtures/${name}`,
			import.meta.url,
		),
	);

/** Whether a preview can be written at all: the page has to have been built. */
const isPreviewBuilt = PREVIEW_DIR_CANDIDATES.some((dir) =>
	existsSync(join(dir, "preview.js")),
);

const workDir = mkdtempSync(join(tmpdir(), "jiscribe-preview-"));
afterAll(() => {
	rmSync(workDir, { recursive: true, force: true });
});

/** Runs `body` with both streams captured, and hands back what it wrote. */
const capture = (
	body: () => number,
): { code: number; stdout: string; stderr: string } => {
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
	return { code: body(), stdout, stderr };
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("preview argument handling", () => {
	it("prints the usage and exits 2 when the output is missing", () => {
		const { code, stderr } = capture(() =>
			runPreviewCommand([fixture("fitting.jis.json")]),
		);
		expect(code).toBe(2);
		expect(stderr).toMatch(/-o \/ --out is required/);
		expect(stderr).toMatch(/usage: jiscribe preview/);
	});

	it("reports a file it cannot read", () => {
		const { code, stderr } = capture(() =>
			runPreviewCommand([
				"no-such-file.jis.json",
				"-o",
				join(workDir, "out.html"),
			]),
		);
		expect(code).toBe(1);
		expect(stderr).toMatch(/cannot read no-such-file\.jis\.json/);
	});

	it("refuses a document that does not validate, and says why", () => {
		const { code, stdout, stderr } = capture(() =>
			runPreviewCommand([
				fixture("broken.jis.json"),
				"-o",
				join(workDir, "broken.html"),
			]),
		);
		expect(code).toBe(1);
		expect(stdout).toMatch(/^error /m);
		expect(stderr).toMatch(/does not validate, so there is nothing to preview/);
		expect(existsSync(join(workDir, "broken.html"))).toBe(false);
	});
});

describe.skipIf(!isPreviewBuilt)("preview output", () => {
	it("writes one file carrying the document and the canvas", () => {
		const output = join(workDir, "nested", "fitting.html");
		const { code, stdout } = capture(() =>
			runPreviewCommand([fixture("fitting.jis.json"), "-o", output]),
		);
		expect(code).toBe(0);
		// The directory did not exist: a preview makes its own way, like a render.
		expect(existsSync(output)).toBe(true);
		expect(stdout).toMatch(/-> .*fitting\.html \d+ KB/);

		const page = readFileSync(output, "utf8");
		expect(page.startsWith("<!doctype html>")).toBe(true);
		expect(page).toContain("<title>fitting.jis.json</title>");
		// Nothing beside the file is needed: no src / href pointing at a sibling.
		expect(page).not.toMatch(/<script[^>]+src=/);
		expect(page).not.toMatch(/<link[^>]+href="(?!https:\/\/fonts\.)/);
	});
});
