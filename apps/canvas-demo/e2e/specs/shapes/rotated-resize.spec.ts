import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * 回転後のリサイズ／回転の中心保持の検証。
 *
 * 既存の resize.spec は未回転の図形のみを対象にしている。回転した図形のリサイズは
 * 「ハンドルを図形のローカル軸に沿って動かす」変換が必要で、ここがリファクタで
 * 壊れやすい（画面軸で計算してしまうと、回転図形を掴むと暴れる典型バグ）。
 *
 * 図形のローカル寸法は rect の width/height 属性、中心は transform の matrix(e,f) に
 * 出るので、それらの不変条件で守る。
 */

/** 図形の画面上の中心（boundingBox から）。回転しても中心＝回転軸なので一致する */
async function screenCenterOf(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }> {
	const box = await canvas.objectById(id).boundingBox();
	if (!box) {
		throw new Error(`図形 ${id} の boundingBox が取得できない`);
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** transform="matrix(a, b, c, d, e, f)" の (e,f)＝中心座標を取り出す */
function matrixCenter(transform: string | null): { x: number; y: number } {
	const nums = transform?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
	if (!nums || nums.length < 6) {
		throw new Error(`transform を解釈できない: ${transform}`);
	}
	return { x: nums[4], y: nums[5] };
}

test.describe("回転後のリサイズ", () => {
	test("90°回転してもリサイズはローカル軸で効く（高さだけ変わり幅は不変）", async ({
		canvas,
	}) => {
		// 中心 (500,260) の 200x120 矩形
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const widthBefore = Number(await rect.getAttribute("width"));
		const heightBefore = Number(await rect.getAttribute("height"));

		// 回転ハンドルを中心の真横（右）へ落とす → ちょうど 90° 回転
		await canvas.dragTransformHandle("rotation", { x: 700, y: 260 });
		await expect
			.poll(() => rect.getAttribute("transform"), {
				message: "回転で transform が変化すること",
			})
			.not.toBe("matrix(1, 0, 0, 1, 500, 260)");

		// bottomCenter ハンドルをローカル外向き（中心→ハンドルの放射方向）へ 80px ドラッグ。
		// 90°回転後、この放射方向は画面上では水平だが、ローカルでは「高さ」軸にあたる。
		const center = await screenCenterOf(canvas, id);
		const handleBox = await canvas.page
			.locator(selectors.transformControl("bottomCenter"))
			.boundingBox();
		if (!handleBox) {
			throw new Error("bottomCenter ハンドルの位置が取得できない");
		}
		const handleCenter = {
			x: handleBox.x + handleBox.width / 2,
			y: handleBox.y + handleBox.height / 2,
		};
		const dx = handleCenter.x - center.x;
		const dy = handleCenter.y - center.y;
		const len = Math.hypot(dx, dy) || 1;
		const target = {
			x: handleCenter.x + (dx / len) * 80,
			y: handleCenter.y + (dy / len) * 80,
		};

		await canvas.dragTransformHandle("bottomCenter", target);

		await expect
			.poll(() => rect.getAttribute("height"), {
				message: "ローカル高さが変わること",
			})
			.not.toBe(String(heightBefore));

		const widthAfter = Number(await rect.getAttribute("width"));
		const heightAfter = Number(await rect.getAttribute("height"));
		// 高さは明確に増え、幅はほぼ不変（ローカル軸でリサイズされた証拠）
		expect(heightAfter).toBeGreaterThan(heightBefore + 20);
		expect(Math.abs(widthAfter - widthBefore)).toBeLessThanOrEqual(2);
	});

	test("回転は中心を動かさない（matrix の e,f が保たれる）", async ({
		canvas,
	}) => {
		const id = await canvas.drawShape(
			"Rectangle",
			{ x: 400, y: 200 },
			{ x: 600, y: 320 },
		);
		const rect = canvas.objectById(id);
		const before = matrixCenter(await rect.getAttribute("transform"));
		const screenBefore = await screenCenterOf(canvas, id);

		// 任意角度に回転（中心の右上あたりへ）
		await canvas.dragTransformHandle("rotation", { x: 640, y: 140 });
		await expect
			.poll(() => rect.getAttribute("transform"))
			.not.toBe("matrix(1, 0, 0, 1, 500, 260)");

		// 回転軸は中心なので、matrix の中心も画面上の中心も動かない
		const after = matrixCenter(await rect.getAttribute("transform"));
		expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
		expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);

		const screenAfter = await screenCenterOf(canvas, id);
		expect(Math.abs(screenAfter.x - screenBefore.x)).toBeLessThanOrEqual(2);
		expect(Math.abs(screenAfter.y - screenBefore.y)).toBeLessThanOrEqual(2);
	});
});
