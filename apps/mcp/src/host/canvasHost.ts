// AI が描いた図をその場で見せ、人がその上で直せるようにするための
// ローカルホスト。MCP プロセスの中で HTTP + WebSocket を立て、ブラウザで
// ビューアを開く。
//
// 正本はワークスペース上の .jis.json ファイル 1 点に置く。AI は path ベースの
// ツール（add_rect ほか）でそれを書き換え、ホストはファイルの変化を監視して
// ビューアへ写す。人がビューアで直せば保存され、次に AI がファイルを読んだときには
// 人の手が入った姿が返る。
//
// ファイルに答えの無い問い合わせ（撮影・カメラ・選択・計測）だけは、ビューアへ
// requestId を振って聞きに行く（runHandleOp）。

import { randomUUID } from "node:crypto";
import { unwatchFile, watchFile } from "node:fs";
import { readFile } from "node:fs/promises";
import type http from "node:http";
import path from "node:path";

import type { AiHandleOp } from "@jiscribe/ai-tools";
import { WebSocketServer, type WebSocket } from "ws";

import { CanvasHostError } from "./canvasHostError";
import { createViewerHttpServer } from "./httpServer";
import { openBrowser } from "./openBrowser";
import { resolveViewerAssets } from "./viewerAssets";
import {
	isCanvasHostClientMessage,
	type CanvasHostServerMessage,
} from "../shared/canvasHostProtocol";

/** 最初に試すポート。studio の 5180 とは分けてある */
const DEFAULT_PORT = 5190;

/** 使用中だったときに 1 つずつ上へ譲る回数 */
const PORT_ATTEMPT_COUNT = 20;

/**
 * 対象ファイルの監視間隔。ポーリングなのは WSL やネットワーク越しの
 * ファイルシステムで inotify が届かないことがあるため。見るのは常に 1 ファイル
 * だけなので、この間隔でも負荷は無視できる
 */
const WATCH_INTERVAL_MS = 300;

/**
 * ビューアが handleOpRequest に答えるのを諦めるまでの時間。人がドラッグしている
 * 最中でも答えは返るので、これに掛かるのはタブが固まっているときだけ
 */
const HANDLE_OP_TIMEOUT_MS = 15_000;

/**
 * closeViewer を送ってから、窓が閉じたかを判定するまでの待ち。ビューアは溜めていた
 * 編集を書き出してから閉じるので、その 1 往復ぶんの余裕を見る
 */
const VIEWER_CLOSE_TIMEOUT_MS = 5_000;

/**
 * 最後のビューアが去ってから onViewersGone を呼ぶまでの猶予。再読み込みの一瞬の
 * 切断で畳んでしまわないための待ちで、ビューアの再接続間隔（1 秒から）の数回ぶん
 */
const IDLE_SHUTDOWN_DELAY_MS = 5_000;

/** handleOpRequest の答え。canvas-agent の AiCanvasOpResult から requestId を落とした形 */
export type HandleOpOutcome = {
	ok: boolean;
	/** AI へ返す本文。失敗時は理由そのもの */
	text: string;
	/** capture_canvas のときだけ入る PNG（base64） */
	imagePngBase64?: string;
};

/** closeViewers の結果。閉じられなかった窓は残ったまま動き続ける */
export type ViewerCloseOutcome = {
	/** 閉じた窓の数 */
	closedCount: number;
	/** ブラウザに拒まれるなどして開いたままの窓の数 */
	remainingCount: number;
};

export type CanvasHost = {
	/** ビューアの URL。AI へ返して人に開かせる */
	readonly url: string;
	/** ファイル API とパス解決の基準になるディレクトリ（絶対パス） */
	readonly workspaceRoot: string;
	/**
	 * 表示するファイルを切り替える。接続中のビューアには即座に届き、
	 * 未接続なら次に繋いだビューアがこれを開く
	 *
	 * @param relPath workspaceRoot からの相対パス
	 */
	openFile: (relPath: string) => Promise<void>;
	/** 現在表示中のファイル（workspaceRoot からの相対パス）。未指定なら null */
	getOpenPath: () => string | null;
	/**
	 * 描かれた結果にしか答えの無い操作（撮影・カメラ・選択・計測）をビューアへ聞く。
	 *
	 * @param op 実行する操作
	 * @returns AI へそのまま返せる結果。ビューアが繋がっていない・答えないときも
	 *   投げずに ok=false で返す（AI には理由が読めればよい）
	 */
	runHandleOp: (op: AiHandleOp) => Promise<HandleOpOutcome>;
	/**
	 * 開いているビューアの窓を閉じさせる。
	 *
	 * @returns 閉じた数と残った数。Chromium は「スクリプトが開いた窓」以外を
	 *   閉じさせないことがあり、そのときは remainingCount に出る
	 */
	closeViewers: () => Promise<ViewerCloseOutcome>;
	/** 監視・WebSocket・HTTP を畳む。二重呼び出しは無害 */
	close: () => Promise<void>;
};

export type CanvasHostOptions = {
	/** ファイル API の基準ディレクトリ（絶対パス） */
	workspaceRoot: string;
	/** 最初に試すポート（既定 5190）。埋まっていれば 1 つずつ上へ譲る */
	port?: number;
	/**
	 * false なら URL を返すだけでブラウザを開かない。省略時は環境変数
	 * `JISCRIBE_MCP_NO_OPEN` に何か入っていれば開かない（ブラウザの無い環境で
	 * MCP を動かすための逃げ道。値は問わないので "1" でも "true" でも効く）。
	 * 開き方の選択は `JISCRIBE_MCP_BROWSER`（openBrowser 参照）
	 */
	shouldOpenBrowser?: boolean;
	/**
	 * 繋がっていたビューアが全て去り、猶予のあいだ 1 つも戻らなかったときに呼ばれる。
	 * ホストは自分では畳まないので、呼び出し側が close して参照を捨てること。
	 * 一度もビューアが繋がらないうちは呼ばれない（ブラウザの立ち上がりを待つ間や、
	 * そもそも開かない設定のときに畳まないため）
	 */
	onViewersGone?: () => void;
	/**
	 * 最後のビューアが去ってから onViewersGone を呼ぶまでの猶予（ミリ秒、既定 5000）。
	 * 再読み込みの一瞬の切断で畳まないための待ちなので、縮めてよいのは待てない
	 * 事情があるとき（テスト）だけ
	 */
	idleShutdownDelayMs?: number;
};

const isAddressInUseError = (error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"code" in error &&
	(error as { code?: unknown }).code === "EADDRINUSE";

/**
 * 空いているポートが見つかるまで listen を試す。
 *
 * @param server listen させる HTTP サーバー
 * @param startPort 最初に試すポート
 * @returns 実際に listen できたポート
 */
const listenOnAvailablePort = async (
	server: http.Server,
	startPort: number,
): Promise<number> => {
	for (let offset = 0; offset < PORT_ATTEMPT_COUNT; offset += 1) {
		const port = startPort + offset;
		const isListening = await new Promise<boolean>((resolve, reject) => {
			const handleError = (error: unknown): void => {
				server.removeListener("listening", handleListening);
				if (isAddressInUseError(error)) {
					resolve(false);
					return;
				}
				reject(error instanceof Error ? error : new Error(String(error)));
			};
			const handleListening = (): void => {
				server.removeListener("error", handleError);
				resolve(true);
			};
			server.once("error", handleError);
			server.once("listening", handleListening);
			server.listen(port, "127.0.0.1");
		});
		if (isListening) {
			return port;
		}
	}
	throw new CanvasHostError(
		`no free port in ${startPort}-${startPort + PORT_ATTEMPT_COUNT - 1}`,
	);
};

/**
 * 渡した接続が全て閉じるまで待つ。
 *
 * @param sockets 待つ対象。既に閉じているものが混ざっていても構わない
 * @param timeoutMs これを過ぎたら、開いたままの接続を残して打ち切る
 */
const waitForSocketsToClose = async (
	sockets: readonly WebSocket[],
	timeoutMs: number,
): Promise<void> => {
	await new Promise<void>((resolve) => {
		let pendingCount = sockets.filter(
			(socket) => socket.readyState === socket.OPEN,
		).length;
		if (pendingCount === 0) {
			resolve();
			return;
		}
		const handleClose = (): void => {
			pendingCount -= 1;
			if (pendingCount === 0) {
				finish();
			}
		};
		const finish = (): void => {
			clearTimeout(timer);
			for (const socket of sockets) {
				socket.off("close", handleClose);
			}
			resolve();
		};
		const timer = setTimeout(finish, timeoutMs);
		for (const socket of sockets) {
			socket.on("close", handleClose);
		}
	});
};

/**
 * キャンバスホストを起動する。HTTP + WebSocket を立て、ブラウザでビューアを開く
 * （既定は Chromium の `--app=`。枠もタブも無い窓になる）。
 *
 * @param options workspaceRoot は絶対パスであること。ビューアはこのディレクトリの
 *   外のファイルには触れない
 * @returns 起動済みのホスト。表示対象は未指定なので、続けて openFile を呼ぶこと
 */
export async function startCanvasHost(
	options: CanvasHostOptions,
): Promise<CanvasHost> {
	const workspaceRoot = path.resolve(options.workspaceRoot);
	const { viewerHtml, assetRootPath } = resolveViewerAssets();
	const server = createViewerHttpServer({
		workspaceRoot,
		viewerHtml,
		assetRootPath,
	});
	const port = await listenOnAvailablePort(
		server,
		options.port ?? DEFAULT_PORT,
	);
	const url = `http://localhost:${port}`;

	let isClosed = false;
	const sockets = new Set<WebSocket>();
	const webSocketServer = new WebSocketServer({ server, path: "/ws" });

	// 窓の寿命にホストを合わせるための状態。一度も繋がっていないうちに畳むと、
	// 立ち上がりかけのブラウザが繋ぎに来る先を失う
	let hasEverConnected = false;
	let idleTimer: ReturnType<typeof setTimeout> | null = null;

	const cancelIdleShutdown = (): void => {
		if (idleTimer !== null) {
			clearTimeout(idleTimer);
			idleTimer = null;
		}
	};

	const scheduleIdleShutdown = (): void => {
		if (options.onViewersGone === undefined || !hasEverConnected || isClosed) {
			return;
		}
		cancelIdleShutdown();
		idleTimer = setTimeout(() => {
			idleTimer = null;
			if (sockets.size === 0 && !isClosed) {
				options.onViewersGone?.();
			}
		}, options.idleShutdownDelayMs ?? IDLE_SHUTDOWN_DELAY_MS);
	};

	/**
	 * 答え待ちの handleOpRequest。聞いた相手を全部持つのは、その全員が黙って
	 * 去ったときに待ちっぱなしにせず畳むため
	 */
	const pendingHandleOps = new Map<
		string,
		{
			/** まだ答えを待っている接続。閉じるたびに減り、空になったら失敗で畳む */
			askedSockets: Set<WebSocket>;
			settle: (outcome: HandleOpOutcome) => void;
			timer: ReturnType<typeof setTimeout>;
		}
	>();

	const settleHandleOp = (
		requestId: string,
		outcome: HandleOpOutcome,
	): void => {
		const pending = pendingHandleOps.get(requestId);
		if (pending === undefined) {
			return;
		}
		clearTimeout(pending.timer);
		pendingHandleOps.delete(requestId);
		pending.settle(outcome);
	};

	// 表示中のファイルと、その中身として最後に配った本文。監視が拾った変化が
	// 自分（または人の保存）の書き込みそのものだったときに黙るための控え
	let openPath: string | null = null;
	let lastKnownText: string | null = null;
	let watchedFile: string | null = null;

	const broadcast = (message: CanvasHostServerMessage): void => {
		const frame = JSON.stringify(message);
		for (const socket of sockets) {
			if (socket.readyState === socket.OPEN) {
				socket.send(frame);
			}
		}
	};

	/**
	 * 表示中のファイルを読む。読めなければ null を返し、理由をビューアへ伝える
	 * （AI 側にはツールの戻り値で別途伝わるので、ここでは投げない）。
	 */
	const readOpenFileText = async (relPath: string): Promise<string | null> => {
		try {
			return await readFile(path.resolve(workspaceRoot, relPath), "utf8");
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error);
			broadcast({ type: "docError", relPath, message: reason });
			return null;
		}
	};

	const stopWatching = (): void => {
		if (watchedFile !== null) {
			unwatchFile(watchedFile);
			watchedFile = null;
		}
	};

	const startWatching = (relPath: string): void => {
		stopWatching();
		const absolutePath = path.resolve(workspaceRoot, relPath);
		watchedFile = absolutePath;
		watchFile(absolutePath, { interval: WATCH_INTERVAL_MS }, () => {
			void (async () => {
				// 切り替え直後の発火が古い対象を指すことがある
				if (openPath !== relPath) {
					return;
				}
				const text = await readOpenFileText(relPath);
				if (text === null || text === lastKnownText) {
					return;
				}
				lastKnownText = text;
				broadcast({ type: "docChanged", relPath, docText: text });
			})();
		});
	};

	webSocketServer.on("connection", (socket) => {
		sockets.add(socket);
		hasEverConnected = true;
		cancelIdleShutdown();
		socket.on("message", (data) => {
			let frame: unknown;
			try {
				frame = JSON.parse(String(data));
			} catch {
				return;
			}
			if (!isCanvasHostClientMessage(frame)) {
				return;
			}
			if (frame.type === "handleOpResult") {
				settleHandleOp(frame.requestId, {
					ok: frame.ok,
					text: frame.text,
					...(frame.imagePngBase64 === undefined
						? {}
						: { imagePngBase64: frame.imagePngBase64 }),
				});
				return;
			}
			// 人の保存を「知っている最新」として控え、監視の自己エコーを止める
			if (frame.relPath === openPath) {
				lastKnownText = frame.docText;
			}
		});
		socket.on("close", () => {
			sockets.delete(socket);
			if (sockets.size === 0) {
				scheduleIdleShutdown();
			}
			// 聞いた相手が全員去ったら、その問い合わせにはもう誰も答えない
			for (const [requestId, pending] of pendingHandleOps) {
				if (
					pending.askedSockets.delete(socket) &&
					pending.askedSockets.size === 0
				) {
					settleHandleOp(requestId, {
						ok: false,
						text: "the canvas viewer was closed before it could answer",
					});
				}
			}
		});
		// 接続の順序は問わない。開く対象が決まっていれば、その場で送る
		if (openPath !== null && lastKnownText !== null) {
			socket.send(
				JSON.stringify({
					type: "openCanvas",
					relPath: openPath,
					docText: lastKnownText,
				} satisfies CanvasHostServerMessage),
			);
		}
	});

	const shouldOpenBrowser =
		options.shouldOpenBrowser ??
		(process.env.JISCRIBE_MCP_NO_OPEN ?? "") === "";
	if (shouldOpenBrowser) {
		openBrowser(url);
	}

	return {
		url,
		workspaceRoot,
		getOpenPath: () => openPath,
		runHandleOp: async (op) => {
			// 開いているタブ全部に聞いて、最初の答えを採る。
			//
			// 1 つに絞らないのは、繋いでいる相手が「今見ている画面」とは限らないため。
			// ビューアは切れたら勝手に繋ぎ直すので、前のセッションで開いたまま忘れられた
			// タブが、新しいホストへ後から合流してくる。そういうタブは古い版で
			// handleOpRequest を知らないこともあり、そこだけに聞くと黙って時間切れになる。
			const askedSockets = [...sockets].filter(
				(candidate) => candidate.readyState === candidate.OPEN,
			);
			if (askedSockets.length === 0) {
				return {
					ok: false,
					text: "no canvas viewer is connected, so there is nothing on screen to capture, move, select, or measure; open one with open_canvas and keep the browser tab open",
				};
			}
			const requestId = randomUUID();
			return await new Promise<HandleOpOutcome>((resolve) => {
				const timer = setTimeout(() => {
					settleHandleOp(requestId, {
						ok: false,
						text: "the canvas viewer did not answer in time",
					});
				}, HANDLE_OP_TIMEOUT_MS);
				pendingHandleOps.set(requestId, {
					askedSockets: new Set(askedSockets),
					settle: resolve,
					timer,
				});
				const frame = JSON.stringify({
					type: "handleOpRequest",
					requestId,
					op,
				} satisfies CanvasHostServerMessage);
				for (const socket of askedSockets) {
					socket.send(frame);
				}
			});
		},
		closeViewers: async () => {
			const targets = [...sockets].filter(
				(candidate) => candidate.readyState === candidate.OPEN,
			);
			if (targets.length === 0) {
				return { closedCount: 0, remainingCount: 0 };
			}
			const frame = JSON.stringify({
				type: "closeViewer",
			} satisfies CanvasHostServerMessage);
			for (const socket of targets) {
				socket.send(frame);
			}
			await waitForSocketsToClose(targets, VIEWER_CLOSE_TIMEOUT_MS);
			// 窓が消えれば接続も消える。残っているものは閉じるのを拒まれた窓
			const remainingCount = targets.filter(
				(candidate) => candidate.readyState === candidate.OPEN,
			).length;
			return {
				closedCount: targets.length - remainingCount,
				remainingCount,
			};
		},
		openFile: async (relPath) => {
			openPath = relPath;
			const text = await readOpenFileText(relPath);
			lastKnownText = text;
			startWatching(relPath);
			if (text !== null) {
				broadcast({ type: "openCanvas", relPath, docText: text });
			}
		},
		close: async () => {
			if (isClosed) {
				return;
			}
			isClosed = true;
			cancelIdleShutdown();
			stopWatching();
			for (const requestId of [...pendingHandleOps.keys()]) {
				settleHandleOp(requestId, {
					ok: false,
					text: "the canvas host was shut down before the viewer answered",
				});
			}
			// 閉じ握手を待たずに切る。畳む判断は済んでいるので、相手（もう閉じた窓や、
			// 応答の無いタブ）の都合で待たされる意味がない
			for (const socket of sockets) {
				socket.terminate();
			}
			sockets.clear();
			await new Promise<void>((resolve) => {
				webSocketServer.close(() => {
					resolve();
				});
			});
			await new Promise<void>((resolve) => {
				server.close(() => {
					resolve();
				});
				// close() は繋がっている接続が切れるまで返らない。ブラウザは
				// keep-alive を握ったままなので、待つと畳めない
				server.closeAllConnections();
			});
		},
	};
}
