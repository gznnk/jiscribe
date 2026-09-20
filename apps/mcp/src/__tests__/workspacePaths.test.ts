// The single gate between a path arriving from the browser and the file system.
// Everything here is about what is refused: the HTTP layer turns a
// WorkspacePathError into 400, so a hole in this function is a hole in the
// workspace boundary itself.

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
	resolveWorkspacePath,
	resolveWorkspacePathReal,
	WorkspacePathError,
} from "../host/workspacePaths";

/**
 * The workspace root the cases below are written against. Built through
 * path.resolve so the separators and the drive letter match whatever platform
 * the test runs on
 */
const workspaceRoot = path.resolve("/", "work");

describe("resolveWorkspacePath", () => {
	it("resolves a relative path under the root", () => {
		expect(resolveWorkspacePath(workspaceRoot, "diagram.jis.json")).toBe(
			path.join(workspaceRoot, "diagram.jis.json"),
		);
	});

	it("resolves a path in a subdirectory", () => {
		expect(resolveWorkspacePath(workspaceRoot, "docs/diagram.jis.json")).toBe(
			path.join(workspaceRoot, "docs", "diagram.jis.json"),
		);
	});

	it("normalises a `..` that stays inside", () => {
		expect(
			resolveWorkspacePath(workspaceRoot, "docs/../diagram.jis.json"),
		).toBe(path.join(workspaceRoot, "diagram.jis.json"));
	});

	it("returns the root itself for an empty path", () => {
		expect(resolveWorkspacePath(workspaceRoot, "")).toBe(workspaceRoot);
	});

	it('returns the root itself for "."', () => {
		expect(resolveWorkspacePath(workspaceRoot, ".")).toBe(workspaceRoot);
	});

	it("takes a root with a trailing separator as the same root", () => {
		expect(
			resolveWorkspacePath(`${workspaceRoot}${path.sep}`, "diagram.jis.json"),
		).toBe(path.join(workspaceRoot, "diagram.jis.json"));
	});

	it("rejects an absolute path", () => {
		// Even one that happens to point inside: the caller is expected to hand
		// over a relative path, and an absolute one means the boundary was never
		// applied
		expect(() =>
			resolveWorkspacePath(
				workspaceRoot,
				path.join(workspaceRoot, "diagram.jis.json"),
			),
		).toThrow(WorkspacePathError);
		expect(() =>
			resolveWorkspacePath(workspaceRoot, path.resolve("/", "etc", "passwd")),
		).toThrow(WorkspacePathError);
	});

	it("rejects a drive-relative path", () => {
		// "C:file" is relative to the current directory of that drive on win32,
		// and joining it on elsewhere would be a path nobody meant
		expect(() => resolveWorkspacePath(workspaceRoot, "C:file")).toThrow(
			WorkspacePathError,
		);
		expect(() =>
			resolveWorkspacePath(workspaceRoot, "C:\\Windows\\system32"),
		).toThrow(WorkspacePathError);
	});

	it("rejects an escape through `..`", () => {
		expect(() => resolveWorkspacePath(workspaceRoot, "../secret.txt")).toThrow(
			WorkspacePathError,
		);
		expect(() =>
			resolveWorkspacePath(workspaceRoot, "docs/../../secret.txt"),
		).toThrow(WorkspacePathError);
	});

	it("rejects a sibling directory that matches on the prefix", () => {
		// "/work2" starts with "/work" as a string, so the boundary has to be
		// compared with the separator on it
		expect(() =>
			resolveWorkspacePath(workspaceRoot, "../work2/diagram.jis.json"),
		).toThrow(WorkspacePathError);
	});

	it("names the offending path in the error", () => {
		expect(() => resolveWorkspacePath(workspaceRoot, "../secret.txt")).toThrow(
			/\.\.\/secret\.txt/,
		);
	});
});

// Real directories, because what is under test is where the links on a path
// actually lead
describe("resolveWorkspacePathReal", () => {
	/** The workspace the paths below are relative to */
	let realWorkspaceRoot: string;
	/** A directory beside the workspace, standing for everything outside it */
	let outsideRoot: string;

	beforeEach(async () => {
		realWorkspaceRoot = await mkdtemp(path.join(tmpdir(), "jiscribe-real-ws-"));
		outsideRoot = await mkdtemp(path.join(tmpdir(), "jiscribe-real-out-"));
	});

	afterEach(async () => {
		await rm(realWorkspaceRoot, { recursive: true, force: true });
		await rm(outsideRoot, { recursive: true, force: true });
	});

	it("resolves a file that is really inside", async () => {
		await writeFile(
			path.join(realWorkspaceRoot, "diagram.jis.json"),
			"{}",
			"utf8",
		);

		expect(
			await resolveWorkspacePathReal(realWorkspaceRoot, "diagram.jis.json"),
		).toBe(path.join(realWorkspaceRoot, "diagram.jis.json"));
	});

	it("resolves a file that is not there yet", async () => {
		// A write creates its file, so demanding that it already exists would leave
		// every new canvas unchecked
		expect(
			await resolveWorkspacePathReal(
				realWorkspaceRoot,
				"docs/nested/new.jis.json",
			),
		).toBe(path.join(realWorkspaceRoot, "docs", "nested", "new.jis.json"));
	});

	it.skipIf(process.platform === "win32")(
		"rejects a file that is a link out of the workspace",
		async () => {
			const outsideFile = path.join(outsideRoot, "secret.jis.json");
			await writeFile(outsideFile, "{}", "utf8");
			await symlink(
				outsideFile,
				path.join(realWorkspaceRoot, "linked.jis.json"),
			);

			await expect(
				resolveWorkspacePathReal(realWorkspaceRoot, "linked.jis.json"),
			).rejects.toThrow(WorkspacePathError);
		},
	);

	it.skipIf(process.platform === "win32")(
		"rejects a file under a directory that is a link out of the workspace",
		async () => {
			// The file itself does not exist, so what is resolved is the deepest
			// ancestor that does — which is the link
			await symlink(outsideRoot, path.join(realWorkspaceRoot, "escape"));

			await expect(
				resolveWorkspacePathReal(realWorkspaceRoot, "escape/new.jis.json"),
			).rejects.toThrow(WorkspacePathError);
		},
	);

	it.skipIf(process.platform === "win32")(
		"takes a link that stays inside the workspace",
		async () => {
			await mkdir(path.join(realWorkspaceRoot, "docs"), { recursive: true });
			await writeFile(
				path.join(realWorkspaceRoot, "docs", "diagram.jis.json"),
				"{}",
				"utf8",
			);
			await symlink(
				path.join(realWorkspaceRoot, "docs"),
				path.join(realWorkspaceRoot, "shortcut"),
			);

			expect(
				await resolveWorkspacePathReal(
					realWorkspaceRoot,
					"shortcut/diagram.jis.json",
				),
			).toBe(path.join(realWorkspaceRoot, "shortcut", "diagram.jis.json"));
		},
	);

	it("rejects what the lexical check already rejects", async () => {
		await expect(
			resolveWorkspacePathReal(realWorkspaceRoot, "../secret.txt"),
		).rejects.toThrow(WorkspacePathError);
	});
});
