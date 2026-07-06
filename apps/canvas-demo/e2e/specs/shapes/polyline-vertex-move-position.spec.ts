import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * ポリライン頂点ドラッグの「移動先座標」を精密に守る。
 *
 * polyline-vertex-move.spec は points が変化すること・undo/redo で往復することまでで、
 * 動かした頂点がドロップ位置ちょうどに来るか・他頂点が不変かは未検証だった。
 * 頂点ハンドルはその頂点上にあるためグラブオフセット 0 で、ドラッグ先＝新しい頂点座標に
 * なるはず。掴んだ頂点だけが移動し、他頂点は動かないことを points で 1 点ずつ固める。
 * カーソルへ飛びつかない・別頂点を巻き込まない・座標がズレる退行で落ちる。
 *
 * zoom=1 で points は絶対座標。
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

test.describe("ポリライン頂点移動の移動先座標", () => {
	test("頂点(index 1)をドラッグするとその頂点だけがドロップ位置に来る", async ({
		canvas,
	}) => {
		// 水平 2 点ポリライン: [(300,300), (600,300)]。
		const id = await canvas.drawShape(
			"Polyline",
			{ x: 300, y: 300 },
			{ x: 600, y: 300 },
		);

		// 右端の頂点(index 1)を (650,180) へ動かす（ハンドルは頂点上なのでオフセット 0）。
		await dragControl(canvas, `[data-id="${id}"][data-part="vertex:1"]`, {
			x: 650,
			y: 180,
		});

		await expect
			.poll(async () => (await readVertices(canvas, id))[1]?.y, {
				message: "頂点1 が移動すること",
			})
			.not.toBe(300);

		const after = await readVertices(canvas, id);
		expect(after).toHaveLength(2);
		// 掴んだ頂点はドロップ位置ちょうど、もう一方は不変。
		expectPointClose(after[0], { x: 300, y: 300 }, "頂点0（不変）");
		expectPointClose(after[1], { x: 650, y: 180 }, "頂点1（移動先）");
	});
});
