// The single gate between a path arriving from the browser and the file system.
// Everything here is about what is refused: the HTTP layer turns a
// WorkspacePathError into 400, so a hole in this function is a hole in the
// workspace boundary itself.

import path from "node:path";

import { describe, expect, it } from "vitest";

import {
	resolveWorkspacePath,
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
