import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 接続された図形ごとコネクターを複製したときの端点リマップ検証。
 *
 * cloneObjects は複製集合内に両端の図形が含まれるコネクターの端点（source/target）を
 * 新 ID へ張り替える（remapEndpointRef）。これが壊れると、複製したコネクターが元図形を
 * 指したまま／どこにも繋がらないままになり、移動に追従しなくなる。数や type だけでは
 * 露見しないため、「複製後の図形を動かすと複製コネクターだけが追従し、元コネクターは不動」
 * という不変条件で守る。
 *
 * コピー＆ペースト（handlePaste）と複製（DuplicateCommand）は別エントリで、共有する
 * cloneObjects へ別経路で入る。両方をカバーする。
 */

/** いま存在するコネクター（data-kind=connector の polyline）の data-id 一覧 */
async function connectorIds(canvas: CanvasDriver): Promise<string[]> {
	return (await canvas.captureObjects())
		.filter((obj) => obj.tag === "polyline")
		.map((obj) => obj.id)
		.filter((id): id is string => id !== null);
}

/**
 * 上下 2 つの矩形を縦コネクターで繋いだ初期状態を作り、コネクターの ID を返す。
 * 上矩形: 中心 (500,200) / 下矩形: 中心 (500,450)。
 */
async function setupConnectedPair(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 400 }, { x: 600, y: 500 });
	await canvas.deselect();

	await canvas.selectAt({ x: 500, y: 200 });
	const connectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 400,
	});
	await canvas.deselect();
	return connectorId;
}

test.describe("接続図形ごとのコネクター複製（端点リマップ）", () => {
	test("コピペすると複製コネクターは複製図形に繋がり、元コネクターは不動", async ({
		canvas,
	}) => {
		const srcConnectorId = await setupConnectedPair(canvas);

		// 全選択（2 矩形 + コネクター）してコピー＆ペースト。
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();

		// 図形 4・コネクター 2 の合計 6 になる。
		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "コピペで図形 2・コネクター 1 が増えて合計 6 になること",
			})
			.toBe(6);
		expect((await connectorIds(canvas)).length).toBe(2);

		// 増えたコネクターが複製されたコネクター。
		const clonedConnectorId = (await connectorIds(canvas)).find(
			(id) => id !== srcConnectorId,
		);
		if (!clonedConnectorId) {
			throw new Error("複製されたコネクターの data-id が取得できない");
		}

		const srcPointsBefore = await canvas
			.objectById(srcConnectorId)
			.getAttribute("points");
		const clonedPointsBefore = await canvas
			.objectById(clonedConnectorId)
			.getAttribute("points");

		// 複製された上矩形は元から +20,+20 した中心 (520,220) にあり、元矩形の前面にある。
		// これを大きく右へ動かす。端点が正しくリマップされていれば複製コネクターだけが追従する。
		await canvas.deselect();
		await canvas.drag({ x: 520, y: 220 }, { x: 820, y: 220 });

		// 複製コネクターは複製図形に繋がっているので追従して points が変わる。
		await expect
			.poll(() => canvas.objectById(clonedConnectorId).getAttribute("points"), {
				message: "複製コネクターが複製図形の移動に追従すること",
			})
			.not.toBe(clonedPointsBefore);

		// 元コネクターは元図形に繋がったままなので不動。
		expect(await canvas.objectById(srcConnectorId).getAttribute("points")).toBe(
			srcPointsBefore,
		);
	});

	test("Ctrl+D の複製でも複製コネクターは複製図形に繋がり、元コネクターは不動", async ({
		canvas,
	}) => {
		const srcConnectorId = await setupConnectedPair(canvas);

		// 全選択して複製（クリップボードを介さない DuplicateCommand 経路）。
		await canvas.selectAll();
		await canvas.duplicate();

		await expect
			.poll(async () => (await canvas.captureObjects()).length, {
				message: "複製で合計 6 になること",
			})
			.toBe(6);

		const clonedConnectorId = (await connectorIds(canvas)).find(
			(id) => id !== srcConnectorId,
		);
		if (!clonedConnectorId) {
			throw new Error("複製されたコネクターの data-id が取得できない");
		}

		const srcPointsBefore = await canvas
			.objectById(srcConnectorId)
			.getAttribute("points");
		const clonedPointsBefore = await canvas
			.objectById(clonedConnectorId)
			.getAttribute("points");

		await canvas.deselect();
		await canvas.drag({ x: 520, y: 220 }, { x: 820, y: 220 });

		await expect
			.poll(() => canvas.objectById(clonedConnectorId).getAttribute("points"), {
				message: "複製コネクターが複製図形の移動に追従すること",
			})
			.not.toBe(clonedPointsBefore);
		expect(await canvas.objectById(srcConnectorId).getAttribute("points")).toBe(
			srcPointsBefore,
		);
	});
});
