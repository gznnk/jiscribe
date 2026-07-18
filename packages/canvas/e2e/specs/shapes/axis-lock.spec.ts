import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/** ポリラインの頂点座標一覧を返す（"x,y x,y" 形式の points 属性をパース） */
const readVertices = async (
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }[]> => {
	const points = await canvas.objectById(id).getAttribute("points");
	if (!points) {
		throw new Error("polyline の points 属性が取得できない");
	}
	return points
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
};

/**
 * Shift ドラッグの軸固定。
 * - オブジェクト移動: 移動量の大きい軸方向にだけ動き、固定軸のガイドが出る。
 * - 頂点ドラッグ: 開始頂点を基準に同じく軸固定される。
 * - 原点スナップ: 開始位置付近では元の位置に吸着し、両軸（十字）ガイドが出る。
 *
 * 軸固定ガイドは drag 中のみ DOM に存在するため、解放前（dragInspecting の
 * コールバック内）で検証する。最終位置は解放後に poll で確認する。
 */
test.describe("Shift 軸固定", () => {
	test.describe("オブジェクト移動", () => {
		test("横方向優位の Shift ドラッグは Y を固定し横移動・横ガイドを出す", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			await canvas.deselect();

			// 中心(500,260)から (700,290): dx=200 > dy=30 → Y 固定の横移動
			await canvas.dragInspecting(
				{ x: 500, y: 260 },
				{ x: 700, y: 290 },
				async () => {
					await expect(canvas.axisLockGuides("y")).toHaveCount(1);
					await expect(canvas.axisLockGuides("x")).toHaveCount(0);
					expect(await canvas.axisLockGuideCoordinates("y")).toEqual([260]);
				},
				{ shift: true },
			);

			await expect
				.poll(async () => {
					const moved = (await canvas.captureObjects()).find(
						(obj) => obj.id === id,
					);
					return moved?.transform;
				})
				.toBe("matrix(1, 0, 0, 1, 700, 260)");
		});

		test("縦方向優位の Shift ドラッグは X を固定し縦移動・縦ガイドを出す", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			await canvas.deselect();

			// 中心(500,260)から (530,460): dy=200 > dx=30 → X 固定の縦移動
			await canvas.dragInspecting(
				{ x: 500, y: 260 },
				{ x: 530, y: 460 },
				async () => {
					await expect(canvas.axisLockGuides("x")).toHaveCount(1);
					await expect(canvas.axisLockGuides("y")).toHaveCount(0);
					expect(await canvas.axisLockGuideCoordinates("x")).toEqual([500]);
				},
				{ shift: true },
			);

			await expect
				.poll(async () => {
					const moved = (await canvas.captureObjects()).find(
						(obj) => obj.id === id,
					);
					return moved?.transform;
				})
				.toBe("matrix(1, 0, 0, 1, 500, 460)");
		});

		test("開始位置付近では原点に吸着し両軸ガイド（十字）を出す", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			await canvas.deselect();

			// 中心(500,260)から (504,263): フリー軸の移動量が小さく原点吸着
			await canvas.dragInspecting(
				{ x: 500, y: 260 },
				{ x: 504, y: 263 },
				async () => {
					await expect(canvas.axisLockGuides("x")).toHaveCount(1);
					await expect(canvas.axisLockGuides("y")).toHaveCount(1);
					expect(await canvas.axisLockGuideCoordinates("x")).toEqual([500]);
					expect(await canvas.axisLockGuideCoordinates("y")).toEqual([260]);
				},
				{ shift: true },
			);

			// 元の位置に戻っている
			await expect
				.poll(async () => {
					const moved = (await canvas.captureObjects()).find(
						(obj) => obj.id === id,
					);
					return moved?.transform;
				})
				.toBe("matrix(1, 0, 0, 1, 500, 260)");
		});

		test("Shift なしでは斜め移動できる（軸固定もガイドも出ない）", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Rectangle",
				{ x: 400, y: 200 },
				{ x: 600, y: 320 },
			);
			await canvas.deselect();

			await canvas.dragInspecting(
				{ x: 500, y: 260 },
				{ x: 700, y: 460 },
				async () => {
					await expect(canvas.axisLockGuides("x")).toHaveCount(0);
					await expect(canvas.axisLockGuides("y")).toHaveCount(0);
				},
			);

			await expect
				.poll(async () => {
					const moved = (await canvas.captureObjects()).find(
						(obj) => obj.id === id,
					);
					return moved?.transform;
				})
				.toBe("matrix(1, 0, 0, 1, 700, 460)");
		});
	});

	test.describe("頂点ドラッグ", () => {
		test("横方向優位の Shift 頂点ドラッグは Y を固定し横ガイドを出す", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Polyline",
				{ x: 400, y: 400 },
				{ x: 700, y: 450 },
			);
			// 描画直後は選択済みで頂点コントロールが表示されている
			await expect(canvas.objectById(id)).toBeVisible();
			const start = (await readVertices(canvas, id))[0];

			// 開始頂点から横方向優位にドラッグ: Y を開始頂点に固定
			await canvas.dragInspecting(
				start,
				{ x: start.x + 200, y: start.y + 20 },
				async () => {
					await expect(canvas.axisLockGuides("y")).toHaveCount(1);
					await expect(canvas.axisLockGuides("x")).toHaveCount(0);
					expect(await canvas.axisLockGuideCoordinates("y")).toEqual([start.y]);
				},
				{ shift: true },
			);

			await expect
				.poll(async () => (await readVertices(canvas, id))[0])
				.toEqual({ x: start.x + 200, y: start.y });
		});

		test("開始頂点付近では原点に吸着し両軸ガイド（十字）を出す", async ({
			canvas,
		}) => {
			const id = await canvas.drawShape(
				"Polyline",
				{ x: 400, y: 400 },
				{ x: 700, y: 450 },
			);
			await expect(canvas.objectById(id)).toBeVisible();
			const start = (await readVertices(canvas, id))[0];

			// わずかな移動 → 開始頂点へ吸着し両軸ガイド
			await canvas.dragInspecting(
				start,
				{ x: start.x + 4, y: start.y + 3 },
				async () => {
					await expect(canvas.axisLockGuides("x")).toHaveCount(1);
					await expect(canvas.axisLockGuides("y")).toHaveCount(1);
					expect(await canvas.axisLockGuideCoordinates("x")).toEqual([start.x]);
					expect(await canvas.axisLockGuideCoordinates("y")).toEqual([start.y]);
				},
				{ shift: true },
			);

			// 開始頂点に戻っている
			await expect
				.poll(async () => (await readVertices(canvas, id))[0])
				.toEqual({ x: start.x, y: start.y });
		});
	});
});
