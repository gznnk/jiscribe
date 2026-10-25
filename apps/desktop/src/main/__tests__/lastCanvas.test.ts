import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	getDisplayedCanvasPath,
	getScratchCanvasPath,
	listStartupCanvasCandidates,
	readLastCanvasPath,
	tryOpenCanvasCandidates,
	writeLastCanvasPath,
} from "../lastCanvas";

let userDataDir: string;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
	userDataDir = await mkdtemp(path.join(tmpdir(), "jiscribe-desktop-"));
	stderrSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
	stderrSpy.mockRestore();
	await rm(userDataDir, { recursive: true, force: true });
});

describe("the last-canvas record", () => {
	it("reads back the path it wrote", async () => {
		const canvasPath = path.join(userDataDir, "drawings", "plan.jis");
		await writeLastCanvasPath(userDataDir, canvasPath);
		expect(await readLastCanvasPath(userDataDir)).toBe(canvasPath);
		expect(stderrSpy).not.toHaveBeenCalled();
	});

	it("creates a missing userData directory on write", async () => {
		const missingDir = path.join(userDataDir, "not-yet-there");
		await writeLastCanvasPath(missingDir, "/somewhere/plan.jis");
		expect(await readLastCanvasPath(missingDir)).toBe("/somewhere/plan.jis");
	});

	it("reads null with no record, saying nothing", async () => {
		expect(await readLastCanvasPath(userDataDir)).toBeNull();
		expect(stderrSpy).not.toHaveBeenCalled();
	});

	it.each([
		["text that is not JSON", "{not json"],
		["a JSON value that is no object", '"plan.jis"'],
		["an object without a path", '{"file":"plan.jis"}'],
		["a path that is no string", '{"path":42}'],
		["null", "null"],
	])(
		"reads null from %s and reports the record on stderr",
		async (_label, recordText) => {
			const recordPath = path.join(userDataDir, "lastCanvas.json");
			await writeFile(recordPath, recordText);
			expect(await readLastCanvasPath(userDataDir)).toBeNull();
			expect(stderrSpy).toHaveBeenCalledTimes(1);
			expect(stderrSpy).toHaveBeenCalledWith(
				expect.stringContaining(`skipping ${recordPath}`),
			);
		},
	);

	it("reads null from a record that cannot be read and reports it on stderr", async () => {
		const recordPath = path.join(userDataDir, "lastCanvas.json");
		// A directory where the file should be: readFile fails with EISDIR
		await mkdir(recordPath);
		expect(await readLastCanvasPath(userDataDir)).toBeNull();
		expect(stderrSpy).toHaveBeenCalledTimes(1);
		expect(stderrSpy).toHaveBeenCalledWith(
			expect.stringContaining(`skipping ${recordPath}`),
			expect.objectContaining({ code: "EISDIR" }),
		);
	});
});

describe("listStartupCanvasCandidates", () => {
	it("puts the remembered canvas first while it exists, the scratch one after", async () => {
		const lastPath = path.join(userDataDir, "plan.jis");
		await writeFile(lastPath, "");
		await writeLastCanvasPath(userDataDir, lastPath);
		expect(await listStartupCanvasCandidates(userDataDir)).toEqual([
			lastPath,
			getScratchCanvasPath(userDataDir),
		]);
		expect(stderrSpy).not.toHaveBeenCalled();
	});

	it("offers only the scratch canvas when the remembered one is gone, reporting it on stderr", async () => {
		const deletedPath = path.join(userDataDir, "deleted.jis");
		await writeLastCanvasPath(userDataDir, deletedPath);
		expect(await listStartupCanvasCandidates(userDataDir)).toEqual([
			getScratchCanvasPath(userDataDir),
		]);
		expect(stderrSpy).toHaveBeenCalledTimes(1);
		expect(stderrSpy).toHaveBeenCalledWith(
			expect.stringContaining(`skipping the remembered canvas ${deletedPath}`),
		);
	});

	it("offers only the scratch canvas with no record", async () => {
		expect(await listStartupCanvasCandidates(userDataDir)).toEqual([
			getScratchCanvasPath(userDataDir),
		]);
		expect(stderrSpy).not.toHaveBeenCalled();
	});

	it("does not list the scratch canvas twice when it is the remembered one", async () => {
		const scratchPath = getScratchCanvasPath(userDataDir);
		await writeLastCanvasPath(userDataDir, scratchPath);
		expect(await listStartupCanvasCandidates(userDataDir)).toEqual([
			scratchPath,
		]);
	});

	it("keeps the scratch canvas under userData/canvases", () => {
		expect(getScratchCanvasPath(userDataDir)).toBe(
			path.join(userDataDir, "canvases", "untitled.jis"),
		);
	});
});

describe("tryOpenCanvasCandidates", () => {
	/** Opens every path in `openablePaths`; any other one fails naming itself */
	const tryOpenOnly = (openablePaths: readonly string[]) =>
		vi.fn(async (canvasPath: string) =>
			openablePaths.includes(canvasPath) ? null : `${canvasPath}: refused`,
		);

	it("falls through to the next candidate when the first fails", async () => {
		const tryOpen = tryOpenOnly(["/scratch.jis"]);
		expect(
			await tryOpenCanvasCandidates(["/last.jis", "/scratch.jis"], tryOpen),
		).toBeNull();
		expect(tryOpen.mock.calls).toEqual([["/last.jis"], ["/scratch.jis"]]);
	});

	it("answers the last failure once every candidate has been tried in order", async () => {
		const tryOpen = tryOpenOnly([]);
		expect(
			await tryOpenCanvasCandidates(
				["/last.jis", "/middle.jis", "/scratch.jis"],
				tryOpen,
			),
		).toBe("/scratch.jis: refused");
		expect(tryOpen.mock.calls).toEqual([
			["/last.jis"],
			["/middle.jis"],
			["/scratch.jis"],
		]);
	});

	it("tries nothing past the first candidate that opens", async () => {
		const tryOpen = tryOpenOnly(["/last.jis", "/scratch.jis"]);
		expect(
			await tryOpenCanvasCandidates(["/last.jis", "/scratch.jis"], tryOpen),
		).toBeNull();
		expect(tryOpen.mock.calls).toEqual([["/last.jis"]]);
	});
});

describe("getDisplayedCanvasPath", () => {
	const workspaceRoot = "C:\\Users\\me\\drawings";

	it("joins the workspace root and the file name on display", () => {
		expect(
			getDisplayedCanvasPath({ workspaceRoot, getOpenPath: () => "plan.jis" }),
		).toBe(path.join(workspaceRoot, "plan.jis"));
	});

	it("is null while the host has no file on display", () => {
		expect(
			getDisplayedCanvasPath({ workspaceRoot, getOpenPath: () => null }),
		).toBeNull();
	});
});
