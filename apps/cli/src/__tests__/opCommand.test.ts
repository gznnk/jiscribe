import {
	existsSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	statSync,
} from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runOpCommand } from "../opCommand";

type Report = {
	ok: boolean;
	written: boolean;
	file: string;
	results: {
		tool: string;
		as?: string;
		ok: boolean;
		text: string;
		createdIds?: string[];
	}[];
	error?: { index?: number; tool?: string; as?: string; message: string };
};

/** Runs `op` with both streams captured, and hands back what it wrote. */
const runOp = async (
	argv: readonly string[],
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
	const code = await runOpCommand(argv);
	vi.restoreAllMocks();
	return { code, stdout, stderr };
};

/** Runs `op` expecting the JSON report, and parses it. */
const runOpReport = async (
	argv: readonly string[],
): Promise<{ code: number; report: Report }> => {
	const { code, stdout } = await runOp(argv);
	return { code, report: JSON.parse(stdout) as Report };
};

const EMPTY_DOC_TEXT = `${JSON.stringify({ version: 1, root: [] }, null, "\t")}\n`;

const rectArgs = (x: number): Record<string, unknown> => ({
	type: "rect",
	x,
	y: 0,
	width: 100,
	height: 60,
});

let workDir: string;
let docPath: string;

beforeEach(() => {
	// Resolved, as toCanvasFilePath resolves the path the report names
	workDir = realpathSync(mkdtempSync(join(tmpdir(), "jiscribe-op-")));
	docPath = join(workDir, "diagram.jis");
});

afterEach(() => {
	vi.restoreAllMocks();
	rmSync(workDir, { recursive: true, force: true });
});

/** Writes the batch to a file in the work directory and returns `@<path>`. */
const batchFile = async (batch: unknown): Promise<string> => {
	const path = join(workDir, "batch.json");
	await writeFile(path, JSON.stringify(batch));
	return `@${path}`;
};

const readDoc = (): {
	root: { id: string; type: string; [key: string]: unknown }[];
} => JSON.parse(readFileSync(docPath, "utf8"));

describe("op with one tool", () => {
	it("writes the file back and reports the ids the tool created", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			JSON.stringify(rectArgs(0)),
		]);
		expect(code).toBe(0);
		expect(report.ok).toBe(true);
		expect(report.written).toBe(true);
		expect(report.file).toBe(docPath);
		expect(report.results).toHaveLength(1);
		const [result] = report.results;
		expect(result.tool).toBe("add_object");
		expect(result.ok).toBe(true);
		expect(result.createdIds).toHaveLength(1);
		expect(result.text).toContain(result.createdIds?.[0]);
		expect(readDoc().root.map((object) => object.id)).toEqual(
			result.createdIds,
		);
	});

	it("resolves a relative file against the working directory", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		vi.spyOn(process, "cwd").mockReturnValue(workDir);
		const { stdout } = await runOp(["diagram.jis", "list_objects"]);
		expect((JSON.parse(stdout) as Report).file).toBe(docPath);
	});

	it("leaves the file untouched for a read-only tool, content and mtime alike", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const mtimeBefore = statSync(docPath).mtimeMs;
		const { code, report } = await runOpReport([docPath, "list_objects"]);
		expect(code).toBe(0);
		expect(report.ok).toBe(true);
		expect(report.written).toBe(false);
		expect(readFileSync(docPath, "utf8")).toBe(EMPTY_DOC_TEXT);
		expect(statSync(docPath).mtimeMs).toBe(mtimeBefore);
	});

	it("refuses an argument the tool does not declare, writing nothing", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			JSON.stringify({ ...rectArgs(0), cx: 10 }),
		]);
		expect(code).toBe(1);
		expect(report.written).toBe(false);
		expect(report.error?.index).toBe(0);
		expect(report.error?.tool).toBe("add_object");
		expect(report.error?.message).toContain("cx");
		expect(readFileSync(docPath, "utf8")).toBe(EMPTY_DOC_TEXT);
	});

	it("refuses a tool that needs a viewer, pointing at jiscribe-mcp", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([docPath, "capture_canvas"]);
		expect(code).toBe(1);
		expect(report.error?.message).toContain("jiscribe-mcp");
	});

	it("refuses undo, the CLI holding no history between runs", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([docPath, "undo"]);
		expect(code).toBe(1);
		expect(report.error?.message).toMatch(/no history between runs/);
		expect(report.error?.message).toContain("git");
	});

	it("reads --args from a file named with @", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const argsPath = join(workDir, "args.json");
		await writeFile(argsPath, JSON.stringify(rectArgs(0)));
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			`@${argsPath}`,
		]);
		expect(code).toBe(0);
		expect(report.written).toBe(true);
	});

	it("reads --args from stdin given -", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		vi.spyOn(process, "stdin", "get").mockReturnValue(
			Readable.from([
				Buffer.from(JSON.stringify(rectArgs(0))),
			]) as unknown as typeof process.stdin,
		);
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			"-",
		]);
		expect(code).toBe(0);
		expect(report.results[0].createdIds).toHaveLength(1);
	});

	it("fails on a missing file without --create", async () => {
		const { code, report } = await runOpReport([docPath, "list_objects"]);
		expect(code).toBe(1);
		expect(report.error?.message).toContain("--create");
		expect(report.error?.index).toBeUndefined();
		expect(existsSync(docPath)).toBe(false);
	});

	it("prints one line per result and what became of the file with --text", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, stdout } = await runOp([
			docPath,
			"add_object",
			"--args",
			JSON.stringify(rectArgs(0)),
			"--text",
		]);
		expect(code).toBe(0);
		expect(stdout.trim().split("\n")).toEqual([
			expect.stringMatching(/^0 add_object: added rect /),
			`written ${docPath}`,
		]);
	});
});

describe("op with one tool, more", () => {
	it("passes $ strings through untouched: references belong to a batch only", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code } = await runOpReport([
			docPath,
			"add_objects",
			"--args",
			JSON.stringify({
				objects: [
					{ ...rectArgs(0), text: "$$5" },
					{ ...rectArgs(200), text: "$total" },
				],
			}),
		]);
		expect(code).toBe(0);
		expect(readDoc().root.map((object) => object.text)).toEqual([
			"$$5",
			"$total",
		]);
	});

	it("fails --args that is a JSON array, as entry 0", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			"[1]",
		]);
		expect(code).toBe(1);
		expect(report.error).toEqual({
			index: 0,
			tool: "add_object",
			message: "--args must be a JSON object",
		});
	});

	it("fails --args that is not JSON, as entry 0", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			"{type: rect}",
		]);
		expect(code).toBe(1);
		expect(report.error).toMatchObject({ index: 0, tool: "add_object" });
		expect(report.error?.message).toMatch(/^--args is not valid JSON: /);
	});

	it("fails with a report for a file without a canvas extension, never reading it", async () => {
		const textPath = join(workDir, "notes.txt");
		await writeFile(textPath, "not a canvas");
		const { code, report } = await runOpReport([textPath, "list_objects"]);
		expect(code).toBe(1);
		expect(report).toMatchObject({ ok: false, written: false, file: textPath });
		expect(report.error?.index).toBeUndefined();
		expect(report.error?.message).toMatch(/must name a canvas file/);
	});

	it("loads an existing file under --create rather than starting it over", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		await runOpReport([
			docPath,
			"add_object",
			"--args",
			JSON.stringify(rectArgs(0)),
		]);
		const { code } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			JSON.stringify(rectArgs(200)),
			"--create",
		]);
		expect(code).toBe(0);
		expect(readDoc().root).toHaveLength(2);
	});

	it("indents a multi-line reply under its line with --text", async () => {
		await writeFile(
			docPath,
			JSON.stringify({ version: 1, root: [{ ...rectArgs(0), id: "box" }] }),
		);
		const { stdout } = await runOp([docPath, "list_objects", "--text"]);
		const lines = stdout.split("\n");
		expect(lines[0]).toMatch(/^0 list_objects: 1 object\(s\)/);
		expect(lines[1]).toMatch(/^ {2}\S/);
		expect(lines.at(-2)).toBe(`not written ${docPath}`);
	});

	it("escapes control characters taken from the document in --text output", async () => {
		await writeFile(
			docPath,
			JSON.stringify({
				version: 1,
				root: [
					{
						...rectArgs(0),
						id: "box\u001b",
						text: "red\u001b[31m\u009bend\r",
					},
				],
			}),
		);
		const { stdout } = await runOp([
			docPath,
			"get_text",
			"--args",
			JSON.stringify({ id: "box\u001b" }),
			"--text",
		]);
		expect(stdout).toContain('"box\\u001b"');
		for (const controlCharacter of ["\u001b", "\u009b", "\r"]) {
			expect(stdout).not.toContain(controlCharacter);
		}
		expect(stdout).toContain("red\\u001b[31m\\u009bend\\u000d");
	});
});

describe("op's JSON report", () => {
	it("escapes the C1 controls JSON.stringify leaves raw, staying valid JSON", async () => {
		await writeFile(
			docPath,
			JSON.stringify({
				version: 1,
				root: [{ ...rectArgs(0), id: "box", text: "a\u009bb\u007fc" }],
			}),
		);
		const { code, stdout } = await runOp([
			docPath,
			"get_object",
			"--args",
			JSON.stringify({ id: "box" }),
		]);
		expect(code).toBe(0);
		for (const controlCharacter of ["\u009b", "\u007f"]) {
			expect(stdout).not.toContain(controlCharacter);
		}
		const report = JSON.parse(stdout) as Report;
		expect(report.results[0].text).toContain("a\u009bb\u007fc");
	});
});

describe("op --batch", () => {
	it("substitutes $name and $name.N with the ids earlier entries created", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0), as: "first" },
				{
					tool: "add_objects",
					args: { objects: [rectArgs(200), rectArgs(400)] },
					as: "pair",
				},
				{
					tool: "connect",
					args: { sourceId: "$first", targetId: "$pair.1" },
					as: "edge",
				},
			]),
		]);
		expect(code).toBe(0);
		expect(report.written).toBe(true);
		expect(report.results.map((result) => result.as)).toEqual([
			"first",
			"pair",
			"edge",
		]);
		const firstId = report.results[0].createdIds?.[0];
		const secondOfPairId = report.results[1].createdIds?.[1];
		const connector = readDoc().root.find(
			(object) => object.type === "connector",
		);
		expect(connector?.source).toMatchObject({ owner: { id: firstId } });
		expect(connector?.target).toMatchObject({ owner: { id: secondOfPairId } });
	});

	it("takes one $ off a string starting with $$ instead of reading it as a reference", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0), as: "box" },
				{ tool: "set_text", args: { id: "$box", text: "$$box" } },
			]),
		]);
		expect(code).toBe(0);
		expect(JSON.stringify(readDoc().root[0])).toContain('"$box"');
	});

	it("fails the entry whose reference names no earlier entry", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0), as: "box" },
				{ tool: "set_text", args: { id: "$other", text: "x" }, as: "label" },
			]),
		]);
		expect(code).toBe(1);
		expect(report.written).toBe(false);
		expect(report.error).toMatchObject({
			index: 1,
			tool: "set_text",
			as: "label",
		});
		expect(report.error?.message).toContain("$other");
		expect(readFileSync(docPath, "utf8")).toBe(EMPTY_DOC_TEXT);
	});

	it("fails a reference whose index is past what its entry created", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0), as: "box" },
				{ tool: "set_text", args: { id: "$box.1", text: "x" } },
			]),
		]);
		expect(code).toBe(1);
		expect(report.error?.index).toBe(1);
		expect(report.error?.message).toMatch(/out of range/);
	});

	it("fails a reference to a named entry that created nothing", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0), as: "box" },
				{ tool: "set_position", args: { id: "$box", x: 10 }, as: "moved" },
				{ tool: "set_text", args: { id: "$moved", text: "x" } },
			]),
		]);
		expect(code).toBe(1);
		expect(report.error?.index).toBe(2);
		expect(report.error?.message).toMatch(/created no objects/);
	});

	it("refuses a batch naming two entries alike before running any", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0), as: "box" },
				{ tool: "add_object", args: rectArgs(200), as: "box" },
			]),
		]);
		expect(code).toBe(1);
		expect(report.results).toEqual([]);
		expect(report.error).toMatchObject({ index: 1, as: "box" });
	});

	it("refuses an as that is not an identifier", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([{ tool: "add_object", args: rectArgs(0), as: "a-b" }]),
		]);
		expect(code).toBe(1);
		expect(report.error).toMatchObject({ index: 0, tool: "add_object" });
		expect(report.error?.message).toContain(
			"must be an identifier ([A-Za-z_][A-Za-z0-9_]*)",
		);
	});

	it("passes a $ string that is not a reference in form through", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: { ...rectArgs(0), text: "$5" } },
				{ tool: "add_object", args: { ...rectArgs(200), text: "$a.b" } },
			]),
		]);
		expect(code).toBe(0);
		expect(readDoc().root.map((object) => object.text)).toEqual(["$5", "$a.b"]);
	});

	it("prints the failure naming the entry with --text", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, stdout } = await runOp([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0), as: "box" },
				{ tool: "set_text", args: { id: "$missing", text: "x" }, as: "label" },
			]),
			"--text",
		]);
		expect(code).toBe(1);
		const lines = stdout.trim().split("\n");
		expect(lines[0]).toMatch(/^0 add_object as box: added rect /);
		expect(lines[1]).toMatch(
			/^error: entry 1 set_text as label: \$missing names no earlier entry/,
		);
		expect(lines[2]).toBe(`not written ${docPath}`);
	});

	it("refuses an entry carrying a key other than tool, args and as", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([{ tool: "list_objects", argz: {} }]),
		]);
		expect(code).toBe(1);
		expect(report.error).toMatchObject({ index: 0, tool: "list_objects" });
	});

	it("writes nothing when an entry part way through fails, leaving the file byte for byte", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		const { code, report } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0) },
				{ tool: "set_position", args: { id: "no-such-object", x: 10 } },
				{ tool: "add_object", args: rectArgs(200) },
			]),
		]);
		expect(code).toBe(1);
		expect(report.written).toBe(false);
		expect(report.results.map((result) => result.ok)).toEqual([true, false]);
		expect(report.results[1].text).toMatch(/^error: /);
		expect(report.error).toMatchObject({ index: 1, tool: "set_position" });
		expect(readFileSync(docPath, "utf8")).toBe(EMPTY_DOC_TEXT);
	});

	it("reads the batch from stdin given -", async () => {
		await writeFile(docPath, EMPTY_DOC_TEXT);
		vi.spyOn(process, "stdin", "get").mockReturnValue(
			Readable.from([
				Buffer.from(JSON.stringify([{ tool: "list_objects" }])),
			]) as unknown as typeof process.stdin,
		);
		const { code, report } = await runOpReport([docPath, "--batch", "-"]);
		expect(code).toBe(0);
		expect(report.results).toHaveLength(1);
	});
});

describe("op --create", () => {
	it("creates a missing file once the batch succeeds", async () => {
		const { code, report } = await runOpReport([
			docPath,
			"add_object",
			"--args",
			JSON.stringify(rectArgs(0)),
			"--create",
		]);
		expect(code).toBe(0);
		expect(report.written).toBe(true);
		expect(readDoc().root).toHaveLength(1);
	});

	it("leaves no file behind when the batch fails", async () => {
		const { code } = await runOpReport([
			docPath,
			"--batch",
			await batchFile([
				{ tool: "add_object", args: rectArgs(0) },
				{ tool: "set_position", args: { id: "no-such-object", x: 10 } },
			]),
			"--create",
		]);
		expect(code).toBe(1);
		expect(existsSync(docPath)).toBe(false);
	});
});

describe("op command line", () => {
	it("exits 2 for a tool and --batch together", async () => {
		const { code, stdout, stderr } = await runOp([
			docPath,
			"list_objects",
			"--batch",
			"-",
		]);
		expect(code).toBe(2);
		expect(stdout).toBe("");
		expect(stderr).toMatch(/^error: .*\nusage: jiscribe op/);
	});

	it("exits 2 with no file or tool", async () => {
		expect((await runOp([])).code).toBe(2);
		expect((await runOp([docPath])).code).toBe(2);
	});

	it("exits 2 for --batch given inline JSON rather than @path or -", async () => {
		const { code, stderr } = await runOp([docPath, "--batch", "[]"]);
		expect(code).toBe(2);
		expect(stderr).toMatch(/^error: --batch takes @<path> or - \(stdin\)/);
	});

	it("exits 2 for --args together with --batch", async () => {
		const { code, stderr } = await runOp([
			docPath,
			"--batch",
			"-",
			"--args",
			"{}",
		]);
		expect(code).toBe(2);
		expect(stderr).toMatch(/^error: --args goes with a tool/);
	});

	it("exits 2 for an unknown option", async () => {
		expect((await runOp([docPath, "list_objects", "--argz", "{}"])).code).toBe(
			2,
		);
	});
});
