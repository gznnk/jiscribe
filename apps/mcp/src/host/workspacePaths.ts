import { realpath } from "node:fs/promises";
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

/** Whether a resolved path is the root itself or something under it */
const isInsideRoot = (rootPath: string, targetPath: string): boolean => {
	const comparableRoot = normalizeForComparison(rootPath);
	const comparableTarget = normalizeForComparison(targetPath);
	if (comparableTarget === comparableRoot) {
		return true;
	}
	// Always compare with the separator on the boundary, to reject a different
	// directory that matches on the prefix, such as "/work" against "/work2"
	return comparableTarget.startsWith(comparableRoot + path.sep);
};

const isNodeErrorWithCode = (value: unknown, code: string): boolean =>
	value instanceof Error && (value as NodeJS.ErrnoException).code === code;

/**
 * Resolves the links out of a path whose last segments may not exist yet: the
 * deepest ancestor that does exist is resolved, and what is left is joined back on.
 * A write creates its file, so demanding that the target already exists would leave
 * every new file unchecked.
 */
const realpathDeepestExisting = async (targetPath: string): Promise<string> => {
	const missingSegments: string[] = [];
	let candidate = targetPath;
	for (;;) {
		try {
			return path.join(await realpath(candidate), ...missingSegments);
		} catch (error) {
			// ENOTDIR stands for an ancestor that is a file, which is as good a reason
			// to keep walking up as a missing one
			if (
				!isNodeErrorWithCode(error, "ENOENT") &&
				!isNodeErrorWithCode(error, "ENOTDIR")
			) {
				throw error;
			}
			const parentPath = path.dirname(candidate);
			if (parentPath === candidate) {
				return path.join(candidate, ...missingSegments);
			}
			missingSegments.unshift(path.basename(candidate));
			candidate = parentPath;
		}
	}
};

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
 * @returns The absolute path to open, which is the lexical one rather than the
 *   resolved one — a link inside the workspace keeps pointing at what it did
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
