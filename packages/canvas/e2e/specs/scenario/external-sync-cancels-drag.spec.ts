import { test, expect } from "../../fixtures";

/**
 * 外部同期（SYNC_EXTERNAL）が進行中のドラッグをキャンセルすることの検証（#78）。
 *
 * useSyncExternalDoc は外部 doc の差し替え時に resetGestureState を呼び、
 * GestureRecognizer の進行中ドラッグを破棄する契約になっている。#78 では
 * StrictMode の setup→cleanup→setup で recognizer の ref が null のまま残り、
 * この reset が恒久 no-op になっていた（ハーネスは StrictMode + dev サーバーで
 * 動くため、この spec はその環境ごと回帰を検出する）。
 *
 * 判別経路にパン（中ボタンドラッグ）を使う: パンの drag ハンドラは
 * eventStartSnapshot が消えても現在 viewport へフォールバックするため
 * （CanvasEventHandler）、reset が効いていないとき「同期後もパンが続く」という
 * 可視の差が出る。図形ドラッグは snapshot 消失で早期 return してしまい、
 * バグ有無で見た目が変わらないため判別に使えない。
 */

const syncedDocText = JSON.stringify({
	version: 1,
	root: [
		{
			id: "synced-rect",
			type: "rect",
			x: 300,
			y: 200,
			width: 160,
			height: 100,
		},
	],
});

test.describe("外部同期中のドラッグキャンセル（#78）", () => {
	test("パン保持中に外部 doc が差し替わると、以後のポインタ移動でパンが続かない", async ({
		canvas,
	}) => {
		const { page } = canvas;

		// ジェスチャー処理は RAF バッチなので、「動かない」ことの確認は時間待ちではなく
		// フレームを 2 回明示的に流してから読むことで同期する。
		const flushFrames = () =>
			page.evaluate(
				() =>
					new Promise<void>((resolve) => {
						requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
					}),
			);

		// 中ボタンでパンを開始し、up せず保持する
		const viewBoxBeforePan = await canvas.getViewBox();
		const grabScreen = canvas.toScreen({ x: 500, y: 300 });
		await page.mouse.move(grabScreen.x, grabScreen.y);
		await page.mouse.down({ button: "middle" });
		await page.mouse.move(grabScreen.x + 120, grabScreen.y + 80, { steps: 8 });

		// 正の対照: パンが実際に始まっている（これが無いと後段が空検証になる）
		await expect
			.poll(() => canvas.getViewBox(), {
				message: "中ドラッグでパンが始まること",
			})
			.not.toBe(viewBoxBeforePan);

		// ドラッグ保持中に外部 doc を注入 → SYNC_EXTERNAL + resetGestureState
		await page.evaluate((docText) => {
			const hook = (
				window as unknown as {
					__setHarnessDoc?: (docText: string) => void;
				}
			).__setHarnessDoc;
			if (!hook) {
				throw new Error("__setHarnessDoc が未定義（ハーネスのフック未設定）");
			}
			hook(docText);
		}, syncedDocText);
		// 同期が適用された（注入した図形が現れた）ことを確認してから後段へ進む
		await expect(canvas.objectById("synced-rect")).toHaveCount(1);

		// ドラッグはキャンセル済みのはず: さらに大きくポインタを動かしても
		// viewBox が動かない（reset が no-op だとパンが続いてここで落ちる）
		await flushFrames();
		const viewBoxAfterSync = await canvas.getViewBox();
		await page.mouse.move(grabScreen.x + 400, grabScreen.y + 300, {
			steps: 8,
		});
		await flushFrames();
		expect(await canvas.getViewBox()).toBe(viewBoxAfterSync);

		await page.mouse.up({ button: "middle" });
	});
});
