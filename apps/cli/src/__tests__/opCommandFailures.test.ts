// The failure paths no real input reaches: an op that throws or answers with an
// internal error, and a write-back that is refused or finds the path taken. The
// refusals themselves are saveCanvasFile's and tested in doc-tools; what is
// checked here is how each one reaches the report.

import {
	existsSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
} from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AiCanvasOpOutcome } from "@jiscribe/ai-tools";
import type * as AiToolsApply from "@jiscribe/ai-tools/apply";
import { DocOperationError } from "@jiscribe/doc";
import { CanvasFileError } from "@jiscribe/doc-tools/file";
import type * as DocToolsFile from "@jiscribe/doc-tools/file";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runOpCommand } from "../opCommand";

const stubs = vi.hoisted(() => ({
	/** Stands in for applyCanvasOp when set. */
	apply: null as null | (() => AiCanvasOpOutcome),
	/** Runs before the real saveCanvasFile when set; may throw instead. */
	beforeSave: null as null | ((path: string) => Promise<void>),
}));

vi.mock("@jiscribe/ai-tools/apply", async (importOriginal) => {
	const actual = await importOriginal<typeof AiToolsApply>();
	return {
		...actual,
		applyCanvasOp: (...args: Parameters<typeof actual.applyCanvasOp>) =>
			stubs.apply === null ? actual.applyCanvasOp(...args) : stubs.apply(),
	};
});

vi.mock("@jiscribe/doc-tools/file", async (importOriginal) => {
	const actual = await importOriginal<typeof DocToolsFile>();
	return {
		...actual,
		saveCanvasFile: async (
			...args: Parameters<typeof actual.saveCanvasFile>
		) => {
			await stubs.beforeSave?.(args[0]);
			await actual.saveCanvasFile(...args);
		},
	};
});

type Report = {
	ok: boolean;
	written: boolean;
	results: { ok: boolean; text: string }[];
	error?: { index?: number; tool?: string; message: string };
};

const EMPTY_DOC_TEXT = `${JSON.stringify({ version: 1, root: [] }, null, "\t")}\n`;
const RECT_ARGS = JSON.stringify({
	type: "rect",
	x: 0,
	y: 0,
	width: 100,
	height: 60,
});

let workDir: string;
let docPath: string;

beforeEach(() => {
	workDir = realpathSync(mkdtempSync(join(tmpdir(), "jiscribe-op-failure-")));
	docPath = join(workDir, "diagram.jis");
});

afterEach(() => {
	stubs.apply = null;
	stubs.beforeSave = null;
	vi.restoreAllMocks();
	rmSync(workDir, { recursive: true, force: true });
});

const runOpReport = async (
	argv: readonly string[],
): Promise<{ code: number; report: Report }> => {
	let stdout = "";
	vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
		stdout += String(chunk);
		return true;
	});
	const code = await runOpCommand(argv);
	vi.restoreAllMocks();
	return { code, report: JSON.parse(stdout) as Report };
};

describe("an op that throws", () => {
	it("is replied to as an internal error when the error is not the user's", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		stubs.apply = () => {
			throw new Error("boom");
		};
		const { code, report } = await runOpReport([docPath, "list_objects"]);
		expect(code).toBe(1);
		expect(report.results).toEqual([
			{ tool: "list_objects", ok: false, text: "internal error: boom" },
		]);
		expect(report.error).toEqual({
			index: 0,
			tool: "list_objects",
			message: "internal error: boom",
		});
	});

	it("is replied to as error: when it is a document operation's refusal", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		stubs.apply = () => {
			throw new DocOperationError("no such object");
		};
		const { report } = await runOpReport([docPath, "list_objects"]);
		expect(report.results[0].text).toBe("error: no such object");
		expect(report.error?.message).toBe("no such object");
	});
});

describe("an op answering with an internal error", () => {
	it("keeps the prefix rather than doubling it", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		stubs.apply = () => ({ ok: false, text: "internal error: lost" });
		const { code, report } = await runOpReport([docPath, "list_objects"]);
		expect(code).toBe(1);
		expect(report.results[0].text).toBe("internal error: lost");
		expect(report.error?.message).toBe("internal error: lost");
	});
});

describe("a refused write-back", () => {
	it("fails the whole run, with nothing written and no entry named", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		stubs.beforeSave = () =>
			Promise.reject(new CanvasFileError("refused to write (simulated)"));
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			RECT_ARGS,
		]);
		expect(code).toBe(1);
		expect(report.ok).toBe(false);
		expect(report.written).toBe(false);
		expect(report.results.map((result) => result.ok)).toEqual([true]);
		expect(report.error?.index).toBeUndefined();
		expect(report.error?.message).toBe("refused to write (simulated)");
		expect(readFileSync(docPath, "utf8")).toBe(EMPTY_DOC_TEXT);
	});

	it("keeps a file that appeared at a --create path while the batch ran", async () => {
		const outsideText = '{"version":1,"root":[]}\n';
		stubs.beforeSave = (path) => writeFile(path, outsideText);
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			RECT_ARGS,
			"--create",
		]);
		expect(code).toBe(1);
		expect(report.written).toBe(false);
		expect(report.error?.message).toMatch(
			/^refused to write: .* was created by something else/,
		);
		expect(existsSync(docPath)).toBe(true);
		expect(readFileSync(docPath, "utf8")).toBe(outsideText);
	});
});
