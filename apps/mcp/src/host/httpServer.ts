// The HTTP layer, which does nothing but serve the canvas viewer and take in a
// person's edits.
//
// There are only two things it serves: the viewer's HTML, folded into one file at
// build time, and the fonts its CSS refers to (split by unicode-range, so the
// browser only fetches the ranges it actually draws). On top of that it has an
// endpoint for writing back what a person fixed.
//
// It has no endpoint for reading because the viewer receives the doc over the
// WebSocket (there is no need to read a file over HTTP).

import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { resolveWorkspacePath, WorkspacePathError } from "./workspacePaths";
import { writeFileAtomically } from "../atomicWrite";

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
	const relPath = requestUrl.searchParams.get("path") ?? "";
	if (relPath === "") {
		throw new WorkspacePathError("path query parameter is required");
	}
	const resolvedFile = resolveWorkspacePath(workspaceRoot, relPath);
	const body = await readRequestBody(request);
	// The parent directory has already resolved inside the workspace, so it is safe
	// to create
	await mkdir(path.dirname(resolvedFile), { recursive: true });
	await writeFileAtomically(resolvedFile, body);
	sendJson(response, 200, { ok: true });
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
		createReadStream(resolvedFile).pipe(response);
	} catch {
		sendJson(response, 404, { error: "not found" });
	}
};

export type ViewerHttpServerOptions = {
	/**
	 * What file writes are relative to (absolute path). Nothing outside it can be
	 * written
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
 * @param options Nothing outside workspaceRoot can be written. viewerHtml is
 *   returned as it is at `/`
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
				if (requestUrl.pathname === "/api/file" && request.method === "PUT") {
					await handleWriteFile(workspaceRoot, request, requestUrl, response);
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
