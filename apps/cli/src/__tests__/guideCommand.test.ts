import { DrawingGuideError } from "@jiscribe/doc-tools/guides";
import type * as DocToolsGuides from "@jiscribe/doc-tools/guides";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runGuideCommand } from "../guideCommand";

const stubs = vi.hoisted(() => ({
	/** Thrown by readDrawingGuide when set. */
	error: null as Error | null,
}));

vi.mock("@jiscribe/doc-tools/guides", async (importOriginal) => {
	const actual = await importOriginal<typeof DocToolsGuides>();
	return {
		...actual,
		readDrawingGuide: (...args: Parameters<typeof actual.readDrawingGuide>) => {
			if (stubs.error !== null) {
				throw stubs.error;
			}
			return actual.readDrawingGuide(...args);
		},
	};
});

afterEach(() => {
	stubs.error = null;
	vi.restoreAllMocks();
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
	const code = body();
	vi.restoreAllMocks();
	return { code, stdout, stderr };
};

describe("guide", () => {
	it("prints the drawing guide and the JSON format guide", () => {
		for (const guide of ["drawing", "json-format"]) {
			const { code, stdout } = capture(() => runGuideCommand([guide]));
			expect(code).toBe(0);
			expect(stdout.trim()).not.toBe("");
			expect(stdout).toMatch(/^#/m);
		}
	});

	it("exits 2 for a guide that does not exist", () => {
		const { code, stderr } = capture(() => runGuideCommand(["colours"]));
		expect(code).toBe(2);
		expect(stderr).toMatch(/^usage: jiscribe guide/);
	});

	it("exits 1 with the reason when the guide is missing or empty", () => {
		stubs.error = new DrawingGuideError(
			'the "drawing" guide at @jiscribe/doc-schema/canvas-prompt is empty, so this installation is incomplete',
		);
		const { code, stdout, stderr } = capture(() =>
			runGuideCommand(["drawing"]),
		);
		expect(code).toBe(1);
		expect(stdout).toBe("");
		expect(stderr).toBe(
			'error: the "drawing" guide at @jiscribe/doc-schema/canvas-prompt is empty, so this installation is incomplete\n',
		);
	});
});
