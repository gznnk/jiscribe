import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it, vi } from "vitest";

import { runCheckCommand } from "../checkCommand";
import { runMeasureCommand } from "../measureCommand";
import { formatDiagnosticLine } from "../reportLines";

const fixture = (name: string): string =>
	fileURLToPath(
		new URL(
			`../../../../packages/doc-tools/src/__tests__/fixtures/${name}`,
			import.meta.url,
		),
	);

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

describe("formatDiagnosticLine", () => {
	it("keeps the message in the fourth field, with a dash for an unnamed object", () => {
		expect(
			formatDiagnosticLine("a.jis.json", {
				severity: "error",
				message: "went wrong",
			}),
		).toBe("error a.jis.json - went wrong");
	});
});

describe("validate", () => {
	it("prints one ok line per file and exits 0", () => {
		const { code, stdout } = capture(() =>
			runCheckCommand([fixture("fitting.jis.json")], false),
		);
		expect(code).toBe(0);
		expect(stdout.trim().split("\n")).toHaveLength(1);
		expect(stdout).toMatch(/^ok /);
	});

	it("exits 1 and names the object for a document the parser rejects", () => {
		const { code, stdout } = capture(() =>
			runCheckCommand([fixture("broken.jis.json")], false),
		);
		expect(code).toBe(1);
		expect(stdout).toMatch(/^error .*broken\.jis\.json duplicated /m);
	});

	it("leaves overflow to diagnose", () => {
		expect(
			capture(() => runCheckCommand([fixture("overflowing.jis.json")], false))
				.code,
		).toBe(0);
	});

	it("reports a file it cannot read rather than throwing", () => {
		const { code, stdout } = capture(() =>
			runCheckCommand(["no-such-file.jis.json"], false),
		);
		expect(code).toBe(1);
		expect(stdout).toMatch(/cannot read/);
	});

	it("asks for files when given none", () => {
		const { code, stderr } = capture(() => runCheckCommand([], false));
		expect(code).toBe(2);
		expect(stderr).toMatch(/usage: jiscribe validate/);
	});
});

describe("diagnose", () => {
	it("reports the overflow validate lets through", () => {
		const { code, stdout } = capture(() =>
			runCheckCommand([fixture("overflowing.jis.json")], true),
		);
		expect(code).toBe(1);
		expect(stdout).toMatch(/^error .* cramped text overflows rect 60x40/m);
	});

	it("prints one JSON object for every file under --json", () => {
		const { code, stdout } = capture(() =>
			runCheckCommand(["--json", fixture("fitting.jis.json")], true),
		);
		expect(code).toBe(0);
		expect(JSON.parse(stdout)).toMatchObject({
			files: [{ ok: true, diagnostics: [] }],
		});
	});
});

describe("measure", () => {
	it("finds a real diagram's stadium label fits, and exits 0", () => {
		const { code, stdout } = capture(() =>
			runMeasureCommand([
				"--width",
				"240",
				"--height",
				"80",
				"--font-size",
				"13",
				"--shape",
				"stadium",
				"チャットアシスタント",
			]),
		);
		expect(code).toBe(0);
		expect(stdout).toContain("lines 1\n");
		expect(stdout).toContain("content 148x76\n");
		expect(stdout).toContain("fits yes\n");
	});

	it("exits 1 for a text the box cannot hold", () => {
		const { code, stdout } = capture(() =>
			runMeasureCommand([
				"--width",
				"60",
				"--height",
				"40",
				"--font-size",
				"14",
				"この箱には到底入りきらない長さの説明文",
			]),
		);
		expect(code).toBe(1);
		expect(stdout).toContain("fits no\n");
	});

	it("insists on a height for a shape whose outline is cut from both sides", () => {
		const { code, stderr } = capture(() =>
			runMeasureCommand([
				"--width",
				"240",
				"--font-size",
				"13",
				"--shape",
				"stadium",
				"x",
			]),
		);
		expect(code).toBe(2);
		expect(stderr).toMatch(/--height is required for --shape stadium/);
	});

	it("refuses a shape that lays its text outside its box", () => {
		const { code, stderr } = capture(() =>
			runMeasureCommand([
				"--width",
				"40",
				"--height",
				"60",
				"--font-size",
				"14",
				"--shape",
				"actor",
				"x",
			]),
		);
		expect(code).toBe(2);
		expect(stderr).toMatch(/lays its text outside its box/);
	});

	it("rejects a width that is not a positive number", () => {
		const { code, stderr } = capture(() =>
			runMeasureCommand(["--width", "0", "--font-size", "13", "x"]),
		);
		expect(code).toBe(2);
		expect(stderr).toMatch(/--width must be a positive number/);
	});
});
