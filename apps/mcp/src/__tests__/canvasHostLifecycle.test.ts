// 窓の寿命にホストを合わせる部分の確認。ブラウザは要らないので、ビューアの
// 代わりに ws のクライアントを繋ぎ、closeViewer フレームへの応じ方だけを変える。

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import WebSocket from "ws";

import { startCanvasHost, type CanvasHost } from "../host/canvasHost";

/** テストが使うポートの起点。埋まっていればホストが 1 つずつ上へ譲る */
const TEST_PORT = 5290;

/** 猶予は既定 5 秒だが、ここでは畳むこと自体が見たいので詰める */
const TEST_IDLE_DELAY_MS = 50;

let viewerRoot: string;
let previousViewerRoot: string | undefined;
let workspaceRoot: string;
const openHosts: CanvasHost[] = [];
const openSockets: WebSocket[] = [];

/** ビルド済みビューアの代わり。resolveViewerAssets は index.html があれば通る */
beforeAll(async () => {
	viewerRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-viewer-"));
	await writeFile(join(viewerRoot, "index.html"), "<!doctype html>", "utf8");
	previousViewerRoot = process.env.JISCRIBE_MCP_VIEWER_ROOT;
	process.env.JISCRIBE_MCP_VIEWER_ROOT = viewerRoot;
	workspaceRoot = await mkdtemp(join(tmpdir(), "jiscribe-mcp-ws-"));
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

const startTestHost = async (
	options: { onViewersGone?: () => void } = {},
): Promise<CanvasHost> => {
	const host = await startCanvasHost({
		workspaceRoot,
		port: TEST_PORT,
		shouldOpenBrowser: false,
		idleShutdownDelayMs: TEST_IDLE_DELAY_MS,
		...options,
	});
	openHosts.push(host);
	return host;
};

/**
 * ビューアの代わりに繋ぐ。closeViewer が届いたときの振る舞いを呼び出し側が決める
 * （窓を閉じる = 接続を切る、閉じない = 何もしない）。
 */
const connectFakeViewer = async (
	host: CanvasHost,
	onCloseRequest: (socket: WebSocket) => void,
): Promise<WebSocket> => {
	const socket = new WebSocket(`${host.url.replace("http", "ws")}/ws`);
	openSockets.push(socket);
	socket.on("message", (data) => {
		const frame: unknown = JSON.parse(String(data));
		if (
			typeof frame === "object" &&
			frame !== null &&
			(frame as { type?: unknown }).type === "closeViewer"
		) {
			onCloseRequest(socket);
		}
	});
	await new Promise<void>((resolve, reject) => {
		socket.once("open", resolve);
		socket.once("error", reject);
	});
	return socket;
};

/** 条件が満たされるまで短い間隔で見に行く。満たされないまま時間切れなら投げる */
const waitFor = async (
	isSatisfied: () => boolean,
	timeoutMs = 2_000,
): Promise<void> => {
	const deadline = Date.now() + timeoutMs;
	while (!isSatisfied()) {
		if (Date.now() > deadline) {
			throw new Error("condition was not met in time");
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
};

describe("closeViewers", () => {
	it("窓が閉じたら、閉じた数として数える", async () => {
		const host = await startTestHost();
		await connectFakeViewer(host, (socket) => {
			socket.close();
		});

		expect(await host.closeViewers()).toEqual({
			closedCount: 1,
			remainingCount: 0,
		});
	});

	it("閉じるのを拒まれた窓は、閉じたことにせず残った数で返す", async () => {
		const host = await startTestHost();
		// ブラウザに window.close() を拒まれ、窓が生き残った場合
		await connectFakeViewer(host, () => {});

		expect(await host.closeViewers()).toEqual({
			closedCount: 0,
			remainingCount: 1,
		});
	}, 15_000);

	it("そもそもビューアが繋がっていなければ 0 を返す", async () => {
		const host = await startTestHost();

		expect(await host.closeViewers()).toEqual({
			closedCount: 0,
			remainingCount: 0,
		});
	});
});

describe("close", () => {
	it("読みかけの接続を掴まれたままでも畳める", async () => {
		// server.close() は処理中の接続が終わるまで返らない。ブラウザは畳む合図を
		// 知らないので、これを待つと畳めないまま止まる
		const host = await startTestHost();
		const port = Number(new URL(host.url).port);
		const socket = net.connect(port, "127.0.0.1");
		await new Promise<void>((resolve, reject) => {
			socket.once("connect", () => {
				// 締めの空行を送らない = サーバーから見ればまだ読んでいる途中
				socket.write("GET / HTTP/1.1\r\nHost: localhost\r\n");
				resolve();
			});
			socket.once("error", reject);
		});

		await host.close();

		socket.destroy();
	});
});

describe("onViewersGone", () => {
	it("最後のビューアが去り、猶予のあいだ戻らなければ呼ばれる", async () => {
		let goneCount = 0;
		const host = await startTestHost({
			onViewersGone: () => {
				goneCount += 1;
			},
		});
		const socket = await connectFakeViewer(host, () => {});
		socket.close();

		await waitFor(() => goneCount === 1);
	});

	it("1 つも繋がらないうちは呼ばれない", async () => {
		let goneCount = 0;
		await startTestHost({
			onViewersGone: () => {
				goneCount += 1;
			},
		});

		await new Promise((resolve) => setTimeout(resolve, TEST_IDLE_DELAY_MS * 4));
		expect(goneCount).toBe(0);
	});

	it("猶予のうちに繋ぎ直されたら呼ばない", async () => {
		let goneCount = 0;
		const host = await startTestHost({
			onViewersGone: () => {
				goneCount += 1;
			},
		});
		const socket = await connectFakeViewer(host, () => {});
		socket.close();
		// 再読み込みで一瞬切れただけ、という筋
		await connectFakeViewer(host, () => {});

		await new Promise((resolve) => setTimeout(resolve, TEST_IDLE_DELAY_MS * 4));
		expect(goneCount).toBe(0);
	});
});
