import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";

/**
 * 矢印の色がコネクターの線色に追従することを検証する spec。
 *
 * 矢印は color={strokeColor}（= 線と同じ解決済みストローク色）で塗られる（Connector.tsx）。
 * connector-style.spec は視覚線の線色や、コピー時に線色が引き継がれることは守るが、線色を
 * 変えたとき *矢印 polygon の塗り* が線と一致することは未検証だった。ここがずれると線は赤・
 * 矢印は黒のような不整合になる。
 *
 * 線色を設定して、視覚線の stroke と矢印 polygon の fill がともに同じ色になることを守る。
 * 色は emotion CSS で当たるため computed style（ブラウザ正規化済み rgb）で比較する。
 */

type ConnectorColors = { arrowFill: string | null; lineStroke: string | null };

/** コネクターの矢印 fill と視覚線 stroke を computed style で読む */
async function readColors(
	canvas: CanvasDriver,
	id: string,
): Promise<ConnectorColors> {
	return canvas.page.evaluate((cid) => {
		const arrow = document.querySelector(
			`polygon[data-kind="connector"][data-id="${cid}"]`,
		);
		const hit = document.querySelector(
			`polyline[data-kind="connector"][data-id="${cid}"]`,
		);
		const parent = hit?.parentElement ?? null;
		const visual = parent
			? [...parent.querySelectorAll("polyline")].find(
					(el) => !el.hasAttribute("data-kind") && !el.hasAttribute("data-id"),
				)
			: null;
		return {
			arrowFill: arrow ? getComputedStyle(arrow).fill : null,
			lineStroke: visual ? getComputedStyle(visual).stroke : null,
		};
	}, id);
}

async function buildHorizontalConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 200 }, { x: 460, y: 300 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 760, y: 200 }, { x: 920, y: 300 });
	await canvas.deselect();

	await canvas.selectAt({ x: 380, y: 250 });
	const id = await canvas.createConnector("rightCenter", { x: 840, y: 250 });
	await canvas.deselect();
	return id;
}

test.describe("コネクターの矢印色の追従", () => {
	test("線色を設定すると視覚線と終端矢印が同じ色になる", async ({ canvas }) => {
		const connectorId = await buildHorizontalConnector(canvas);

		// 既定色（auto→テーマ前景）の時点で、矢印 fill と線 stroke は一致しているはず。
		const initial = await readColors(canvas, connectorId);
		expect(initial.arrowFill).toBeTruthy();
		expect(initial.lineStroke).toBeTruthy();
		expect(
			initial.arrowFill,
			"既定でも矢印 fill と線 stroke が一致すること",
		).toBe(initial.lineStroke);

		// 線色を明示的に赤へ変更する。
		const red = "#e11d48";
		await canvas.clickAt({ x: 610, y: 250 });
		await expect(
			canvas.page.locator('[data-part="toggle:line-color"]'),
		).toBeVisible();
		await canvas.setColor("line-color", red);
		await canvas.deselect();

		const expected = await canvas.normalizeColor(red);
		await expect
			.poll(async () => (await readColors(canvas, connectorId)).lineStroke, {
				message: "線色の変更が視覚線へ反映されること",
			})
			.toBe(expected);

		const after = await readColors(canvas, connectorId);
		// 線も矢印も設定した赤になる（矢印が線色に追従）。
		expect(after.lineStroke, "視覚線が指定色になること").toBe(expected);
		expect(after.arrowFill, "終端矢印の塗りが線色に追従すること").toBe(
			expected,
		);
	});
});
