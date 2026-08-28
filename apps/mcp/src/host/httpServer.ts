// キャンバスビューアを配り、人の編集を受け取るだけの HTTP 層。
//
// 配るものは 2 つしかない。ビルド時に 1 枚へまとめたビューアの HTML と、
// その CSS が参照するフォント（unicode-range で分割されているので、ブラウザは
// 実際に描く範囲だけ取りに来る）。加えて、人が直した結果を書き戻す口を持つ。
//
// 読み出しの口を持たないのは、ビューアが doc を WebSocket で受け取るため
// （HTTP でファイルを読む必要がない）。

import { createReadStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { resolveWorkspacePath, WorkspacePathError } from "./workspacePaths";
import { writeFileAtomically } from "../atomicWrite";

/** フォントの配信に要る分だけ。ここに無い拡張子は配らない */
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
	// 親ディレクトリはワークスペース内に解決済みなので作成してよい
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
			// 内容ごとにファイル名が変わる（vite のハッシュ付き）ので、長く持たせてよい
			"Cache-Control": "public, max-age=31536000, immutable",
		});
		createReadStream(resolvedFile).pipe(response);
	} catch {
		sendJson(response, 404, { error: "not found" });
	}
};

export type ViewerHttpServerOptions = {
	/** ファイルの書き込み先の基準（絶対パス）。この外へは書けない */
	workspaceRoot: string;
	/** 1 枚にまとめたビューアの HTML。ビルド時に埋め込まれたもの */
	viewerHtml: string;
	/** フォントなど、HTML から参照される資産のディレクトリ（絶対パス） */
	assetRootPath: string;
};

/**
 * ビューアを配る HTTP サーバーを作る。listen は呼び出し側が行う。
 *
 * @param options workspaceRoot の外へは書けない。viewerHtml はそのまま `/` で返る
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
