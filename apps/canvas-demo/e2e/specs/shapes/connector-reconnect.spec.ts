import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクター端点のドラッグによる再接続。
 *
 * connector.spec は作成と追従、connector-follow-target は両端追従を守るが、「選択した
 * コネクターの端点ハンドル（connection-anchor:edit:<id>:target）を別の図形へドラッグして
 * 接続先を張り替える」操作は未カバーだった。再接続は端点の owner を差し替える中核操作で、
 * 壊れると線が古い図形に取り残される。張り替え後は新しい図形に追従し、元の図形には追従
 * しなくなることを points の変化／非変化で守る。
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
	await canvas.drag(
		{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
		to,
		12,
	);
}

test.describe("コネクターの再接続", () => {
	test("端点ハンドルを別の図形へドラッグすると接続先が張り替わる", async ({
		canvas,
	}) => {
		// A(上) と B(下) を接続。さらに右側に C を用意して target を C へ張り替える。
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

		// C: 中心 (830,490)
		await canvas.drawShape("Rectangle", { x: 760, y: 440 }, { x: 900, y: 540 });
		await canvas.deselect();

		// コネクターを選択 → target 端点ハンドルが出る
		await canvas.page.mouse.click(500, 350);
		await expect(
			canvas.page.locator(
				`[data-id="connection-anchor:edit:${connectorId}:target"]`,
			),
		).toBeVisible();

		// target 端点を C の中心へドラッグして張り替える
		await dragControlTo(
			canvas,
			`connection-anchor:edit:${connectorId}:target`,
			{
				x: 830,
				y: 490,
			},
		);
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
});
