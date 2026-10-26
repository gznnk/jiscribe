// The HTTP layer, which does nothing but serve the canvas viewer and take in a
// person's edits.
//
// There are only two things it serves: the viewer's HTML, folded into one file at
// build time, and the fonts its CSS refers to (split by unicode-range, so the
// browser only fetches the ranges it actually draws). On top of that it has an
// endpoint for writing back what a person fixed, one for reading an image an
// object points at, one handing out this host's session token along with the
// actions the host's owner offers, and one those actions are asked through.
//
// Reading is for images alone: the doc reaches the viewer over the WebSocket, while
// the files an image shape's `src` names are on disk only.
//
// It listens on the loopback interface, which keeps other machines out but not the
// pages a browser on this one is showing. Three checks stand between such a page
// and the workspace: the Host header has to name this server (which is what a DNS
// rebinding attack cannot produce), an Origin header that is there has to be this
// server's own, and a write has to carry the token only a same-origin page can read.
// Asking for an action is guarded as a write is: it reaches into the process that
// owns the host, which is further than the workspace.
//
// What a write then does to the file is not decided here: the body is handed to
// writeOpenFile, which takes the same per-file lock the AI's tools do and refuses a
// write whose revision is no longer the one on disk. Nor is what an action does:
// the owner's callback is run as it was handed over.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pipeline } from "node:stream";

import { resolveDocImageMimeType } from "@jiscribe/doc";
import { isErrnoWithCode } from "@jiscribe/doc-tools/file";

import type { HostActions, WriteOpenFileOutcome } from "./canvasHostTypes";
import {
	isAllowedHostHeader,
	isAllowedOrigin,
	loopbackHostNames,
} from "./requestGuards";
import {
	resolveWorkspacePath,
	resolveWorkspacePathReal,
	WorkspacePathError,
} from "./workspacePaths";
import {
	FILE_API_PATH_PARAM,
	FILE_API_PATHNAME,
	INVALID_SESSION_STATUS,
	MAX_WRITE_BODY_BYTES,
	NOT_ON_DISPLAY_STATUS,
	REVISION_HEADER,
	REVISION_MISMATCH_STATUS,
	SESSION_API_PATHNAME,
	SESSION_TOKEN_HEADER,
} from "../shared/fileApiRoute";
import {
	HOST_ACTION_API_PATHNAME,
	HOST_ACTION_DONE_STATUS,
	HOST_ACTION_NAMES,
	isHostActionName,
	type HostActionName,
	type SessionApiResponse,
} from "../shared/hostActionsRoute";

/**
 * Only what serving the fonts needs, which is everything there is to serve: the
 * build folds the viewer's own JS and CSS into index.html, leaving the fonts beside
 * it. An extension not listed here is not served
 */
const assetContentTypes: Record<string, string> = {
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
};

/** Raised by readRequestBody, and answered with 413 */
class RequestBodyTooLargeError extends Error {
	constructor(maxBytes: number) {
		super(`request body is larger than ${maxBytes} bytes`);
		this.name = "RequestBodyTooLargeError";
	}
}

const sendJson = (
	response: http.ServerResponse,
	statusCode: number,
	body: unknown,
): void => {
	response.writeHead(statusCode, {
		"Content-Type": "application/json; charset=utf-8",
	});
	response.end(JSON.stringify(body));
};

const sendApiError = (response: http.ServerResponse, error: unknown): void => {
	if (error instanceof WorkspacePathError) {
		sendJson(response, 400, { error: error.message });
		return;
	}
	if (isErrnoWithCode(error, "ENOENT") || isErrnoWithCode(error, "ENOTDIR")) {
		sendJson(response, 404, { error: "not found" });
		return;
	}
	// The file or its directory refuses the write, which sending it again will not
	// change: a 5xx would read as the host failing, and the viewer would retry it
	if (
		isErrnoWithCode(error, "EACCES") ||
		isErrnoWithCode(error, "EPERM") ||
		isErrnoWithCode(error, "EROFS")
	) {
		sendJson(response, 403, { error: "the file cannot be written to" });
		return;
	}
	sendJson(response, 500, { error: String(error) });
};

/**
 * Sends a file's bytes as the response body, the headers having been written
 * already. A HEAD request is answered with the headers alone, the file left
 * unopened.
 *
 * `pipe` alone would leave the read stream's `error` unhandled and take the whole
 * MCP process down, which a file that passes `stat` and then fails to open (EACCES)
 * is enough to trigger. A failing pipeline destroys the response instead, so the
 * browser's fetch rejects and the viewer draws its placeholder.
 */
const pipeFileToResponse = (
	file: string,
	response: http.ServerResponse,
): void => {
	if (response.req.method === "HEAD") {
		response.end();
		return;
	}
	pipeline(createReadStream(file), response, (error) => {
		// stderr is the only channel left (stdout carries the MCP protocol), and a
		// request the browser itself gave up on is not worth reporting
		if (
			error !== null &&
			error !== undefined &&
			!isErrnoWithCode(error, "ERR_STREAM_PREMATURE_CLOSE")
		) {
			console.error(`Failed to serve ${file}: ${String(error)}`);
		}
	});
};

/**
 * Reads the request body, giving up once it is past the cap.
 *
 * @param request The request to read
 * @param maxBytes The most to take in. Going past it rejects with a
 *   RequestBodyTooLargeError, leaving the rest of the upload unread
 */
const readRequestBody = (
	request: http.IncomingMessage,
	maxBytes: number,
): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let readBytes = 0;
		request.on("data", (chunk: Buffer) => {
			readBytes += chunk.length;
			if (readBytes > maxBytes) {
				reject(new RequestBodyTooLargeError(maxBytes));
				return;
			}
			chunks.push(chunk);
		});
		request.on("end", () => resolve(Buffer.concat(chunks)));
		request.on("error", reject);
	});

/**
 * Answers a body readRequestBody gave up on with 413. The upload is cut off only
 * once the answer is out: destroying the request takes the socket with it, and
 * anything still buffered on it
 */
const sendBodyTooLarge = (
	request: http.IncomingMessage,
	response: http.ServerResponse,
	error: RequestBodyTooLargeError,
): void => {
	response.writeHead(413, {
		"Content-Type": "application/json; charset=utf-8",
	});
	response.end(JSON.stringify({ error: error.message }), () => {
		request.destroy();
	});
};

/**
 * Whether a request is from a page of this host's own, by its Origin and the
 * session token it carries, the refusal having been sent when it is not. It is
 * what stands before anything that reaches past serving the page (a write, an
 * action). A missing Origin is a client that is not a browser (curl, a test),
 * which the Host check has already placed on this machine; a browser always sends
 * one, so a foreign one is a page trying to act through the person looking at it.
 * The token is what a page left over from the host before this one on the same
 * port does not have
 *
 * @param listeningPort The port the request arrived on, which an Origin of ours
 *   has to name
 * @param sessionToken This host's own token, which the request's header has to
 *   match exactly
 */
const admitSameOriginTokenRequest = (
	request: http.IncomingMessage,
	response: http.ServerResponse,
	listeningPort: number,
	sessionToken: string,
): boolean => {
	const originHeader = request.headers.origin;
	if (
		originHeader !== undefined &&
		!isAllowedOrigin(originHeader, listeningPort)
	) {
		sendJson(response, 403, { error: "unexpected Origin header" });
		return false;
	}
	if (request.headers[SESSION_TOKEN_HEADER.toLowerCase()] !== sessionToken) {
		sendJson(response, INVALID_SESSION_STATUS, {
			error: "invalid session token",
		});
		return false;
	}
	return true;
};

/**
 * The names of the actions the owner handed a callback for, in the order a menu
 * lists them (HOST_ACTION_NAMES), which is what GET /api/session announces
 */
const listOfferedActions = (
	hostActions: HostActions | undefined,
): HostActionName[] =>
	HOST_ACTION_NAMES.filter((name) => hostActions?.[name] !== undefined);

const readRelPathParam = (requestUrl: URL): string => {
	const relPath = requestUrl.searchParams.get(FILE_API_PATH_PARAM) ?? "";
	if (relPath === "") {
		throw new WorkspacePathError(
			`${FILE_API_PATH_PARAM} query parameter is required`,
		);
	}
	return relPath;
};

const handleWriteFile = async (
	options: ViewerHttpServerOptions,
	request: http.IncomingMessage,
	requestUrl: URL,
	response: http.ServerResponse,
): Promise<void> => {
	const relPath = readRelPathParam(requestUrl);
	// The boundary comes first, so a path nobody could open is answered as the bad
	// path it is rather than as the wrong file or the wrong revision. The write
	// itself resolves the path again, since it is the one that opens the file
	await resolveWorkspacePathReal(options.workspaceRoot, relPath);
	const ifMatch = request.headers[REVISION_HEADER.toLowerCase()];
	// A write that names no revision is one that cannot be told apart from a write
	// over somebody else's work, so it is refused before the body is even read. An
	// empty header is as good as none: Node hands one over as an empty string
	if (typeof ifMatch !== "string" || ifMatch === "") {
		sendJson(response, 428, {
			error: `${REVISION_HEADER} is required, naming the revision this write replaces`,
		});
		return;
	}
	let body: Buffer;
	try {
		body = await readRequestBody(request, MAX_WRITE_BODY_BYTES);
	} catch (error) {
		if (!(error instanceof RequestBodyTooLargeError)) {
			throw error;
		}
		sendBodyTooLarge(request, response, error);
		return;
	}
	const outcome = await options.writeOpenFile(relPath, body, ifMatch);
	if (outcome.kind === "not-open") {
		// The viewer writes back the file it was told to show and nothing else, so a
		// path that is not that one is a request nobody drew
		sendJson(response, NOT_ON_DISPLAY_STATUS, {
			error: `the canvas on display is not ${relPath}`,
		});
		return;
	}
	if (outcome.kind === "invalid-doc") {
		sendJson(response, 422, {
			error: `the document is not a valid canvas file:\n${outcome.message}`,
		});
		return;
	}
	if (outcome.kind === "revision-mismatch") {
		// The current revision goes back with the refusal, so the viewer can tell
		// what it is now behind and reload rather than ask again
		sendJson(response, REVISION_MISMATCH_STATUS, {
			error: `the file has changed since revision ${ifMatch}`,
			revision: outcome.revision,
		});
		return;
	}
	if (outcome.kind === "file-unsettled") {
		// A 5xx, so the viewer sends the same write again on its backoff and says so
		// in the error bar (isTransientWriteStatus)
		sendJson(response, 503, {
			error: "the file kept changing while this write waited to land",
		});
		return;
	}
	sendJson(response, 200, { ok: true, revision: outcome.revision });
};

/**
 * Runs the action the body names, once the guards have let the request through.
 * The body is JSON of the HostActionRequestBody shape; anything else is a 400, and
 * a name the owner handed no callback for a 404. A callback that throws is left to
 * the caller's catch (sendApiError), so the viewer reads the failure off the same
 * statuses a write's come back as
 */
const handleHostAction = async (
	hostActions: HostActions | undefined,
	request: http.IncomingMessage,
	response: http.ServerResponse,
): Promise<void> => {
	let body: Buffer;
	try {
		// The cap is the write's: a body that nobody could mean as an action is cut
		// off before it is held in full
		body = await readRequestBody(request, MAX_WRITE_BODY_BYTES);
	} catch (error) {
		if (!(error instanceof RequestBodyTooLargeError)) {
			throw error;
		}
		sendBodyTooLarge(request, response, error);
		return;
	}
	let parsedBody: unknown;
	try {
		parsedBody = JSON.parse(body.toString("utf8"));
	} catch {
		sendJson(response, 400, { error: "the body is not JSON" });
		return;
	}
	const actionName =
		typeof parsedBody === "object" && parsedBody !== null
			? (parsedBody as { action?: unknown }).action
			: undefined;
	if (!isHostActionName(actionName)) {
		sendJson(response, 400, {
			error: `the body names no action out of ${HOST_ACTION_NAMES.join(", ")}`,
		});
		return;
	}
	const action = hostActions?.[actionName];
	if (action === undefined) {
		sendJson(response, 404, { error: "action not offered" });
		return;
	}
	// Answered once the callback settles, so a viewer asking to quit is not told
	// "done" by a process that then fails to go
	await action();
	response.writeHead(HOST_ACTION_DONE_STATUS);
	response.end();
};

const handleReadImageFile = async (
	workspaceRoot: string,
	requestUrl: URL,
	response: http.ServerResponse,
): Promise<void> => {
	const relPath = readRelPathParam(requestUrl);
	// Images are the only workspace files the viewer reads, so any other extension
	// stays unreadable rather than this becoming a way to fetch any file under the
	// root. The list is @jiscribe/doc's, shared with every host
	const contentType = resolveDocImageMimeType(relPath);
	if (contentType === null) {
		sendJson(response, 404, { error: "not found" });
		return;
	}
	const resolvedFile = await resolveWorkspacePathReal(workspaceRoot, relPath);
	// A missing file lands in the caller's catch as ENOENT, which becomes a 404
	const fileStat = await stat(resolvedFile);
	if (!fileStat.isFile()) {
		sendJson(response, 404, { error: "not found" });
		return;
	}
	response.writeHead(200, {
		"Content-Type": contentType,
		"Content-Length": fileStat.size,
		// Unlike the built assets, this is a workspace file a person can replace at
		// any moment under the name it already has
		"Cache-Control": "no-store",
		// An SVG opened top-level would otherwise run its script on this origin,
		// where the session token is readable. The sandbox drops it into an opaque
		// origin and the rest of the policy leaves it nothing to load
		"Content-Security-Policy": "sandbox; default-src 'none'",
	});
	pipeFileToResponse(resolvedFile, response);
};

const serveAsset = async (
	assetRootPath: string,
	pathname: string,
	response: http.ServerResponse,
): Promise<void> => {
	let resolvedFile: string;
	try {
		// The assets are our own build output rather than a workspace, so the lexical
		// check is the whole of it: no link of anyone else's making is under there
		resolvedFile = resolveWorkspacePath(
			assetRootPath,
			decodeURIComponent(pathname.replace(/^\/assets\//, "")),
		);
	} catch {
		// A percent-encoding that does not decode (URIError) is as much a miss as a
		// path leading out of the assets
		sendJson(response, 404, { error: "not found" });
		return;
	}
	const contentType = assetContentTypes[path.extname(resolvedFile)];
	if (contentType === undefined) {
		sendJson(response, 404, { error: "not found" });
		return;
	}
	try {
		const fileStat = await stat(resolvedFile);
		if (!fileStat.isFile()) {
			sendJson(response, 404, { error: "not found" });
			return;
		}
		response.writeHead(200, {
			"Content-Type": contentType,
			"Content-Length": fileStat.size,
			// The file name changes with the content (vite's hash), so it can be held
			// for a long time
			"Cache-Control": "public, max-age=31536000, immutable",
		});
		pipeFileToResponse(resolvedFile, response);
	} catch {
		sendJson(response, 404, { error: "not found" });
	}
};

/**
 * The Content-Security-Policy of the viewer page. The page is one file with its
 * script and styles folded in, so the script is named by hash, the styles are
 * inline (Emotion adds more at runtime), the fonts come from `/assets/`, and the
 * images a drawing points at arrive through `fetch` as blob URLs. A drawing's own
 * markup, however it got past the canvas's sanitizing, can then neither run a
 * script nor load anything from another origin.
 *
 * @param scriptHashes The base64 SHA-256 of each inline script in the page; no
 *   other script runs, same-origin ones included
 * @param listeningPort The port the page's WebSocket comes back to. `'self'`
 *   covers the ws: scheme in current browsers; the loopback names are spelled out
 *   for the ones where it does not, except `[::1]`, which CSP's host grammar
 *   cannot write and `'self'` alone covers
 */
export const buildViewerContentSecurityPolicy = (
	scriptHashes: readonly string[],
	listeningPort: number,
): string => {
	const scriptSources = scriptHashes.map((hash) => `'sha256-${hash}'`);
	const socketSources = loopbackHostNames
		.filter((hostName) => !hostName.startsWith("["))
		.map((hostName) => `ws://${hostName}:${listeningPort}`);
	return [
		"default-src 'none'",
		`script-src ${scriptSources.join(" ")}`,
		"style-src 'unsafe-inline'",
		"img-src blob: data:",
		"font-src 'self'",
		`connect-src 'self' ${socketSources.join(" ")}`,
		"frame-ancestors 'none'",
		"base-uri 'none'",
		"form-action 'none'",
	].join("; ");
};

export type ViewerHttpServerOptions = {
	/**
	 * What image reads are relative to (absolute path). Nothing outside it can be
	 * read, and the write route checks a path against it before handing it on
	 */
	workspaceRoot: string;
	/** The viewer's HTML, folded into one file and embedded at build time */
	viewerHtml: string;
	/**
	 * The SHA-256 (base64) of each inline script in viewerHtml. The page's
	 * Content-Security-Policy lets exactly those run, so that markup reaching the
	 * page from a drawing cannot bring a script of its own
	 */
	viewerScriptHashes: readonly string[];
	/** The directory of assets the HTML refers to, such as the fonts (absolute path) */
	assetRootPath: string;
	/**
	 * This host's session token, handed out at `/api/session` and demanded of every
	 * write. One per host, so a page left over from a host that served another
	 * workspace on this port cannot write into this one
	 */
	sessionToken: string;
	/**
	 * Performs one write from the viewer. The checks this route cannot make on its
	 * own are the callee's: that the file named is the one on display, and that the
	 * revision named is the one it holds. It runs under the same per-file lock the
	 * AI's tools take, so a person's save and a tool's rewrite never overlap
	 *
	 * @param relPath The file to write, relative to workspaceRoot and already
	 *   checked to be inside it
	 * @param body The bytes to write, as they arrived
	 * @param ifMatch The revision the write replaces, as the viewer was last given
	 *   it. Never empty: a request naming none is refused before this is called
	 * @returns What became of the write. A path or permission failure is thrown
	 *   instead, and answered as the 400 / 404 / 500 it is
	 */
	writeOpenFile: (
		relPath: string,
		body: Buffer,
		ifMatch: string,
	) => Promise<WriteOpenFileOutcome>;
	/**
	 * The actions the owner of this host offers the viewer, one callback per name
	 * (see HostActions). Their names go out with the session token, and a POST to
	 * HOST_ACTION_API_PATHNAME naming one runs it; omitted, the session announces
	 * none and every POST is answered 404
	 */
	hostActions?: HostActions;
};

/**
 * Creates the HTTP server that serves the viewer. Listening is left to the caller.
 *
 * @param options Nothing outside workspaceRoot can be written or read. viewerHtml
 *   is returned as it is at `/`, and sessionToken is what a write or an action
 *   request has to carry
 */
export function createViewerHttpServer(
	options: ViewerHttpServerOptions,
): http.Server {
	const {
		workspaceRoot,
		viewerHtml,
		viewerScriptHashes,
		assetRootPath,
		sessionToken,
		hostActions,
	} = options;
	const sessionResponse: SessionApiResponse = {
		token: sessionToken,
		actions: listOfferedActions(hostActions),
	};
	return http.createServer((request, response) => {
		void (async () => {
			// Nothing served from here is ever a type the browser should be left to
			// guess at
			response.setHeader("X-Content-Type-Options", "nosniff");
			// The port the request arrived on is the one this server listens on, which
			// saves handing it down from the listen that only happens later
			const listeningPort = request.socket.localPort ?? 0;
			const hostHeader = request.headers.host;
			if (!isAllowedHostHeader(hostHeader, listeningPort)) {
				sendJson(response, 400, { error: "unexpected Host header" });
				return;
			}
			let requestUrl: URL;
			try {
				requestUrl = new URL(request.url ?? "/", `http://${hostHeader}`);
			} catch {
				// A request target the URL parser will not take is answered rather than
				// left to reject out of this handler and end the process
				sendJson(response, 400, { error: "malformed request url" });
				return;
			}
			// HEAD is answered as GET is, the body dropped: node writes none for a HEAD
			// response whatever is passed to end()
			const isReadMethod =
				request.method === "GET" || request.method === "HEAD";
			try {
				if (
					requestUrl.pathname === FILE_API_PATHNAME &&
					request.method === "PUT"
				) {
					if (
						!admitSameOriginTokenRequest(
							request,
							response,
							listeningPort,
							sessionToken,
						)
					) {
						return;
					}
					await handleWriteFile(options, request, requestUrl, response);
				} else if (requestUrl.pathname === FILE_API_PATHNAME && isReadMethod) {
					await handleReadImageFile(workspaceRoot, requestUrl, response);
				} else if (
					requestUrl.pathname === SESSION_API_PATHNAME &&
					isReadMethod
				) {
					response.setHeader("Cache-Control", "no-store");
					sendJson(response, 200, sessionResponse);
				} else if (
					requestUrl.pathname === HOST_ACTION_API_PATHNAME &&
					request.method === "POST"
				) {
					if (
						!admitSameOriginTokenRequest(
							request,
							response,
							listeningPort,
							sessionToken,
						)
					) {
						return;
					}
					await handleHostAction(hostActions, request, response);
				} else if (requestUrl.pathname.startsWith("/api/")) {
					sendJson(response, 404, { error: "unknown api" });
				} else if (isReadMethod && requestUrl.pathname.startsWith("/assets/")) {
					await serveAsset(assetRootPath, requestUrl.pathname, response);
				} else if (isReadMethod && requestUrl.pathname === "/") {
					response.writeHead(200, {
						"Content-Type": "text/html; charset=utf-8",
						"Content-Security-Policy": buildViewerContentSecurityPolicy(
							viewerScriptHashes,
							listeningPort,
						),
					});
					response.end(viewerHtml);
				} else {
					sendJson(response, 404, { error: "not found" });
				}
			} catch (error) {
				sendApiError(response, error);
			}
		})();
	});
}
