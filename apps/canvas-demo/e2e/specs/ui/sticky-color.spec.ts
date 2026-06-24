import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * Sticky のプリセット色選択。
 *
 * Sticky は他図形と違い CSS 入力のない専用カラーメニュー（StickyColorMenu, プリセットのみ）を
 * 持つが、これだけ未カバーだった。プリセットのスウォッチを押すと本体の塗りが変わり、
 * 選択解除→再選択しても保持されることを守る。
 *
 * Sticky 本体は <g> 内の 2 つ目の polygon（1 つ目は影）で、塗りは SVG 属性 fill に乗る。
 */
async function stickyFill(
	canvas: CanvasDriver,
	id: string,
): Promise<string | null> {
	return canvas.page.evaluate((stickyId) => {
		const group = document.querySelector(`[data-id="${stickyId}"]`);
		const polygons = group ? [...group.querySelectorAll("polygon")] : [];
		// 1 つ目は影、2 つ目が本体。
		const main = polygons[1] ?? polygons[0];
		return main?.getAttribute("fill") ?? null;
	}, id);
}

test.describe("Sticky のプリセット色", () => {
	test("プリセットスウォッチで本体の塗りが変わり、選択解除後も保持される", async ({
		canvas,
	}) => {
		const id = await canvas.placeShape("Sticky");
		const box = await canvas.objectById(id).boundingBox();
		if (!box) {
			throw new Error("Sticky の boundingBox が取得できない");
		}
		const center = canvas.toContent({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});
		await canvas.selectAt(center);

		// 既定は Yellow(#fef9c3)。Blue(#bfdbfe) のスウォッチに変える。
		expect(await stickyFill(canvas, id)).toBe("#fef9c3");

		await canvas.openObjectMenu("sticky-color");
		await canvas.page.click(selectors.objectMenuSet("fill", "#bfdbfe"));
		await expect
			.poll(() => stickyFill(canvas, id), {
				message: "プリセット選択で本体の塗りが変わること",
			})
			.toBe("#bfdbfe");

		// 選択解除→再選択しても保持される。
		await canvas.deselect();
		await canvas.selectAt(center);
		expect(await stickyFill(canvas, id)).toBe("#bfdbfe");
	});
});
