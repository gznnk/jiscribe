/**
 * Splits a path stored in a doc (an image `src`, for one) into the segments a host
 * joins onto the directory the `.jis` file lives in.
 *
 * The rule every host applies is the same: the path is relative to the document's
 * directory and stays inside it. The canvas never applies it — it hands the raw
 * string to the host — so the hosts share the one check here instead of each
 * spelling its own.
 *
 * @param docRelativePath - The raw string from the doc. `/` is the only separator; a backslash, a scheme (`https:`), a drive letter (`C:`), a leading `/`, an empty or `.`/`..` segment, or an empty string all make it invalid
 * @returns The segments in order, ready for `path.join` / `Uri.joinPath`; null when the string breaks the rule above
 */
export const splitDocRelativePath = (
	docRelativePath: string,
): readonly string[] | null => {
	if (
		docRelativePath === "" ||
		docRelativePath.includes("\\") ||
		docRelativePath.startsWith("/") ||
		/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(docRelativePath)
	) {
		return null;
	}
	const segments = docRelativePath.split("/");
	const hasInvalidSegment = segments.some(
		(segment) => segment === "" || segment === "." || segment === "..",
	);
	return hasInvalidSegment ? null : segments;
};
