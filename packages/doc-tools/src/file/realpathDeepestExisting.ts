import { realpath } from "node:fs/promises";
import path from "node:path";

import { isErrnoWithCode } from "./nodeErrors";

/**
 * Resolve the links out of a path whose last segments may not exist yet: the
 * deepest ancestor that does exist is resolved, and what is left is joined back on.
 * A write creates its file, so demanding that the target already exists would leave
 * every new file unresolved.
 *
 * @param targetPath Absolute path. A dangling link counts as missing, so it is
 *   kept as it is spelled rather than followed
 * @returns The resolved path. Segments that do not exist keep the case they were
 *   given in, so on a case-insensitive filesystem two spellings of a file not yet
 *   created still differ
 * @throws Whatever realpath fails with other than ENOENT / ENOTDIR (ELOOP for a
 *   link cycle, EACCES for an unreadable directory)
 */
export const realpathDeepestExisting = async (
	targetPath: string,
): Promise<string> => {
	const missingSegments: string[] = [];
	let candidate = targetPath;
	for (;;) {
		try {
			return path.join(await realpath(candidate), ...missingSegments);
		} catch (error) {
			// ENOTDIR stands for an ancestor that is a file, which is as good a reason
			// to keep walking up as a missing one
			if (
				!isErrnoWithCode(error, "ENOENT") &&
				!isErrnoWithCode(error, "ENOTDIR")
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
