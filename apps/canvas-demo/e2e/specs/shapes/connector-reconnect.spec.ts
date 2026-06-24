import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクター端点のドラッグによる再接続と、その undo。
 *
 * connector.spec は作成と追従、connector-follow-target は両端追従を守るが、「選択した
 * コネクターの端点ハンドル（connection-anchor:edit:<id>:target）を別の図形へドラッグして
 * 接続先を張り替える」操作は未カバーだった。再接続は端点の owner を差し替える中核操作で、
 * 壊れると線が古い図形に取り残される。張り替え後は新しい図形に追従し元の図形には追従しない
 * こと、さらに undo で接続先が元へ戻ること（owner 差し替えが履歴に積まれること）を、
 * points の変化／非変化で守る。
 */

/** data-id を持つコントロールの中心から絶対座標へドラッグする */
async function dragControlTo(
	canvas: CanvasDriver,
	dataId: string,
	to: { x: number; y: number },
) {
	const control = canvas.page.locator(`[data-id="${dataId}"]`);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`コントロール ${dataId} の位置が取得できない`);
	}
	// box は画面座標。drag はコンテンツ座標を取るので toContent で揃える。
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		12,
	);
}

/**
 * A(上,中心500,200) と B(下,中心500,500) をコネクターで接続し、右側に C(中心830,490) を置く。
 * コネクター ID を返す（作成後は選択解除済み）。
 */
async function placeAbcAndConnect(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 450 }, { x: 600, y: 550 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 450,
	});
	await canvas.deselect();

	await canvas.drawShape("Rectangle", { x: 760, y: 440 }, { x: 900, y: 540 });
	await canvas.deselect();

	return connectorId;
}

/** コネクターを選択し、target 端点を C(830,490) の中心へドラッグして張り替える */
async function reconnectTargetToC(canvas: CanvasDriver, connectorId: string) {
	await canvas.clickAt({ x: 500, y: 350 });
	await expect(
		canvas.page.locator(
			`[data-id="connection-anchor:edit:${connectorId}:target"]`,
		),
	).toBeVisible();
	const pointsBefore = await canvas
		.objectById(connectorId)
		.getAttribute("points");
	await dragControlTo(canvas, `connection-anchor:edit:${connectorId}:target`, {
		x: 830,
		y: 490,
	});
	// 再接続が commit されて points が C 追従へ変わるまで待つ。dragEnd の状態反映は
	// 非同期なので、ここで同期しないと直後の undo が commit を追い越して空振りする。
	await expect
		.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
			message: "再接続が反映されコネクターの points が変わること",
		})
		.not.toBe(pointsBefore);
}

/** コネクターを選択し、source 端点を C(830,490) の中心へドラッグして張り替える */
async function reconnectSourceToC(canvas: CanvasDriver, connectorId: string) {
	await canvas.clickAt({ x: 500, y: 350 });
	await expect(
		canvas.page.locator(
			`[data-id="connection-anchor:edit:${connectorId}:source"]`,
		),
	).toBeVisible();
	const pointsBefore = await canvas
		.objectById(connectorId)
		.getAttribute("points");
	await dragControlTo(canvas, `connection-anchor:edit:${connectorId}:source`, {
		x: 830,
		y: 490,
	});
	await expect
		.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
			message: "source 再接続が反映されコネクターの points が変わること",
		})
		.not.toBe(pointsBefore);
}

test.describe("コネクターの再接続", () => {
	test("端点ハンドルを別の図形へドラッグすると接続先が張り替わる", async ({
		canvas,
	}) => {
		const connectorId = await placeAbcAndConnect(canvas);

		await reconnectTargetToC(canvas, connectorId);
		await canvas.deselect();

		const pointsAfterReconnect = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// 元の接続先 B を動かしても、もう追従しない（張り替え済み）
		await canvas.drag({ x: 500, y: 500 }, { x: 300, y: 500 });
		expect(await canvas.objectById(connectorId).getAttribute("points")).toBe(
			pointsAfterReconnect,
		);

		// 新しい接続先 C を動かすと追従する
		await canvas.drag({ x: 830, y: 490 }, { x: 1010, y: 490 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "張り替え後は新しい図形 C に追従すること",
			})
			.not.toBe(pointsAfterReconnect);
	});

	test("再接続を undo すると接続先が元の図形へ戻る", async ({ canvas }) => {
		const connectorId = await placeAbcAndConnect(canvas);

		await reconnectTargetToC(canvas, connectorId);

		// undo で接続先が C → B へ戻る。
		await canvas.undo();
		await canvas.deselect();

		const pointsAfterUndo = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// 張り替え先だった C を動かしても、もう追従しない（接続は B に戻っている）。
		await canvas.drag({ x: 830, y: 490 }, { x: 1010, y: 490 });
		expect(await canvas.objectById(connectorId).getAttribute("points")).toBe(
			pointsAfterUndo,
		);

		// 元の接続先 B を動かすと再び追従する。
		await canvas.drag({ x: 500, y: 500 }, { x: 300, y: 500 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "undo 後は元の図形 B への接続が復活して追従すること",
			})
			.not.toBe(pointsAfterUndo);
	});

	test("source 端点を別の図形へドラッグすると接続元が張り替わる", async ({
		canvas,
	}) => {
		const connectorId = await placeAbcAndConnect(canvas);

		await reconnectSourceToC(canvas, connectorId);
		await canvas.deselect();

		const pointsAfterReconnect = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// 元の接続元 A を動かしても、もう追従しない（張り替え済み）。
		await canvas.drag({ x: 500, y: 200 }, { x: 300, y: 200 });
		expect(await canvas.objectById(connectorId).getAttribute("points")).toBe(
			pointsAfterReconnect,
		);

		// 新しい接続元 C を動かすと追従する。
		await canvas.drag({ x: 830, y: 490 }, { x: 1010, y: 490 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "張り替え後は新しい図形 C に追従すること",
			})
			.not.toBe(pointsAfterReconnect);
	});

	test("source の再接続を undo すると接続元が元の図形へ戻る", async ({
		canvas,
	}) => {
		const connectorId = await placeAbcAndConnect(canvas);

		await reconnectSourceToC(canvas, connectorId);
		const pointsConnectedToC = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// undo で接続元が C → A へ戻る。reconnect の commit と undo のレースを避けるため、
		// points が C 接続状態から変わる（undo が反映される）まで待ってから測る。
		await canvas.undo();
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "undo が反映され C 接続が解けること",
			})
			.not.toBe(pointsConnectedToC);
		await canvas.deselect();

		const pointsAfterUndo = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// 張り替え先だった C を動かしても、もう追従しない（接続元は A に戻っている）。
		await canvas.drag({ x: 830, y: 490 }, { x: 1010, y: 490 });
		expect(await canvas.objectById(connectorId).getAttribute("points")).toBe(
			pointsAfterUndo,
		);

		// 元の接続元 A を動かすと再び追従する。
		await canvas.drag({ x: 500, y: 200 }, { x: 300, y: 200 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "undo 後は元の図形 A への接続が復活して追従すること",
			})
			.not.toBe(pointsAfterUndo);
	});
});
