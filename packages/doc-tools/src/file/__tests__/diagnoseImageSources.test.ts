import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { CanvasDoc } from "@jiscribe/doc";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { diagnoseImageSources } from "../diagnoseImageSources";
import { isInsideRoot } from "../isInsideRoot";
import type { TempCanvasWorkspace } from "./tempCanvasWorkspace";
import { createTempCanvasWorkspace } from "./tempCanvasWorkspace";

let workspace: TempCanvasWorkspace;
/** A directory beside the workspace, which a link inside it can lead to. */
let outsideDirPath: string;
let canvasFilePath: string;

beforeAll(async () => {
	workspace = await createTempCanvasWorkspace();
	outsideDirPath = await mkdtemp(join(tmpdir(), "jiscribe-doc-tools-outside-"));
	canvasFilePath = join(workspace.dirPath, "diagram.jis.json");
	await mkdir(join(workspace.dirPath, "images", "folder.png"), {
		recursive: true,
	});
	await writeFile(join(workspace.dirPath, "images", "logo.png"), "");
	await writeFile(join(outsideDirPath, "secret.png"), "");
	await symlink(
		join(outsideDirPath, "secret.png"),
		join(workspace.dirPath, "images", "linked.png"),
	);
	// A link to itself, which no resolution gets through (ELOOP)
	await symlink("loop.png", join(workspace.dirPath, "images", "loop.png"));
});

afterAll(async () => {
	await workspace.remove();
	await rm(outsideDirPath, { recursive: true, force: true });
});

/** A document of one image per `src`, ids `image0`, `image1`, … */
const docOfImages = (...sources: string[]): CanvasDoc =>
	({
		version: 1,
		root: sources.map((src, index) => ({
			id: `image${index}`,
			type: "image",
			x: 0,
			y: 0,
			width: 10,
			height: 10,
			src,
		})),
	}) as CanvasDoc;

describe("diagnoseImageSources", () => {
	it("reports nothing for an image whose file is in place", async () => {
		expect(
			await diagnoseImageSources(
				docOfImages("images/logo.png"),
				canvasFilePath,
			),
		).toEqual([]);
	});

	it("reports a missing file as an error on the image, with the placeholder and the fix", async () => {
		expect(
			await diagnoseImageSources(
				docOfImages("images/missing.png"),
				canvasFilePath,
			),
		).toEqual([
			{
				severity: "error",
				objectId: "image0",
				message:
					'src "images/missing.png" names a file that does not exist, so the canvas draws a placeholder box in its place; put the file under the diagram\'s directory, or correct src to name the file there',
			},
		]);
	});

	it.each([
		["leaves the directory", "../outside.png"],
		["is absolute", "/etc/logo.png"],
		["names a scheme", "https://example.com/logo.png"],
		["uses a backslash", "images\\logo.png"],
	])("reports a src that %s, which every host refuses", async (_label, src) => {
		const diagnostics = await diagnoseImageSources(
			docOfImages(src),
			canvasFilePath,
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ severity: "error" });
		expect(diagnostics[0].message).toMatch(
			/is not a path relative to the diagram's own directory/,
		);
	});

	it("reports an extension no host serves as an image", async () => {
		const diagnostics = await diagnoseImageSources(
			docOfImages("images/notes.txt"),
			canvasFilePath,
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ severity: "error" });
		expect(diagnostics[0].message).toMatch(
			/does not end in an image file extension the hosts serve/,
		);
	});

	it("warns, without naming where it leads, about a link out of the diagram's directory", async () => {
		const diagnostics = await diagnoseImageSources(
			docOfImages("images/linked.png"),
			canvasFilePath,
		);
		expect(diagnostics).toEqual([
			{
				severity: "warning",
				objectId: "image0",
				message: expect.stringMatching(
					/the MCP viewer refuses such an image .*\(the other hosts follow the link and read it\)/,
				),
			},
		]);
		expect(diagnostics[0].message).not.toContain(outsideDirPath);
	});

	it("reports a link that cannot be resolved without naming why", async () => {
		const diagnostics = await diagnoseImageSources(
			docOfImages("images/loop.png"),
			canvasFilePath,
		);
		expect(diagnostics).toEqual([
			{
				severity: "error",
				objectId: "image0",
				message: expect.stringMatching(
					/^src "images\/loop\.png" cannot be resolved to a file, so the canvas draws a placeholder box/,
				),
			},
		]);
		expect(diagnostics[0].message).not.toContain("ELOOP");
	});

	it("reports a directory named like an image", async () => {
		const diagnostics = await diagnoseImageSources(
			docOfImages("images/folder.png"),
			canvasFilePath,
		);
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0]).toMatchObject({ severity: "error" });
		expect(diagnostics[0].message).toMatch(/is not a regular file/);
	});

	it("checks the images inside a group, one finding each, in document order", async () => {
		const doc = {
			version: 1,
			root: [
				{
					id: "group",
					type: "group",
					children: docOfImages("images/missing.png", "images/logo.png").root,
				},
				...docOfImages("../up.png").root.map((image) => ({
					...image,
					id: "outer",
				})),
			],
		} as CanvasDoc;
		const diagnostics = await diagnoseImageSources(doc, canvasFilePath);
		expect(diagnostics.map((diagnostic) => diagnostic.objectId)).toEqual([
			"image0",
			"outer",
		]);
	});
});

describe("isInsideRoot", () => {
	it.each([
		["/work", "/work", true],
		["/work", "/work/a.png", true],
		["/work", "/work2/a.png", false],
		["/work", "/a.png", false],
		["/", "/a.png", false],
	])("answers %j containing %j with %s", (rootPath, targetPath, expected) => {
		expect(isInsideRoot(rootPath, targetPath)).toBe(expected);
	});
});
