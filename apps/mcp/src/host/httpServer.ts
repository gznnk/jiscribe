// The HTTP layer, which does nothing but serve the canvas viewer and take in a
// person's edits.
//
// There are only two things it serves: the viewer's HTML, folded into one file at
// build time, and the fonts its CSS refers to (split by unicode-range, so the
// browser only fetches the ranges it actually draws). On top of that it has an
// endpoint for writing back what a person fixed, one for reading an image an
// object points at, and one handing out this host's session token.
//
// Reading is for images alone: the doc reaches the viewer over the WebSocket, while
// the files an image shape's `src` names are on disk only.
//
// It listens on the loopback interface, which keeps other machines out but not the
// pages a browser on this one is showing. Three checks stand between such a page
// and the workspace: the Host header has to name this server (which is what a DNS
// rebinding attack cannot produce), an Origin header that is there has to be this
// server's own, and a write has to carry the token only a same-origin page can read.
//
// What a write then does to the file is not decided here: the body is handed to
// writeOpenFile, which takes the same per-file lock the AI's tools do and refuses a
// write whose revision is no longer the one on disk.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pipeline } from "node:stream";

import { resolveDocImageMimeType } from "@jiscribe/doc";

import {
	resolveWorkspacePath,
	resolveWorkspacePathReal,
	WorkspacePathError,
} from "./workspacePaths";
import {
	FILE_API_PATH_PARAM,
	FILE_API_PATHNAME,
	REVISION_HEADER,
	SESSION_API_PATHNAME,
	SESSION_TOKEN_HEADER,
} from "../shared/fileApiRoute";

/** Only what serving the fonts needs. An extension not listed here is not served */
const assetContentTypes: Record<string, string> = {
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
};

/**
 * The names this server answers to. Everything else is a name that resolved to
 * 127.0.0.1 without being one of ours, which is what DNS rebinding looks like
 */
const loopbackHostNames: readonly string[] = [
	"localhost",
	"127.0.0.1",
	"[::1]",
];

/**
 * The most a write may carry. A canvas is text and nowhere near this, so the cap is
 * not a limit anyone meets by drawing; what it stops is a request that would be
 * buffered in full before it is looked at
 */
const MAX_WRITE_BODY_BYTES = 16 * 1024 * 1024;

/** Raised by readRequestBody, and answered with 413 */
class RequestBodyTooLargeError extends Error {
	constructor(maxBytes: number) {
		super(`request body is larger than ${maxBytes} bytes`);
		this.name = "RequestBodyTooLargeError";
	}
}

/**
 * Splits a Host header into the name and the port written on it.
 *
 * @param hostHeader The header as it arrived, which for IPv6 carries the brackets
 * @returns The name (brackets kept) and the port as written, or null when the
 *   header is not a host at all — a malformed one reaches here as readily as a
 *   browser's does
 */
const splitHostHeader = (
	hostHeader: string,
): { name: string; port: string | null } | null => {
	if (hostHeader.startsWith("[")) {
		const closingIndex = hostHeader.indexOf("]");
		if (closingIndex < 0) {
			return null;
		}
		const name = hostHeader.slice(0, closingIndex + 1);
		const rest = hostHeader.slice(closingIndex + 1);
		if (rest === "") {
			return { name, port: null };
		}
		return rest.startsWith(":") ? { name, port: rest.slice(1) } : null;
	}
	const colonIndex = hostHeader.indexOf(":");
	if (colonIndex < 0) {
		return { name: hostHeader, port: null };
	}
	// A second colon means an IPv6 address written without its brackets, which is
	// not a Host header any browser composes
	if (hostHeader.includes(":", colonIndex + 1)) {
		return null;
	}
	return {
		name: hostHeader.slice(0, colonIndex),
		port: hostHeader.slice(colonIndex + 1),
	};
};

/**
 * Whether a request's Host header names this server itself.
 *
 * @param hostHeader The Host header as it arrived, or undefined when there is none
 *   (HTTP/1.1 requires one, so a request without it is refused)
 * @param listeningPort The port the request arrived on. A Host header carrying any
 *   other port is refused; one carrying no port at all is taken as this server
 * @returns Whether the request may be answered
 */
export function isAllowedHostHeader(
	hostHeader: string | undefined,
	listeningPort: number,
): boolean {
	if (hostHeader === undefined) {
		return false;
	}
	const parsed = splitHostHeader(hostHeader);
	if (parsed === null) {
		return false;
	}
	if (!loopbackHostNames.includes(parsed.name.toLowerCase())) {
		return false;
	}
	return parsed.port === null || parsed.port === String(listeningPort);
}

/**
 * Whether an Origin header is this server's own origin.
 *
 * @param originHeader The Origin header as it arrived. A page always sends one on a
 *   write and on a WebSocket, so an absent one stands for a client that is not a
 *   browser (curl, a test) and is left to the caller to allow
 * @param listeningPort The port the request arrived on, which the origin has to
 *   name (a bare `http://localhost` counts as port 80)
 * @returns Whether the origin is this server's own
 */
export function isAllowedOrigin(
	originHeader: string,
	listeningPort: number,
): boolean {
	let originUrl: URL;
	try {
		originUrl = new URL(originHeader);
	} catch {
		return false;
	}
	if (originUrl.protocol !== "http:") {
		return false;
	}
	// URL drops the brackets an IPv6 host is written with, so it is compared under
	// the same spelling the allowlist uses
	const name =
		originUrl.hostname === "::1" ? "[::1]" : originUrl.hostname.toLowerCase();
	if (!loopbackHostNames.includes(name)) {
		return false;
	}
	const originPort = originUrl.port === "" ? 80 : Number(originUrl.port);
	return originPort === listeningPort;
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

const isNodeErrorWithCode = (
	value: unknown,
	code: string,
): value is NodeJS.ErrnoException =>
	value instanceof Error && (value as NodeJS.ErrnoException).code === code;

const sendApiError = (response: http.ServerResponse, error: unknown): void => {
	if (error instanceof WorkspacePathError) {
		sendJson(response, 400, { error: error.message });
		return;
	}
	if (
		isNodeErrorWithCode(error, "ENOENT") ||
		isNodeErrorWithCode(error, "ENOTDIR")
	) {
		sendJson(response, 404, { error: "not found" });
		return;
	}
	sendJson(response, 500, { error: String(error) });
};

/**
 * Sends a file's bytes as the response body, the headers having been written
 * already.
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
	pipeline(createReadStream(file), response, (error) => {
		// stderr is the only channel left (stdout carries the MCP protocol), and a
		// request the browser itself gave up on is not worth reporting
		if (
			error !== null &&
			error !== undefined &&
			!isNodeErrorWithCode(error, "ERR_STREAM_PREMATURE_CLOSE")
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
		response.writeHead(413, {
			"Content-Type": "application/json; charset=utf-8",
		});
		// The upload is cut off only once the answer is out: destroying the request
		// takes the socket with it, and anything still buffered on it
		response.end(JSON.stringify({ error: error.message }), () => {
			request.destroy();
		});
		return;
	}
	const outcome = await options.writeOpenFile(relPath, body, ifMatch);
	if (outcome.kind === "not-open") {
		// The viewer writes back the file it was told to show and nothing else, so a
		// path that is not that one is a request nobody drew
		sendJson(response, 409, {
			error: `the canvas on display is not ${relPath}`,
		});
		return;
	}
	if (outcome.kind === "revision-mismatch") {
		// The current revision goes back with the refusal, so the viewer can tell
		// what it is now behind and reload rather than ask again
		sendJson(response, 412, {
			error: `the file has changed since revision ${ifMatch}`,
			revision: outcome.revision,
		});
		return;
	}
	sendJson(response, 200, { ok: true, revision: outcome.revision });
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

/** What became of a write the viewer sent (see ViewerHttpServerOptions.writeOpenFile) */
export type WriteOpenFileOutcome =
	/** It landed, and this is the revision of what is now on disk */
	| { kind: "written"; revision: string }
	/** The path named is not the file on display, so nothing was written */
	| { kind: "not-open" }
	/**
	 * The file no longer holds the revision the write names, so nothing was
	 * written; the revision carried here is the one it holds now
	 */
	| { kind: "revision-mismatch"; revision: string };

export type ViewerHttpServerOptions = {
	/**
	 * What image reads are relative to (absolute path). Nothing outside it can be
	 * read, and the write route checks a path against it before handing it on
	 */
	workspaceRoot: string;
	/** The viewer's HTML, folded into one file and embedded at build time */
	viewerHtml: string;
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
};

/**
 * Creates the HTTP server that serves the viewer. Listening is left to the caller.
 *
 * @param options Nothing outside workspaceRoot can be written or read. viewerHtml
 *   is returned as it is at `/`, and sessionToken is what a write has to carry
 */
export function createViewerHttpServer(
	options: ViewerHttpServerOptions,
): http.Server {
	const { workspaceRoot, viewerHtml, assetRootPath, sessionToken } = options;
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
			try {
				if (
					requestUrl.pathname === FILE_API_PATHNAME &&
					request.method === "PUT"
				) {
					const originHeader = request.headers.origin;
					// A missing Origin is a client that is not a browser (curl, a test),
					// which the checks above have already placed on this machine. A
					// browser always sends one, so a foreign one is a page trying to
					// write through the person looking at it
					if (
						originHeader !== undefined &&
						!isAllowedOrigin(originHeader, listeningPort)
					) {
						sendJson(response, 403, { error: "unexpected Origin header" });
						return;
					}
					if (
						request.headers[SESSION_TOKEN_HEADER.toLowerCase()] !== sessionToken
					) {
						sendJson(response, 401, { error: "invalid session token" });
						return;
					}
					await handleWriteFile(options, request, requestUrl, response);
				} else if (
					requestUrl.pathname === FILE_API_PATHNAME &&
					request.method === "GET"
				) {
					await handleReadImageFile(workspaceRoot, requestUrl, response);
				} else if (
					requestUrl.pathname === SESSION_API_PATHNAME &&
					request.method === "GET"
				) {
					response.setHeader("Cache-Control", "no-store");
					sendJson(response, 200, { token: sessionToken });
				} else if (requestUrl.pathname.startsWith("/api/")) {
					sendJson(response, 404, { error: "unknown api" });
				} else if (
					request.method === "GET" &&
					requestUrl.pathname.startsWith("/assets/")
				) {
					await serveAsset(assetRootPath, requestUrl.pathname, response);
				} else if (request.method === "GET" && requestUrl.pathname === "/") {
					response.writeHead(200, {
						"Content-Type": "text/html; charset=utf-8",
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
