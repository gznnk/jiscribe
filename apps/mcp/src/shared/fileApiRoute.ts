// The HTTP routes the canvas host and the viewer share: the endpoint a person's
// edits are written back through (PUT), the images an object points at are read out
// of (GET), and the one the viewer picks this host's session token up from.
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
 * Where the viewer reads this host's session token from, answered as
 * `{ "token": string }`. Nothing but the Host check guards it: no CORS header is
 * ever sent, so a page on another origin can call it and never read the answer
 */
export const SESSION_API_PATHNAME = "/api/session";

/**
 * The header a write carries its session token in. Written in the canonical case
 * for the viewer to send; Node lowercases what it receives, so the host looks it up
 * accordingly
 */
export const SESSION_TOKEN_HEADER = "X-Jiscribe-Token";

/**
 * The header a write carries the revision of the text it is replacing in: the one
 * the host last gave for that file (openCanvas / docChanged). A write naming any
 * other revision is refused rather than landing on top of what arrived in between.
 * Written in the canonical case for the viewer to send; Node lowercases what it
 * receives, so the host looks it up accordingly
 */
export const REVISION_HEADER = "If-Match";

/**
 * The query parameter the session token goes on the WebSocket URL as. A header is
 * not an option there: the browser's WebSocket lets nothing but the URL through
 */
export const SESSION_TOKEN_QUERY_PARAM = "token";

/**
 * Builds the URL the viewer fetches one workspace file through.
 *
 * @param relPath Path relative to the workspace root, `/`-separated and unencoded
 *   (percent-encoding is applied here)
 * @returns An origin-relative URL, since the host serves the viewer itself
 */
export const buildFileApiUrl = (relPath: string): string =>
	`${FILE_API_PATHNAME}?${FILE_API_PATH_PARAM}=${encodeURIComponent(relPath)}`;

/**
 * The status a write gets when the file no longer holds the revision it names.
 * The viewer branches on it (the newer text follows as a frame), so it is the one
 * status both sides spell out
 */
export const REVISION_MISMATCH_STATUS = 412;

/**
 * The most a write may carry, and the most one WebSocket frame may weigh. A canvas
 * is text and a capture a base64 PNG; neither comes near this, and what the cap
 * stops is a request buffered in full before anyone looks at it
 */
export const MAX_WRITE_BODY_BYTES = 16 * 1024 * 1024;
