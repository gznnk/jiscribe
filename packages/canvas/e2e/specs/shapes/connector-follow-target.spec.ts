import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * コネクターの接続先（target）追従。
 *
 * connector.spec は「接続元（source）を動かすと追従する」までを守るが、target 側を
 * 動かしたときの追従は検証されていなかった。エンドポイント解決（resolveConnectorPoints）は
 * source / target で別経路を通るため、片側だけ追従が壊れる退行があり得る。両端を順に
 * 動かして points が都度変化することで、両エンドポイントの結線が生きていることを守る。
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

test.describe("コネクターの接続先追従", () => {
	test("接続先（target）の図形を動かすとコネクターが追従する", async ({
		canvas,
	}) => {
		const connectorId = await buildConnectedPair(canvas);

		const pointsBefore = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// 下（接続先）の矩形を右へ移動
		await canvas.drag({ x: 500, y: 500 }, { x: 800, y: 500 });

		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "接続先の移動にコネクターが追従すること",
			})
			.not.toBe(pointsBefore);
	});

	test("接続元・接続先を順に動かすと両端に追従し続ける", async ({ canvas }) => {
		const connectorId = await buildConnectedPair(canvas);

		const pointsInitial = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// まず接続元（上）を右へ動かす → points が変わる
		await canvas.drag({ x: 500, y: 200 }, { x: 750, y: 200 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "接続元の移動に追従すること",
			})
			.not.toBe(pointsInitial);
		const pointsAfterSource = await canvas
			.objectById(connectorId)
			.getAttribute("points");

		// 続けて接続先（下）も右へ動かす → points がさらに変わる
		await canvas.drag({ x: 500, y: 500 }, { x: 750, y: 500 });
		await expect
			.poll(() => canvas.objectById(connectorId).getAttribute("points"), {
				message: "接続先の移動にも追従すること",
			})
			.not.toBe(pointsAfterSource);
	});
});
