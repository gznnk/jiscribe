import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 接続元の図形を「回転」したときのコネクター追従。
 *
 * コネクターのエンドポイントは図形の辺アンカーに解決される。図形を回転するとアンカー位置も
 * 中心まわりに回るため、points が更新されるべき。回転×アンカー解決は複雑な経路で退行しやすいが
 * 未カバーだった。回転後に points が変わること、さらに移動でも追従し続けること（＝接続が生存）を守る。
 */

/** 上下 2 矩形を縦コネクターで結び、コネクター ID を返す（接続後は選択解除済み） */
async function buildConnectedPair(canvas: CanvasDriver): Promise<string> {
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
	return connectorId;
}

test("接続元を回転してもコネクターが追従し、接続が生き続ける", async ({
	canvas,
}) => {
	const connectorId = await buildConnectedPair(canvas);
	const points = () => canvas.objectById(connectorId).getAttribute("points");
	const initial = await points();

	// 接続元（上の矩形・中心 500,200）を回転する → アンカーが回って points が変わる。
	await canvas.selectAt({ x: 500, y: 200 });
	await canvas.dragTransformHandle("rotation", { x: 500, y: 120 });
	await expect
		.poll(points, { message: "回転でコネクターのアンカーが追従すること" })
		.not.toBe(initial);
	const afterRotate = await points();

	// 回転後に接続元を動かしても追従し続ける（＝接続が壊れていない）。
	// 中心 (500,200) は回転で動かないのでそこから掴んで右へ動かす。
	await canvas.drag({ x: 500, y: 200 }, { x: 660, y: 200 });
	await expect
		.poll(points, { message: "回転後の移動でも追従し続けること" })
		.not.toBe(afterRotate);
});
