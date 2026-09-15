// Reads the image files an image shape points at, through the host's
// `GET /api/file`.
//
// The canvas hands over the `src` string as the doc wrote it and leaves resolving
// it to the host; what "relative to the document's directory and inside it" means
// is `splitDocRelativePath`, shared with every other host.

import { splitDocRelativePath } from "@jiscribe/doc";

import { buildFileApiUrl } from "../shared/fileApiRoute";

/**
 * The segments of the directory the open `.jis` sits in, which an image `src` is
 * joined onto. The path the host sends is workspace-relative and `/`-separated, so
 * dropping the file name is the whole of it — a file at the workspace root yields no
 * segments. In this host that is the normal case, the workspace root being the
 * opened file's own directory (`open_canvas` in `../server.ts`), so the result is
 * usually empty
 */
const toDocDirSegments = (docRelPath: string): readonly string[] =>
	docRelPath.split("/").slice(0, -1);

/**
 * Builds the image resolver the canvas is given for one open document.
 *
 * @param docRelPath Workspace-relative path of the open `.jis`, exactly as the host
 *   sent it on the `openCanvas` frame. Its directory is what a `src` is relative to
 * @returns A resolver taking an image shape's raw `src` and answering with its
 *   bytes. It rejects when the `src` breaks the document-relative rule, and when the
 *   host does not hand the file back (missing, outside the workspace, or not an
 *   image it serves)
 */
export function createDocImageResolver(
	docRelPath: string,
): (src: string) => Promise<Blob> {
	const docDirSegments = toDocDirSegments(docRelPath);
	return async (src: string): Promise<Blob> => {
		const srcSegments = splitDocRelativePath(src);
		if (srcSegments === null) {
			throw new Error(
				`an image src has to be a path relative to the diagram's own directory: ${src}`,
			);
		}
		const workspaceRelPath = [...docDirSegments, ...srcSegments].join("/");
		const response = await fetch(buildFileApiUrl(workspaceRelPath));
		if (!response.ok) {
			throw new Error(
				`could not read the image ${workspaceRelPath}: ${response.status} ${response.statusText}`,
			);
		}
		return await response.blob();
	};
}
