// The HTTP half of the viewer, exercised over a real socket. What matters here is
// the write endpoint a person's edits come back through, the read endpoint the
// images an object points at come out of, and that the workspace boundary is
// actually applied on the way in: everything reaching this server was composed by a
// browser.

import {
	chmod,
	mkdir,
	mkdtemp,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import type http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createViewerHttpServer } from "../host/httpServer";

/** What `/` returns. The real one is the whole viewer folded into a file */
const VIEWER_HTML = "<!doctype html><title>viewer</title>";

let workspaceRoot: string;
/** The directory the assets sit in, so a file just outside them can be placed */
let assetParentPath: string;
let assetRootPath: string;
let server: http.Server;
let baseUrl: string;

/**
 * Listens on a port the kernel picks, so nothing collides with a host running
 * elsewhere on the machine.
 *
 * @returns The origin to send requests to
 */
const listenOnEphemeralPort = async (target: http.Server): Promise<string> => {
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
	return `http://127.0.0.1:${address.port}`;
};

beforeEach(async () => {
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-http-ws-"));
	assetParentPath = await mkdtemp(join(tmpdir(), "jiscribe-http-assets-"));
	assetRootPath = join(assetParentPath, "assets");
	await mkdir(assetRootPath, { recursive: true });
	server = createViewerHttpServer({
		workspaceRoot,
		viewerHtml: VIEWER_HTML,
		assetRootPath,
	});
	baseUrl = await listenOnEphemeralPort(server);
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

		const response = await fetch(`${baseUrl}/api/file?path=diagram.jis.json`, {
			method: "PUT",
			body,
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(
			await readFile(join(workspaceRoot, "diagram.jis.json"), "utf8"),
		).toBe(body);
	});

	it("creates the directories on the way to the file", async () => {
		const response = await fetch(
			`${baseUrl}/api/file?path=${encodeURIComponent("docs/nested/diagram.jis.json")}`,
			{ method: "PUT", body: "{}" },
		);

		expect(response.status).toBe(200);
		expect(
			await readFile(
				join(workspaceRoot, "docs", "nested", "diagram.jis.json"),
				"utf8",
			),
		).toBe("{}");
	});

	it("refuses a request with no path", async () => {
		const response = await fetch(`${baseUrl}/api/file`, {
			method: "PUT",
			body: "{}",
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: expect.stringContaining("path"),
		});
	});

	it("refuses a path leading outside the workspace, and writes nothing", async () => {
		const escapePath = join(workspaceRoot, "..", "escaped.jis.json");

		const response = await fetch(
			`${baseUrl}/api/file?path=${encodeURIComponent("../escaped.jis.json")}`,
			{ method: "PUT", body: "{}" },
		);

		expect(response.status).toBe(400);
		await expect(readFile(escapePath, "utf8")).rejects.toThrow();
	});

	it("refuses an absolute path", async () => {
		const response = await fetch(
			`${baseUrl}/api/file?path=${encodeURIComponent(join(workspaceRoot, "diagram.jis.json"))}`,
			{ method: "PUT", body: "{}" },
		);

		expect(response.status).toBe(400);
	});

	it("answers 404 on any other api route", async () => {
		const response = await fetch(`${baseUrl}/api/unknown`, { method: "PUT" });

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "unknown api" });
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
});

describe("GET /", () => {
	it("returns the viewer html", async () => {
		const response = await fetch(`${baseUrl}/`);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe(
			"text/html; charset=utf-8",
		);
		expect(await response.text()).toBe(VIEWER_HTML);
	});

	it("answers 404 for anything else", async () => {
		const response = await fetch(`${baseUrl}/index.html`);

		expect(response.status).toBe(404);
	});
});
