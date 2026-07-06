import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ポリラインの中点ハンドルによる頂点挿入が「正しい位置・正しい順序」に入ることを守る。
 *
 * polyline-vertex.spec は挿入後の頂点数（3）までで、新頂点がどこに・何番目に入るかは
 * 未検証だった。セグメント0（端点0と端点1の間）の中点ハンドルをドラッグすると、新頂点は
 * その 2 点の「間」（index 1）に、ドロップ位置の座標で入るべき。順序を取り違える
 * （末尾に足す等）／座標がドロップ位置に一致しない退行は数の検証では捕まらない。
 *
 * zoom=1 で points は絶対座標。挿入後の配列を 1 点ずつ照合して固める。
 */

const TOLERANCE_PX = 1.5;

async function readVertices(
	canvas: CanvasDriver,
	id: string,
): Promise<{ x: number; y: number }[]> {
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
}

/** data-id コントロールの中心からコンテンツ座標 to へドラッグする */
async function dragControl(
	canvas: CanvasDriver,
	controlSelector: string,
	to: { x: number; y: number },
) {
	const control = canvas.page.locator(controlSelector);
	await expect(control).toBeVisible();
	const box = await control.boundingBox();
	if (!box) {
		throw new Error(`コントロール ${controlSelector} の位置が取得できない`);
	}
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		10,
	);
}

function expectPointClose(
	actual: { x: number; y: number },
	expected: { x: number; y: number },
	label: string,
): void {
	expect(Math.abs(actual.x - expected.x), `${label} の x`).toBeLessThanOrEqual(
		TOLERANCE_PX,
	);
	expect(Math.abs(actual.y - expected.y), `${label} の y`).toBeLessThanOrEqual(
		TOLERANCE_PX,
	);
}

test.describe("ポリライン頂点挿入の位置と順序", () => {
	test("セグメント0の中点ドラッグは端点の「間」(index 1) にドロップ位置の頂点を入れる", async ({
		canvas,
	}) => {
		// 水平 2 点ポリライン: [(300,300), (600,300)]、セグメント0の中点は (450,300)。
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);
		const before = await readVertices(canvas, id);
		expect(before).toHaveLength(2);

		// 中点ハンドルを (450,420) へドラッグして頂点を挿入する。
		await dragControl(
			canvas,
			`[data-id="${id}"][data-part="vertex-insert:0"]`,
			{ x: 450, y: 420 },
		);

		await expect
			.poll(() => readVertices(canvas, id).then((v) => v.length))
			.toBe(3);

		const after = await readVertices(canvas, id);
		// 端点は不変、新頂点は中央(index 1)にドロップ位置で入る。
		expectPointClose(after[0], { x: 300, y: 300 }, "端点0");
		expectPointClose(after[1], { x: 450, y: 420 }, "挿入頂点");
		expectPointClose(after[2], { x: 600, y: 300 }, "端点1");
	});
});
