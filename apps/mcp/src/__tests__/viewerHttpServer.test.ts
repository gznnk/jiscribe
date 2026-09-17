// The HTTP half of the viewer, exercised over a real socket. What matters here is
// the write endpoint a person's edits come back through, the read endpoint the
// images an object points at come out of, and that what guards them is actually
// applied on the way in: everything reaching this server was composed by a browser,
// and not necessarily by the one showing the viewer.

import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	symlink,
	writeFile,
} from "node:fs/promises";
import type http from "node:http";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createViewerHttpServer } from "../host/httpServer";
import {
	SESSION_API_PATHNAME,
	SESSION_TOKEN_HEADER,
} from "../shared/fileApiRoute";

/** What `/` returns. The real one is the whole viewer folded into a file */
const VIEWER_HTML = "<!doctype html><title>viewer</title>";

/** What the host under test hands out at /api/session */
const SESSION_TOKEN = "11111111-2222-3333-4444-555555555555";

/** The file the tests write back to unless they say otherwise */
const OPEN_REL_PATH = "diagram.jis.json";

let workspaceRoot: string;
/** The directory the assets sit in, so a file just outside them can be placed */
let assetParentPath: string;
let assetRootPath: string;
/** What getOpenPath answers with, which a write has to name */
let openPath: string | null;
let server: http.Server;
let baseUrl: string;
let port: number;

/**
 * Listens on a port the kernel picks, so nothing collides with a host running
 * elsewhere on the machine.
 *
 * @returns The port it is listening on
 */
const listenOnEphemeralPort = async (target: http.Server): Promise<number> => {
	await new Promise<void>((resolve, reject) => {
		target.once("error", reject);
		target.listen(0, "127.0.0.1", () => {
			target.removeListener("error", reject);
			resolve();
		});
	});
	const address = target.address();
	if (address === null || typeof address === "string") {
		throw new Error("the server is not listening on a TCP port");
	}
	return address.port;
};

/**
 * Writes a file back the way the viewer does.
 *
 * @param relPath The path to write, put on the query unencoded
 * @param body What to write
 * @param headers Anything to send besides the session token, or a token of its own
 *   to override it
 */
const putFile = async (
	relPath: string,
	body: string,
	headers: Record<string, string> = {},
): Promise<Response> =>
	await fetch(`${baseUrl}/api/file?path=${encodeURIComponent(relPath)}`, {
		method: "PUT",
		headers: { [SESSION_TOKEN_HEADER]: SESSION_TOKEN, ...headers },
		body,
	});

/**
 * Sends a request by hand, for the headers fetch will not compose.
 *
 * @param requestText The whole request, header block included, with CRLF endings
 * @returns The status line of the answer, or "" when the connection closed without
 *   one
 */
const sendRawRequest = async (requestText: string): Promise<string> => {
	const socket = net.connect(port, "127.0.0.1");
	const answer = await new Promise<string>((resolve, reject) => {
		let received = "";
		socket.on("data", (chunk: Buffer) => {
			received += chunk.toString("utf8");
		});
		socket.on("close", () => resolve(received));
		socket.on("error", reject);
		socket.on("connect", () => socket.write(requestText));
	});
	socket.destroy();
	return answer.split("\r\n")[0] ?? "";
};

beforeEach(async () => {
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-http-ws-"));
	assetParentPath = await mkdtemp(join(tmpdir(), "jiscribe-http-assets-"));
	assetRootPath = join(assetParentPath, "assets");
	await mkdir(assetRootPath, { recursive: true });
	openPath = OPEN_REL_PATH;
	server = createViewerHttpServer({
		workspaceRoot,
		viewerHtml: VIEWER_HTML,
		assetRootPath,
		sessionToken: SESSION_TOKEN,
		getOpenPath: () => openPath,
	});
	port = await listenOnEphemeralPort(server);
	baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
	await new Promise<void>((resolve) => {
		server.close(() => {
			resolve();
		});
		// fetch keeps its connection alive, and close() alone would wait on it
		server.closeAllConnections();
	});
	await rm(workspaceRoot, { recursive: true, force: true });
	await rm(assetParentPath, { recursive: true, force: true });
});

describe("PUT /api/file", () => {
	it("writes what the viewer saved", async () => {
		const body = '{"version":1,"root":[]}\n';

		const response = await putFile(OPEN_REL_PATH, body);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(await readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8")).toBe(
			body,
		);
	});

	it("creates the directories on the way to the file", async () => {
		openPath = "docs/nested/diagram.jis.json";

		const response = await putFile(openPath, "{}");

		expect(response.status).toBe(200);
		expect(
			await readFile(
				join(workspaceRoot, "docs", "nested", "diagram.jis.json"),
				"utf8",
			),
		).toBe("{}");
	});

	it("takes the write from the page it serves", async () => {
		const response = await putFile(OPEN_REL_PATH, "{}", {
			Origin: baseUrl,
		});

		expect(response.status).toBe(200);
	});

	it("refuses a write from a page on another origin", async () => {
		// The viewer's own page is the only one meant to write here. Anything else
		// is a site a person happens to have open reaching into their workspace
		const response = await putFile(OPEN_REL_PATH, "{}", {
			Origin: "http://evil.example",
		});

		expect(response.status).toBe(403);
		await expect(
			readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8"),
		).rejects.toThrow();
	});

	it("refuses a write carrying no session token", async () => {
		const response = await fetch(
			`${baseUrl}/api/file?path=${encodeURIComponent(OPEN_REL_PATH)}`,
			{ method: "PUT", body: "{}" },
		);

		expect(response.status).toBe(401);
		await expect(
			readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8"),
		).rejects.toThrow();
	});

	it("refuses a write carrying the token of another host", async () => {
		// A window left over from the host that served another workspace on this
		// port comes back with the token it was given then
		const response = await putFile(OPEN_REL_PATH, "{}", {
			[SESSION_TOKEN_HEADER]: "99999999-9999-9999-9999-999999999999",
		});

		expect(response.status).toBe(401);
	});

	it("refuses a write for a file other than the one on display", async () => {
		const response = await putFile("other.jis.json", "{}");

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: expect.stringContaining(OPEN_REL_PATH),
		});
		await expect(
			readFile(join(workspaceRoot, "other.jis.json"), "utf8"),
		).rejects.toThrow();
	});

	it("refuses a write while nothing is on display", async () => {
		openPath = null;

		const response = await putFile(OPEN_REL_PATH, "{}");

		expect(response.status).toBe(409);
	});

	it("refuses a body past the cap, and writes nothing", async () => {
		// 16MiB and one byte: the first chunk past the cap is where it gives up,
		// rather than after the whole upload has been held in memory
		const response = await putFile(
			OPEN_REL_PATH,
			"x".repeat(16 * 1024 * 1024 + 1),
		);

		expect(response.status).toBe(413);
		await expect(
			readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8"),
		).rejects.toThrow();
	});

	it("refuses a request with no path", async () => {
		const response = await fetch(`${baseUrl}/api/file`, {
			method: "PUT",
			headers: { [SESSION_TOKEN_HEADER]: SESSION_TOKEN },
			body: "{}",
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: expect.stringContaining("path"),
		});
	});

	it("refuses a path leading outside the workspace, and writes nothing", async () => {
		const escapePath = join(workspaceRoot, "..", "escaped.jis.json");
		openPath = "../escaped.jis.json";

		const response = await putFile(openPath, "{}");

		expect(response.status).toBe(400);
		await expect(readFile(escapePath, "utf8")).rejects.toThrow();
	});

	it("refuses an absolute path", async () => {
		openPath = join(workspaceRoot, OPEN_REL_PATH);

		const response = await putFile(openPath, "{}");

		expect(response.status).toBe(400);
	});

	it.skipIf(process.platform === "win32")(
		"refuses a path that reaches out of the workspace through a symlink",
		async () => {
			// The lexical check sees a file in the workspace; where it leads is
			// outside it, and only resolving the link says so
			const outsidePath = join(assetParentPath, "escaped.jis.json");
			await writeFile(outsidePath, "original", "utf8");
			openPath = "linked.jis.json";
			await symlink(outsidePath, join(workspaceRoot, openPath));

			const response = await putFile(openPath, "overwritten");

			expect(response.status).toBe(400);
			expect(await readFile(outsidePath, "utf8")).toBe("original");
		},
	);

	it("answers 404 on any other api route", async () => {
		const response = await fetch(`${baseUrl}/api/unknown`, { method: "PUT" });

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "unknown api" });
	});
});

describe("GET /api/session", () => {
	it("hands out this host's token", async () => {
		const response = await fetch(`${baseUrl}${SESSION_API_PATHNAME}`);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ token: SESSION_TOKEN });
		// A token held in a cache would outlive the host that issued it
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
});

describe("GET /api/file", () => {
	it("serves an image an object points at", async () => {
		await mkdir(join(workspaceRoot, "images"), { recursive: true });
		await writeFile(
			join(workspaceRoot, "images", "logo.png"),
			"png-bytes",
			"utf8",
		);

		const response = await fetch(
			`${baseUrl}/api/file?path=${encodeURIComponent("images/logo.png")}`,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/png");
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(await response.text()).toBe("png-bytes");
	});

	it("sandboxes an image, so an SVG opened on its own runs nothing", async () => {
		// An SVG is a document: opened top-level it would run its script on this
		// origin, where the session token is there for the asking
		await writeFile(join(workspaceRoot, "diagram.svg"), "<svg/>", "utf8");

		const response = await fetch(`${baseUrl}/api/file?path=diagram.svg`);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/svg+xml");
		expect(response.headers.get("content-security-policy")).toBe(
			"sandbox; default-src 'none'",
		);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
	});

	it("answers the content type the extension names, whatever its case", async () => {
		await writeFile(join(workspaceRoot, "photo.JPG"), "jpeg-bytes", "utf8");

		const response = await fetch(`${baseUrl}/api/file?path=photo.JPG`);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/jpeg");
	});

	it("refuses a request with no path", async () => {
		const response = await fetch(`${baseUrl}/api/file`);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: expect.stringContaining("path"),
		});
	});

	it("refuses a path leading outside the workspace", async () => {
		const response = await fetch(
			`${baseUrl}/api/file?path=${encodeURIComponent("../escaped.png")}`,
		);

		expect(response.status).toBe(400);
	});

	it("refuses an absolute path, even to a file inside the workspace", async () => {
		await writeFile(join(workspaceRoot, "logo.png"), "bytes", "utf8");

		const response = await fetch(
			`${baseUrl}/api/file?path=${encodeURIComponent(join(workspaceRoot, "logo.png"))}`,
		);

		expect(response.status).toBe(400);
	});

	it.skipIf(process.platform === "win32")(
		"refuses an image that reaches out of the workspace through a symlink",
		async () => {
			const outsidePath = join(assetParentPath, "secret.png");
			await writeFile(outsidePath, "png-bytes", "utf8");
			await symlink(outsidePath, join(workspaceRoot, "linked.png"));

			const response = await fetch(`${baseUrl}/api/file?path=linked.png`);

			expect(response.status).toBe(400);
		},
	);

	it("answers 404 for a file that is not there", async () => {
		const response = await fetch(`${baseUrl}/api/file?path=missing.png`);

		expect(response.status).toBe(404);
	});

	it("refuses an extension that is not an image, even when the file is there", async () => {
		await writeFile(join(workspaceRoot, "diagram.jis.json"), "{}", "utf8");

		const response = await fetch(
			`${baseUrl}/api/file?path=${encodeURIComponent("diagram.jis.json")}`,
		);

		expect(response.status).toBe(404);
	});

	it("answers 404 for a directory named like an image", async () => {
		await mkdir(join(workspaceRoot, "nested.png"), { recursive: true });

		const response = await fetch(`${baseUrl}/api/file?path=nested.png`);

		expect(response.status).toBe(404);
	});

	// A file that passes stat and then fails to open is the case that used to take
	// the whole MCP process down through the read stream's unhandled error event.
	// root ignores the mode, so there the file would simply be served
	it.skipIf(process.platform === "win32" || process.getuid?.() === 0)(
		"breaks off the response for a file it cannot open, and stays up",
		async () => {
			const unreadableFile = join(workspaceRoot, "locked.png");
			await writeFile(unreadableFile, "png-bytes", "utf8");
			await chmod(unreadableFile, 0o000);

			await expect(
				(async () => {
					const response = await fetch(`${baseUrl}/api/file?path=locked.png`);
					await response.arrayBuffer();
				})(),
			).rejects.toThrow();

			// The process survived, so the next request is answered as usual
			const following = await fetch(`${baseUrl}/`);
			expect(following.status).toBe(200);
		},
	);
});

describe("GET /assets/", () => {
	it("serves a font", async () => {
		await writeFile(join(assetRootPath, "noto.woff2"), "font-bytes", "utf8");

		const response = await fetch(`${baseUrl}/assets/noto.woff2`);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("font/woff2");
		expect(await response.text()).toBe("font-bytes");
	});

	it("refuses an extension that is not on the list, even when the file is there", async () => {
		await writeFile(join(assetRootPath, "secret.png"), "bytes", "utf8");

		const response = await fetch(`${baseUrl}/assets/secret.png`);

		expect(response.status).toBe(404);
	});

	it("answers 404 for a file that is not there", async () => {
		const response = await fetch(`${baseUrl}/assets/missing.woff2`);

		expect(response.status).toBe(404);
	});

	it("answers 404 for a directory", async () => {
		await mkdir(join(assetRootPath, "nested.woff2"), { recursive: true });

		const response = await fetch(`${baseUrl}/assets/nested.woff2`);

		expect(response.status).toBe(404);
	});

	it("refuses an escape written in percent-encoded dots", async () => {
		// The URL parser folds a plain ".." away, so an escape that survives to the
		// handler is an encoded one
		await writeFile(join(assetParentPath, "escaped.woff2"), "bytes", "utf8");

		const response = await fetch(`${baseUrl}/assets/%2e%2e/escaped.woff2`);

		expect(response.status).toBe(404);
	});

	it("answers 404 for a percent-encoding that does not decode", async () => {
		// decodeURIComponent throws on this, and the throw used to reach the
		// handler's catch and come back as 500
		const response = await fetch(`${baseUrl}/assets/%e0%a4%a.woff2`);

		expect(response.status).toBe(404);
	});
});

describe("GET /", () => {
	it("returns the viewer html", async () => {
		const response = await fetch(`${baseUrl}/`);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe(
			"text/html; charset=utf-8",
		);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(await response.text()).toBe(VIEWER_HTML);
	});

	it("answers 404 for anything else", async () => {
		const response = await fetch(`${baseUrl}/index.html`);

		expect(response.status).toBe(404);
	});
});

describe("the Host header", () => {
	it("refuses a name that is not this server's", async () => {
		// What a DNS rebinding attack cannot do is put our own name on the request:
		// it arrives under the name the page was loaded from
		expect(
			await sendRawRequest(
				`GET / HTTP/1.1\r\nHost: rebound.example\r\nConnection: close\r\n\r\n`,
			),
		).toBe("HTTP/1.1 400 Bad Request");
	});

	it("refuses a port that is not the one it listens on", async () => {
		expect(
			await sendRawRequest(
				`GET / HTTP/1.1\r\nHost: localhost:1\r\nConnection: close\r\n\r\n`,
			),
		).toBe("HTTP/1.1 400 Bad Request");
	});

	it("takes the loopback names, with the port and without", async () => {
		for (const hostHeader of [
			"localhost",
			`localhost:${port}`,
			`127.0.0.1:${port}`,
			`[::1]:${port}`,
		]) {
			expect(
				await sendRawRequest(
					`GET / HTTP/1.1\r\nHost: ${hostHeader}\r\nConnection: close\r\n\r\n`,
				),
			).toBe("HTTP/1.1 200 OK");
		}
	});

	it("refuses a write under a foreign name, and writes nothing", async () => {
		expect(
			await sendRawRequest(
				`PUT /api/file?path=${OPEN_REL_PATH} HTTP/1.1\r\nHost: rebound.example\r\n${SESSION_TOKEN_HEADER}: ${SESSION_TOKEN}\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}`,
			),
		).toBe("HTTP/1.1 400 Bad Request");
		await expect(
			readFile(join(workspaceRoot, OPEN_REL_PATH), "utf8"),
		).rejects.toThrow();
	});

	it("answers a malformed one instead of going down over it", async () => {
		// An unclosed bracket used to reject out of the URL parser, with nobody to
		// catch it: it took the whole MCP process with it
		expect(
			await sendRawRequest(
				`GET / HTTP/1.1\r\nHost: [\r\nConnection: close\r\n\r\n`,
			),
		).toBe("HTTP/1.1 400 Bad Request");

		// The process survived, so the next request is answered as usual
		const following = await fetch(`${baseUrl}/`);
		expect(following.status).toBe(200);
	});
});
