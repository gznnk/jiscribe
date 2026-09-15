// Where the built viewer is looked for. Getting this wrong is a blank screen, so
// the only thing it may not do is quietly succeed with nothing behind it.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CanvasHostError } from "../host/canvasHostError";
import { resolveViewerAssets } from "../host/viewerAssets";

let viewerRoot: string;
let previousViewerRoot: string | undefined;

beforeEach(async () => {
	viewerRoot = await mkdtemp(path.join(tmpdir(), "jiscribe-viewer-"));
	previousViewerRoot = process.env.JISCRIBE_MCP_VIEWER_ROOT;
});

afterEach(async () => {
	if (previousViewerRoot === undefined) {
		delete process.env.JISCRIBE_MCP_VIEWER_ROOT;
	} else {
		process.env.JISCRIBE_MCP_VIEWER_ROOT = previousViewerRoot;
	}
	await rm(viewerRoot, { recursive: true, force: true });
});

describe("resolveViewerAssets", () => {
	it("reads the viewer JISCRIBE_MCP_VIEWER_ROOT names", async () => {
		const html = "<!doctype html><title>viewer</title>";
		await writeFile(path.join(viewerRoot, "index.html"), html, "utf8");
		process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;

		expect(resolveViewerAssets()).toEqual({
			viewerHtml: html,
			// The fonts stay on disk beside the html, too large to fold into it
			assetRootPath: path.join(viewerRoot, "assets"),
		});
	});

	it("takes a relative override as relative to the working directory", async () => {
		await writeFile(
			path.join(viewerRoot, "index.html"),
			"<!doctype html>",
			"utf8",
		);
		process.env.JISCRIBE_MCP_VIEWER_ROOT = path.relative(
			process.cwd(),
			viewerRoot,
		);

		expect(resolveViewerAssets().assetRootPath).toBe(
			path.join(viewerRoot, "assets"),
		);
	});

	it("fails with build guidance when the named directory holds no viewer", () => {
		// An override is the only candidate, so this is also the shape of "it was
		// never built": a 404 on every request would say nothing but "blank screen"
		process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;

		expect(() => resolveViewerAssets()).toThrow(CanvasHostError);
		expect(() => resolveViewerAssets()).toThrow(
			/not built[\s\S]*JISCRIBE_MCP_VIEWER_ROOT/,
		);
	});

	it("names the directory it looked in", () => {
		process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;

		expect(() => resolveViewerAssets()).toThrow(viewerRoot);
	});
});
