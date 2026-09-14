// The one HTTP route the canvas host and the viewer share: the endpoint a person's
// edits are written back through (PUT) and the images an object points at are read
// out of (GET).
//
// The doc itself never travels this way — it goes over the WebSocket
// (./canvasHostProtocol). This route exists because the files an image shape's
// `src` names are on disk only.

/** The endpoint's pathname, on both the host's router and the viewer's fetch */
export const FILE_API_PATHNAME = "/api/file";

/**
 * The query parameter naming the file, always workspace-relative and
 * `/`-separated. A path leading outside the workspace is rejected by the host
 */
export const FILE_API_PATH_PARAM = "path";

/**
 * Builds the URL the viewer fetches one workspace file through.
 *
 * @param relPath Path relative to the workspace root, `/`-separated and unencoded
 *   (percent-encoding is applied here)
 * @returns An origin-relative URL, since the host serves the viewer itself
 */
export const buildFileApiUrl = (relPath: string): string =>
	`${FILE_API_PATHNAME}?${FILE_API_PATH_PARAM}=${encodeURIComponent(relPath)}`;
