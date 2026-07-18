import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コネクターの線種（dashType）と線幅（strokeWidth）がコピー＆ペーストで引き継がれることを守る。
 *
 * connector-copy-paste-style.spec は startArrow と線色の引き継ぎを守るが、線種・線幅が
 * クリップボード経由（ConnectorMapper のシリアライズ往復）で保たれるかは未検証だった。
 * シリアライズから漏れると複製は既定（実線・strokeWidth 1/2）に戻る。
 *
 * 破線パターンは getStrokeDasharray で線幅から算出される（dashed = 4·sw 4·sw）。線種=dashed・
 * strokeWidth=6 に設定してコピペし、複製側の dasharray が「24 24」になることで、線種と線幅の
 * 両方が引き継がれていることを一度に守る（既定 strokeWidth=2 なら 8 8、実線なら dasharray なし）。
 */

async function connectorIds(canvas: CanvasDriver): Promise<string[]> {
	return canvas.page.evaluate(
		(sel) =>
			[...document.querySelectorAll(sel)]
				.map((el) => el.getAttribute("data-id"))
				.filter((id): id is string => id !== null),
		selectors.connectorPolyline,
	);
}

/** コネクター id の視覚線（親配下の data 属性なし polyline）の dasharray 数値列 */
async function dashNumbers(
	canvas: CanvasDriver,
	id: string,
): Promise<number[]> {
	const raw = await canvas.page.evaluate((cid) => {
		const hitEl = document.querySelector(
			`polyline[data-kind="connector"][data-id="${cid}"]`,
		);
		const parent = hitEl?.parentElement ?? null;
		const visualEl = parent
			? [...parent.querySelectorAll("polyline")].find(
					(el) => !el.hasAttribute("data-kind") && !el.hasAttribute("data-id"),
				)
			: null;
		if (!visualEl) {
			return null;
		}
		const attr = visualEl.getAttribute("stroke-dasharray");
		return attr ?? getComputedStyle(visualEl).strokeDasharray;
	}, id);
	if (!raw || raw === "none") {
		return [];
	}
	return [...raw.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

test("コピー＆ペーストはコネクターの線種（dashed）と線幅（strokeWidth）を引き継ぐ", async ({
	canvas,
}) => {
	// 上下 2 矩形を縦コネクターで接続。
	await canvas.drawShape("Rectangle", { x: 400, y: 150 }, { x: 600, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 400, y: 400 }, { x: 600, y: 500 });
	await canvas.deselect();
	await canvas.selectAt({ x: 500, y: 200 });
	const srcConnectorId = await canvas.createConnector("bottomCenter", {
		x: 500,
		y: 400,
	});
	await canvas.deselect();

	// コネクターを選択して線種=dashed、線幅=6 に設定する。
	await canvas.clickAt({ x: 500, y: 325 });
	await expect(
		canvas.page.locator(selectors.objectMenuToggle("line-style")),
	).toBeVisible();
	await canvas.setStrokeDashType("line-style", "dashed");
	await canvas.setNumberInput("strokeWidth", 6);

	// 設定が乗ったこと（dashed×sw6 = 24 24）を確認してからコピペ。
	await expect
		.poll(() => dashNumbers(canvas, srcConnectorId), {
			message: "元コネクターが dashed×sw6（24 24）になること",
		})
		.toEqual([24, 24]);

	// 入力欄フォーカスを外してからキャンバスで全選択 → コピー → ペースト。
	await canvas.deselect();
	await canvas.selectAll();
	await canvas.copy();
	await canvas.paste();
	await expect.poll(async () => (await connectorIds(canvas)).length).toBe(2);

	const clonedConnectorId = (await connectorIds(canvas)).find(
		(id) => id !== srcConnectorId,
	);
	if (!clonedConnectorId) {
		throw new Error("複製されたコネクターの data-id が取得できない");
	}

	// 複製コネクターも線種=dashed と線幅=6 を保持する（dasharray が 24 24）。
	expect(
		await dashNumbers(canvas, clonedConnectorId),
		"複製コネクターが線種・線幅を引き継ぐこと（dashed×sw6 = 24 24）",
	).toEqual([24, 24]);
});
