import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 接続図形を「リサイズ」したときのコネクター追従。
 *
 * connector-follow-target は接続図形を「移動」したときの追従を守るが、リサイズで辺が動いた
 * ときの追従は未カバーだった。コネクターのエンドポイントは図形の辺（アンカー）に解決されるため、
 * リサイズで辺位置が変われば points も更新されるべき。source / target 双方のリサイズで守る。
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

test("接続図形をリサイズするとコネクターが両端で追従する", async ({
	canvas,
}) => {
	const connectorId = await buildConnectedPair(canvas);
	const points = () => canvas.objectById(connectorId).getAttribute("points");
	const initial = await points();

	// source（上の矩形）の下辺を下へ伸ばす → コネクター始端が追従する。
	await canvas.selectAt({ x: 500, y: 200 });
	await canvas.dragTransformHandle(
		"bottomCenter",
		{ x: 500, y: 330 },
		{ ctrl: true },
	);
	await expect
		.poll(points, { message: "source リサイズでコネクターが追従すること" })
		.not.toBe(initial);
	const afterSource = await points();

	// target（下の矩形）の上辺を上へ伸ばす → コネクター終端が追従する。
	await canvas.deselect();
	await canvas.selectAt({ x: 500, y: 500 });
	await canvas.dragTransformHandle(
		"topCenter",
		{ x: 500, y: 380 },
		{ ctrl: true },
	);
	await expect
		.poll(points, { message: "target リサイズでコネクターが追従すること" })
		.not.toBe(afterSource);
});
