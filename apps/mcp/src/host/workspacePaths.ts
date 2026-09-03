import path from "node:path";

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
 * win32 does not distinguish case in paths, so the boundary check follows the same
 * rule
 */
const normalizeForComparison = (value: string): string =>
	process.platform === "win32" ? value.toLowerCase() : value;

/**
 * Resolves a workspace-relative path to an absolute one. Input that leads outside
 * the workspace (an absolute path, an escape through `..`, a drive-relative path) is
 * rejected with a WorkspacePathError.
 *
 * A path arriving from the browser cannot simply be joined on, so both writing and
 * serving go through here.
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

	const comparableRoot = normalizeForComparison(resolvedRoot);
	const comparableTarget = normalizeForComparison(resolvedTarget);
	if (comparableTarget === comparableRoot) {
		return resolvedTarget;
	}
	// Always compare with the separator on the boundary, to reject a different
	// directory that matches on the prefix, such as "/work" against "/work2"
	if (!comparableTarget.startsWith(comparableRoot + path.sep)) {
		throw new WorkspacePathError(`path escapes workspace: ${relPath}`);
	}
	return resolvedTarget;
}
