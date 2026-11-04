import path from "node:path";

import {
	isInsideRoot,
	realpathDeepestExisting,
} from "@jiscribe/doc-tools/file";

/**
 * An error standing for a request to reach outside the workspace. The HTTP layer
 * maps it to 400
 */
export class WorkspacePathError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "WorkspacePathError";
	}
}

/**
 * Resolves a workspace-relative path to an absolute one. Input that leads outside
 * the workspace (an absolute path, an escape through `..`, a drive-relative path) is
 * rejected with a WorkspacePathError.
 *
 * A path arriving from the browser cannot simply be joined on, so both writing and
 * serving go through here.
 *
 * The comparison is lexical, which leaves a symlink inside the workspace pointing
 * out of it as a way through; `resolveWorkspacePathReal` is the one to use where a
 * file is actually opened.
 *
 * @param workspaceRoot The workspace root (absolute path)
 * @param relPath Path relative to the workspace root. An empty string points at the
 *   root itself
 * @returns The resolved absolute path, or the root itself when `relPath` is empty
 */
export function resolveWorkspacePath(
	workspaceRoot: string,
	relPath: string,
): string {
	if (path.isAbsolute(relPath) || /^[a-zA-Z]:/.test(relPath)) {
		throw new WorkspacePathError(`absolute path is not allowed: ${relPath}`);
	}
	const resolvedRoot = path.resolve(workspaceRoot);
	const resolvedTarget = path.resolve(resolvedRoot, relPath);
	if (!isInsideRoot(resolvedRoot, resolvedTarget)) {
		throw new WorkspacePathError(`path escapes workspace: ${relPath}`);
	}
	return resolvedTarget;
}

/**
 * Resolves a workspace-relative path the way `resolveWorkspacePath` does, and then
 * applies the same boundary rule once more to where the symlinks on the way
 * actually lead. A link inside the workspace pointing out of it passes the lexical
 * check and is caught here.
 *
 * @param workspaceRoot The workspace root (absolute path). It is resolved through
 *   its own links as well, so a workspace reached by a link is not an escape in
 *   itself
 * @param relPath Path relative to the workspace root, `/`- or platform-separated.
 *   The file need not exist: the deepest ancestor that does is the one resolved
 * @returns The absolute path to open: the lexical one, not the resolved one. A
 *   write through atomicWrite then replaces a link at that path with a plain
 *   file rather than following it (see writeFileAtomically)
 * @throws WorkspacePathError When either the path itself or where it leads is
 *   outside the workspace
 */
export async function resolveWorkspacePathReal(
	workspaceRoot: string,
	relPath: string,
): Promise<string> {
	const resolvedTarget = resolveWorkspacePath(workspaceRoot, relPath);
	const realRoot = await realpathDeepestExisting(path.resolve(workspaceRoot));
	const realTarget = await realpathDeepestExisting(resolvedTarget);
	if (!isInsideRoot(realRoot, realTarget)) {
		throw new WorkspacePathError(`path escapes workspace: ${relPath}`);
	}
	return resolvedTarget;
}
