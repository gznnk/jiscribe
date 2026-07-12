import { afterEach, describe, expect, it, vi } from "vitest";

import type { ClipboardData } from "../../commands/selection/ClipboardData";
import type { CanvasAction } from "../../reducer/CanvasActions";
import { createTestRegistries } from "../../setup/createCanvasRegistries";
import { enqueueClipboardPaste } from "../useClipboardPaste";

const registries = createTestRegistries();

/**
 * issue #48 の回帰テスト。
 * navigator.clipboard.readText() は解決順を保証しないため、連続ペーストで
 * PASTE の dispatch 順が呼び出し順と食い違いうる。enqueueClipboardPaste は
 * FIFO チェーンで直列化し「呼び出し順 = dispatch 順」「破棄なし」を保証する。
 *
 * readText の中身は non-JSON にして internalClipboard フォールバックへ流し、
 * 呼び出しごとに異なるダミー ClipboardData で dispatch 順を識別する
 * （順序保証の仕組みはデータの出所に依存しないため、レジストリ初期化が要る
 * 正規の ClipboardData を組み立てるまでもない）。
 */

type Deferred = {
	promise: Promise<string>;
	resolve: (text: string) => void;
	reject: (error: unknown) => void;
};

const createDeferred = (): Deferred => {
	let resolve!: (text: string) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<string>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
};

/** readText 呼び出し n 回目に deferreds[n-1] を返すスタブを差し込む */
const stubReadText = (deferreds: Deferred[]) => {
	let callCount = 0;
	const readText = vi.fn(() => {
		const deferred = deferreds[callCount];
		callCount++;
		return deferred?.promise ?? Promise.reject(new Error("unexpected read"));
	});
	vi.stubGlobal("navigator", { clipboard: { readText } });
	return readText;
};

const clipboardOf = (marker: string): ClipboardData =>
	({ marker }) as unknown as ClipboardData;

/** チェーンの .then 継続を消化させる（RAF 等は無関係なのでマイクロタスクのみ） */
const flushMicrotasks = async () => {
	for (let i = 0; i < 10; i++) {
		await Promise.resolve();
	}
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("enqueueClipboardPaste は連続ペーストを FIFO 直列化する", () => {
	it("先行 readText の解決が遅れても dispatch は呼び出し順になる", async () => {
		const firstRead = createDeferred();
		const secondRead = createDeferred();
		const readText = stubReadText([firstRead, secondRead]);
		const pasteChain = { current: Promise.resolve() };
		const dispatched: CanvasAction[] = [];
		const dispatch = (action: CanvasAction) => {
			dispatched.push(action);
		};

		const clipA = clipboardOf("A");
		const clipB = clipboardOf("B");
		const firstPaste = enqueueClipboardPaste(
			pasteChain,
			clipA,
			dispatch,
			registries.objectStateValidator,
		);
		const secondPaste = enqueueClipboardPaste(
			pasteChain,
			clipB,
			dispatch,
			registries.objectStateValidator,
		);

		// 2 回目の paste は 1 回目の dispatch 完了までクリップボードを読まない
		await flushMicrotasks();
		expect(readText).toHaveBeenCalledTimes(1);
		expect(dispatched).toEqual([]);

		firstRead.resolve("not clipboard json");
		await firstPaste;
		expect(dispatched).toEqual([{ type: "PASTE", data: clipA }]);
		await flushMicrotasks();
		expect(readText).toHaveBeenCalledTimes(2);

		secondRead.resolve("not clipboard json either");
		await secondPaste;
		expect(dispatched).toEqual([
			{ type: "PASTE", data: clipA },
			{ type: "PASTE", data: clipB },
		]);
	});

	it("先行 readText の失敗（reject）が後続のペーストを塞がない", async () => {
		const firstRead = createDeferred();
		const secondRead = createDeferred();
		stubReadText([firstRead, secondRead]);
		const pasteChain = { current: Promise.resolve() };
		const dispatched: CanvasAction[] = [];
		const dispatch = (action: CanvasAction) => {
			dispatched.push(action);
		};

		const clipB = clipboardOf("B");
		// 1 回目: OS 読み取り失敗かつ internalClipboard も空 → メニューを閉じるだけ
		const firstPaste = enqueueClipboardPaste(
			pasteChain,
			null,
			dispatch,
			registries.objectStateValidator,
		);
		const secondPaste = enqueueClipboardPaste(
			pasteChain,
			clipB,
			dispatch,
			registries.objectStateValidator,
		);

		firstRead.reject(new Error("clipboard permission denied"));
		await firstPaste;
		expect(dispatched).toEqual([{ type: "CLOSE_CONTEXT_MENU" }]);

		secondRead.resolve("not clipboard json");
		await secondPaste;
		expect(dispatched).toEqual([
			{ type: "CLOSE_CONTEXT_MENU" },
			{ type: "PASTE", data: clipB },
		]);
	});

	it("連打しても回数分の PASTE が dispatch される（途中のリクエストを破棄しない）", async () => {
		const reads = [createDeferred(), createDeferred(), createDeferred()];
		stubReadText(reads);
		const pasteChain = { current: Promise.resolve() };
		const dispatched: CanvasAction[] = [];
		const dispatch = (action: CanvasAction) => {
			dispatched.push(action);
		};

		const clips = [clipboardOf("1"), clipboardOf("2"), clipboardOf("3")];
		const pastes = clips.map((clip) =>
			enqueueClipboardPaste(
				pasteChain,
				clip,
				dispatch,
				registries.objectStateValidator,
			),
		);

		for (let i = 0; i < reads.length; i++) {
			reads[i].resolve("not clipboard json");
			await pastes[i];
		}

		expect(dispatched).toEqual(
			clips.map((clip) => ({ type: "PASTE", data: clip })),
		);
	});
});
