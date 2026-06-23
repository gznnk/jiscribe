import type { CDPSession, Page } from "@playwright/test";

import { test, expect } from "../../fixtures";

/**
 * issue #25「GestureRecognizer — マルチタッチ時の状態汚染」の非回帰テスト。
 *
 * GestureRecognizer は単一ポインター（pressed）しか保持しないため、1本目の
 * 操作中に2本目の pointerdown が割り込むと pressed が上書きされ、1本目の
 * pointer の以降のイベントが pointerId 不一致で無視されてしまう問題があった。
 * 結果として図形が中間状態で固まり、座標が誤って確定するリスクがあった。
 * 修正後は「アクティブなジェスチャー中の2本目以降の pointerdown は単純に無視」する。
 *
 * Playwright の mouse/touchscreen API はマルチタッチを扱えないため、
 * CDP の Input.dispatchTouchEvent で実際のタッチポイントを2本同時に送って再現する。
 *
 * CDP タッチの注意点（このテストの組み立てはこれに依存している）:
 * - touchStart/touchMove には「現在アクティブな全タッチ点」を渡す（id で区別）。
 * - touchEnd には「離す点」を渡す（[] なら残り全部を離す）。
 * - キャプチャ確立後、同一指の2回目以降の touchMove は反映されないため、
 *   各指の移動は1回の touchMove で最終位置まで送る。
 */

type TouchPoint = { x: number; y: number; id: number };

/** RAF を2フレーム進め、GestureRecognizer のキュー（schedule の単発 RAF）を消化させる */
function flushFrames(page: Page) {
	return page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
}

function dispatchTouch(
	client: CDPSession,
	type: "touchStart" | "touchMove" | "touchEnd",
	touchPoints: TouchPoint[],
) {
	return client.send("Input.dispatchTouchEvent", { type, touchPoints });
}

// 図形から十分離れた空白座標（コンテンツ座標）。2本目のタッチの着地点に使う。
const SECOND_FINGER = { x: 150, y: 780, id: 2 } as const;
const FIRST_FINGER_ID = 1;

test.describe("マルチタッチ時の状態汚染 (issue #25)", () => {
	test("1本目のドラッグ中に2本目のタッチが割り込んでも、1本目で図形を動かし続けられる", async ({
		canvas,
		page,
	}) => {
		// 中心 (500, 260) の矩形
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		// タッチは実マウスのツール操作と干渉するため、描画が終わってから有効化する
		const client = await page.context().newCDPSession(page);
		await client.send("Emulation.setTouchEmulationEnabled", {
			enabled: true,
			maxTouchPoints: 5,
		});

		// CDP は生の画面座標を取るため、コンテンツ座標を画面座標へ変換して送る。
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		// 1本目: 図形中心を押さえる
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);

		// 2本目: 離れた空白を同時に押さえる（マルチタッチの割り込み）
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
			tp({ ...SECOND_FINGER }),
		]);
		await flushFrames(page);

		// 1本目を最終位置 (800, 560) までドラッグする。
		// 旧実装では2本目の pointerdown で pressed が上書きされ、1本目の move が
		// pointerId 不一致で無視されて図形が中心のまま固まる（= 中間状態で確定）。
		await dispatchTouch(client, "touchMove", [
			tp({ x: 800, y: 560, id: FIRST_FINGER_ID }),
			tp({ ...SECOND_FINGER }),
		]);
		await flushFrames(page);

		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).find((obj) => obj.id === id)
						?.transform,
				{
					message:
						"2本目の割り込みを無視し、1本目で図形を最終位置まで動かせること",
				},
			)
			.toBe("matrix(1, 0, 0, 1, 800, 560)");

		// 2本とも離してジェスチャーを終え、最終位置で確定していることを確認する
		await dispatchTouch(client, "touchEnd", [tp({ ...SECOND_FINGER })]);
		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);

		expect(
			(await canvas.captureObjects()).find((obj) => obj.id === id)?.transform,
		).toBe("matrix(1, 0, 0, 1, 800, 560)");
	});

	test("1本目を押している間に2本目がタップして離れても、1本目の操作は生き続ける", async ({
		canvas,
		page,
	}) => {
		// 中心 (500, 260) の矩形
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		await canvas.deselect();

		const client = await page.context().newCDPSession(page);
		await client.send("Emulation.setTouchEmulationEnabled", {
			enabled: true,
			maxTouchPoints: 5,
		});

		// CDP は生の画面座標を取るため、コンテンツ座標を画面座標へ変換して送る。
		const tp = (p: TouchPoint): TouchPoint => ({ ...p, ...canvas.toScreen(p) });

		// 1本目: 図形中心を押さえたまま保持する
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);

		// 2本目: 空白をタップして（押して離す）割り込む
		await dispatchTouch(client, "touchStart", [
			tp({ x: 500, y: 260, id: FIRST_FINGER_ID }),
			tp({ ...SECOND_FINGER }),
		]);
		await flushFrames(page);
		await dispatchTouch(client, "touchEnd", [tp({ ...SECOND_FINGER })]);
		await flushFrames(page);

		// 1本目を最終位置までドラッグする。
		// 旧実装では2本目で pressed が奪われ、その後 2本目の touchEnd で pressed が
		// クリアされてしまい、1本目の move が無視されて図形が動かない。
		await dispatchTouch(client, "touchMove", [
			tp({ x: 800, y: 560, id: FIRST_FINGER_ID }),
		]);
		await flushFrames(page);

		await expect
			.poll(
				async () =>
					(await canvas.captureObjects()).find((obj) => obj.id === id)
						?.transform,
				{
					message:
						"2本目のタップ割り込み後も1本目の操作が継続し図形を動かせること",
				},
			)
			.toBe("matrix(1, 0, 0, 1, 800, 560)");

		await dispatchTouch(client, "touchEnd", []);
		await flushFrames(page);
	});
});
