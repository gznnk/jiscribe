// What stands between the host and a page that is not the viewer. The host listens
// on the loopback interface, which keeps other machines out but not the other tabs
// a browser on this machine has open, so the WebSocket upgrade and the write
// endpoint are checked over a real connection here.

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import WebSocket, { type ClientOptions } from "ws";

import { readSessionToken } from "./hostSessionToken";
import { startCanvasHost, type CanvasHost } from "../host/canvasHost";
import { createPathLock } from "../pathLock";
import {
	MAX_WRITE_BODY_BYTES,
	SESSION_TOKEN_HEADER,
} from "../shared/fileApiRoute";

/** Where the ports these tests use start; the host gives way upward if one is taken */
const TEST_PORT = 5490;

/** The file every host here is showing */
const OPEN_REL_PATH = "diagram.jis.json";

const emptyDocText = '{"version":1,"root":[]}\n';

let viewerRoot: string;
let previousViewerRoot: string | undefined;
let workspaceRoot: string;
const openHosts: CanvasHost[] = [];
const openSockets: WebSocket[] = [];

/**
 * Stands in for the built viewer. resolveViewerAssets passes as long as
 * index.html is there
 */
beforeAll(async () => {
	viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
	await writeFile(join(viewerRoot, "index.html"), "<!doctype html>", "utf8");
	previousViewerRoot = process.env.JISCRIBE_MCP_VIEWER_ROOT;
	process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
	await writeFile(join(workspaceRoot, OPEN_REL_PATH), emptyDocText, "utf8");
});

afterAll(async () => {
	if (previousViewerRoot === undefined) {
		delete process.env.JISCRIBE_MCP_VIEWER_ROOT;
	} else {
		process.env.JISCRIBE_MCP_VIEWER_ROOT = previousViewerRoot;
	}
	await rm(viewerRoot, { recursive: true, force: true });
	await rm(workspaceRoot, { recursive: true, force: true });
});

afterEach(async () => {
	for (const socket of openSockets.splice(0)) {
		socket.close();
	}
	for (const host of openHosts.splice(0)) {
		await host.close();
	}
});

/** Starts a host showing the one file, with no browser put up */
const startTestHost = async (): Promise<CanvasHost> => {
	const host = await startCanvasHost({
		workspaceRoot,
		port: TEST_PORT,
		shouldOpenBrowser: false,
		withFileLock: createPathLock(),
	});
	openHosts.push(host);
	await host.openFile(OPEN_REL_PATH);
	return host;
};

/**
 * Tries the WebSocket upgrade and says how it went.
 *
 * @param host The host to connect to
 * @param query What to put after `/ws?`, unencoded
 * @param clientOptions Anything to send with the upgrade, such as an Origin
 * @returns null when the socket opened, or the status the host refused it with
 */
const tryConnect = async (
	host: CanvasHost,
	query: string,
	clientOptions: ClientOptions = {},
): Promise<number | null> => {
	const socket = new WebSocket(
		`${host.url.replace("http", "ws")}/ws?${query}`,
		clientOptions,
	);
	return await new Promise<number | null>((resolve) => {
		socket.once("open", () => {
			openSockets.push(socket);
			resolve(null);
		});
		socket.once("unexpected-response", (_request, response) => {
			response.resume();
			socket.terminate();
			resolve(response.statusCode ?? 0);
		});
		socket.once("error", () => {
			resolve(0);
		});
	});
};

describe("the WebSocket upgrade", () => {
	it("lets in a page carrying this host's token", async () => {
		const host = await startTestHost();

		expect(
			await tryConnect(host, `token=${await readSessionToken(host.url)}`),
		).toBeNull();
	});

	it("refuses an upgrade carrying no token", async () => {
		const host = await startTestHost();

		expect(await tryConnect(host, "")).toBe(401);
	});

	it("refuses an upgrade carrying another host's token", async () => {
		const host = await startTestHost();

		expect(
			await tryConnect(host, "token=11111111-2222-3333-4444-555555555555"),
		).toBe(401);
	});

	it("refuses an upgrade from a page on another origin", async () => {
		// A browser always puts an Origin on a WebSocket, so this is the shape a
		// page on another site reaching in arrives in
		const host = await startTestHost();

		expect(
			await tryConnect(host, `token=${await readSessionToken(host.url)}`, {
				headers: { Origin: "http://evil.example" },
			}),
		).toBe(403);
	});

	it("lets in the origin it serves the viewer on", async () => {
		const host = await startTestHost();

		expect(
			await tryConnect(host, `token=${await readSessionToken(host.url)}`, {
				headers: { Origin: host.url },
			}),
		).toBeNull();
	});

	it("refuses an upgrade under a name that is not this host's", async () => {
		const host = await startTestHost();

		expect(
			await tryConnect(host, `token=${await readSessionToken(host.url)}`, {
				headers: { Host: "rebound.example" },
			}),
		).toBe(400);
	});
});

describe("a frame that breaks the WebSocket protocol", () => {
	it("closes that socket alone and leaves the host serving", async () => {
		const host = await startTestHost();
		const token = await readSessionToken(host.url);
		const socket = new WebSocket(
			`${host.url.replace("http", "ws")}/ws?token=${token}`,
		);
		openSockets.push(socket);
		await new Promise((resolve) => socket.once("open", resolve));

		const closeCode = await new Promise<number>((resolve) => {
			socket.once("close", resolve);
			socket.send("x".repeat(MAX_WRITE_BODY_BYTES + 1));
		});

		expect(closeCode).toBe(1009);
		expect(await tryConnect(host, `token=${token}`)).toBeNull();
	});
});

describe("a host that took over the port", () => {
	it("refuses the token the host before it handed out", async () => {
		// A window left open from an earlier session reconnects on its own, and the
		// host it finds may be showing another workspace entirely. Its write would
		// land in a directory nobody is looking at, so the token it holds is not
		// this host's and is refused
		const firstHost = await startTestHost();
		const staleToken = await readSessionToken(firstHost.url);
		await firstHost.close();
		openHosts.length = 0;
		const secondHost = await startTestHost();
		expect(secondHost.url).toBe(firstHost.url);

		expect(await tryConnect(secondHost, `token=${staleToken}`)).toBe(401);
		const staleWrite = await fetch(
			`${secondHost.url}/api/file?path=${OPEN_REL_PATH}`,
			{
				method: "PUT",
				headers: { [SESSION_TOKEN_HEADER]: staleToken },
				body: emptyDocText,
			},
		);
		expect(staleWrite.status).toBe(401);

		// And the window rejoins as soon as it has picked this host's token up
		expect(
			await tryConnect(
				secondHost,
				`token=${await readSessionToken(secondHost.url)}`,
			),
		).toBeNull();
	});
});
