// The HTTP layer, which does nothing but serve the canvas viewer and take in a
// person's edits.
//
// There are only two things it serves: the viewer's HTML, folded into one file at
// build time, and the fonts its CSS refers to (split by unicode-range, so the
// browser only fetches the ranges it actually draws). On top of that it has an
// endpoint for writing back what a person fixed, and one for reading an image an
// object points at.
//
// Reading is for images alone: the doc reaches the viewer over the WebSocket, while
// the files an image shape's `src` names are on disk only.

import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { pipeline } from "node:stream";

import { resolveDocImageMimeType } from "@jiscribe/doc";

import { resolveWorkspacePath, WorkspacePathError } from "./workspacePaths";
import { writeFileAtomically } from "../atomicWrite";
import { FILE_API_PATH_PARAM, FILE_API_PATHNAME } from "../shared/fileApiRoute";

/** Only what serving the fonts needs. An extension not listed here is not served */
const assetContentTypes: Record<string, string> = {
	".woff": "font/woff",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
};

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

const readRequestBody = (request: http.IncomingMessage): Promise<Buffer> =>
	new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		request.on("data", (chunk: Buffer) => chunks.push(chunk));
		request.on("end", () => resolve(Buffer.concat(chunks)));
		request.on("error", reject);
	});

const handleWriteFile = async (
	workspaceRoot: string,
	request: http.IncomingMessage,
	requestUrl: URL,
	response: http.ServerResponse,
): Promise<void> => {
	const relPath = requestUrl.searchParams.get(FILE_API_PATH_PARAM) ?? "";
	if (relPath === "") {
		throw new WorkspacePathError(
			`${FILE_API_PATH_PARAM} query parameter is required`,
		);
	}
	const resolvedFile = resolveWorkspacePath(workspaceRoot, relPath);
	const body = await readRequestBody(request);
	// The parent directory has already resolved inside the workspace, so it is safe
	// to create
	await mkdir(path.dirname(resolvedFile), { recursive: true });
	await writeFileAtomically(resolvedFile, body);
	sendJson(response, 200, { ok: true });
};

const handleReadImageFile = async (
	workspaceRoot: string,
	requestUrl: URL,
	response: http.ServerResponse,
): Promise<void> => {
	const relPath = requestUrl.searchParams.get(FILE_API_PATH_PARAM) ?? "";
	if (relPath === "") {
		throw new WorkspacePathError(
			`${FILE_API_PATH_PARAM} query parameter is required`,
		);
	}
	const resolvedFile = resolveWorkspacePath(workspaceRoot, relPath);
	// Images are the only workspace files the viewer reads, so any other extension
	// stays unreadable rather than this becoming a way to fetch any file under the
	// root. The list is @jiscribe/doc's, shared with every host
	const contentType = resolveDocImageMimeType(relPath);
	if (contentType === null) {
		sendJson(response, 404, { error: "not found" });
		return;
	}
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
	});
	pipeFileToResponse(resolvedFile, response);
};

const serveAsset = async (
	assetRootPath: string,
	pathname: string,
	response: http.ServerResponse,
): Promise<void> => {
	const requestPath = decodeURIComponent(pathname.replace(/^\/assets\//, ""));
	let resolvedFile: string;
	try {
		resolvedFile = resolveWorkspacePath(assetRootPath, requestPath);
	} catch {
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

export type ViewerHttpServerOptions = {
	/**
	 * What file writes and image reads are relative to (absolute path). Nothing
	 * outside it can be written or read
	 */
	workspaceRoot: string;
	/** The viewer's HTML, folded into one file and embedded at build time */
	viewerHtml: string;
	/** The directory of assets the HTML refers to, such as the fonts (absolute path) */
	assetRootPath: string;
};

/**
 * Creates the HTTP server that serves the viewer. Listening is left to the caller.
 *
 * @param options Nothing outside workspaceRoot can be written or read. viewerHtml
 *   is returned as it is at `/`
 */
export function createViewerHttpServer(
	options: ViewerHttpServerOptions,
): http.Server {
	const { workspaceRoot, viewerHtml, assetRootPath } = options;
	return http.createServer((request, response) => {
		void (async () => {
			const requestUrl = new URL(
				request.url ?? "/",
				`http://${request.headers.host ?? "localhost"}`,
			);
			try {
				if (
					requestUrl.pathname === FILE_API_PATHNAME &&
					request.method === "PUT"
				) {
					await handleWriteFile(workspaceRoot, request, requestUrl, response);
				} else if (
					requestUrl.pathname === FILE_API_PATHNAME &&
					request.method === "GET"
				) {
					await handleReadImageFile(workspaceRoot, requestUrl, response);
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
