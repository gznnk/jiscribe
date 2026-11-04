import path from "node:path";

/**
 * win32 does not distinguish case in paths, so the boundary check follows the same
 * rule
 */
const normalizeForComparison = (value: string): string =>
	process.platform === "win32" ? value.toLowerCase() : value;

/**
 * Whether a path is the root itself or something under it. The comparison is
 * lexical: resolve both through their links first (realpathDeepestExisting) when
 * a link must not count as a way out.
 *
 * @param rootPath - The directory to stay within, absolute and normalized
 *   (`path.resolve`). The filesystem root (`/`) is the one root spelled with a
 *   trailing separator, and nothing but itself counts as inside it
 * @param targetPath - The path to test, absolute and normalized the same way.
 *   A different directory sharing the root's name as a prefix ("/work2" against
 *   "/work") is outside; case is ignored on win32 only
 */
export const isInsideRoot = (rootPath: string, targetPath: string): boolean => {
	const comparableRoot = normalizeForComparison(rootPath);
	const comparableTarget = normalizeForComparison(targetPath);
	if (comparableTarget === comparableRoot) {
		return true;
	}
	// Always compare with the separator on the boundary, to reject a different
	// directory that matches on the prefix, such as "/work" against "/work2"
	return comparableTarget.startsWith(comparableRoot + path.sep);
};
