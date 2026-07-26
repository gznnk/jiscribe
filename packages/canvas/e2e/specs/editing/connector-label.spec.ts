import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コネクターのラベル（label.text）編集の e2e。
 *
 * - ラベルが無いコネクターは線上のダブルクリックでラベル編集を開始できる
 * - 入力・確定すると経路上に水平ラベルが描かれる（foreignObject[data-kind=connector]）
 *   位置はダブルクリックした点（経路中点ではない）。Escape でキャンセルすれば何も残らない
 * - ラベルがあるときはラベルボックスのダブルクリックだけが再編集を開始する
 *   （線のダブルクリックは選択のみ。編集中の線タップはラベル外として確定）
 * - 素のラベルは空文字で確定すると取り除かれる
 * - スタイル付きラベルは空文字にしてもスタイルを保持し、再入力で復元できる
 */

type Vec = { x: number; y: number };

/** ダブルクリック点とラベル中心のズレ許容値。 */
const TOLERANCE_PX = 2;

function parsePoints(attr: string | null): Vec[] {
	if (!attr) {
		throw new Error("points 属性が取得できない");
	}
	return attr
		.trim()
		.split(/\s+/)
		.map((pair) => {
			const [x, y] = pair.split(",").map(Number);
			return { x, y };
		});
}

/** コネクターの最初のセグメント中点（必ず線上の点）を返す。 */
async function pointOnConnector(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
	expect(points.length).toBeGreaterThanOrEqual(2);
	return {
		x: (points[0].x + points[1].x) / 2,
		y: (points[0].y + points[1].y) / 2,
	};
}

/** ラベルボックス（foreignObject 内側の LabelBox div）のロケーター。 */
function labelBoxOf(canvas: CanvasDriver, connectorId: string) {
	return canvas.page
		.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
		.locator("div")
		.first();
}

/** 経路の弧長比率 t（0=source, 1=target）に当たる線上の点。 */
function pointAtRatio(points: Vec[], t: number): Vec {
	const lengths = points
		.slice(1)
		.map((point, i) =>
			Math.hypot(point.x - points[i].x, point.y - points[i].y),
		);
	const target = lengths.reduce((sum, length) => sum + length, 0) * t;

	let traveled = 0;
	for (let i = 0; i < lengths.length; i++) {
		if (traveled + lengths[i] >= target) {
			const ratio = (target - traveled) / lengths[i];
			return {
				x: points[i].x + (points[i + 1].x - points[i].x) * ratio,
				y: points[i].y + (points[i + 1].y - points[i].y) * ratio,
			};
		}
		traveled += lengths[i];
	}
	return points[points.length - 1];
}

function distance(a: Vec, b: Vec): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/** ラベルボックスの中心（コンテンツ座標）。 */
async function labelCenter(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const box = await labelBoxOf(canvas, connectorId).boundingBox();
	if (!box) {
		throw new Error("ラベルボックスの位置が取得できない");
	}
	return canvas.toContent({
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
	});
}

/**
 * ラベルボックスから十分離れた線上の点。ラベルはダブルクリックした位置に作られるので、
 * 「線（ラベル外）のダブルクリック」を試すにはラベルの下でない点を選ぶ必要がある。
 */
async function bareLinePoint(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec> {
	const points = parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
	const point = pointAtRatio(points, 0.8);
	expect(
		distance(point, await labelCenter(canvas, connectorId)),
	).toBeGreaterThan(40);
	return point;
}

/** 2つの矩形を結ぶ、ラベルの無いコネクターを作って返す。 */
async function setupConnector(canvas: CanvasDriver): Promise<string> {
	await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
	await canvas.deselect();
	await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
	await canvas.deselect();

	await canvas.selectAt({ x: 400, y: 200 });
	const connectorId = await canvas.createConnector("rightCenter", {
		x: 715,
		y: 350,
	});
	await canvas.deselect();
	return connectorId;
}

/**
 * 2つの矩形を結ぶコネクターを作り、ラベルを付けて返す。
 * （多くのテストで同じ前置きを踏むためのヘルパ。）
 */
async function setupConnectorWithLabel(
	canvas: CanvasDriver,
	text: string,
): Promise<{ connectorId: string; onLine: Vec }> {
	const connectorId = await setupConnector(canvas);

	const onLine = await pointOnConnector(canvas, connectorId);
	await canvas.typeTextAt(onLine, text);
	await canvas.commitText();
	return { connectorId, onLine };
}

test.describe("コネクターのラベル", () => {
	test("ダブルクリックでラベルを追加・再編集・削除できる", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		const labelLocator = canvas.page.locator(
			`foreignObject[data-kind=connector][data-id="${connectorId}"]`,
		);

		// 追加: 線上をダブルクリック → 入力 → 確定。
		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();
		await expect(labelLocator).toContainText("Yes");

		// 再編集: ラベルボックスのダブルクリックで既存テキストがプリフィルされる。
		await labelBoxOf(canvas, connectorId).dblclick();
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textArea()).toHaveValue("Yes");

		// 削除: 空文字で確定するとラベルごと消える。
		await canvas.textArea().fill("");
		await canvas.commitText();
		await expect(labelLocator).toHaveCount(0);
	});

	test("ラベルはダブルクリックした位置に作られる", async ({ canvas }) => {
		const connectorId = await setupConnector(canvas);
		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		// 中点に置かれても通ってしまわないよう、中点から十分離れた線上の点を選ぶ。
		const clickPoint = pointAtRatio(points, 0.25);
		expect(distance(clickPoint, pointAtRatio(points, 0.5))).toBeGreaterThan(30);

		await canvas.typeTextAt(clickPoint, "Yes");
		await canvas.commitText();

		await expect
			.poll(
				async () =>
					distance(await labelCenter(canvas, connectorId), clickPoint),
				{ message: "ラベル中心がダブルクリック点に来ること" },
			)
			.toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("ダブルクリック後に Escape で抜けるとラベルは作られない", async ({
		canvas,
	}) => {
		const connectorId = await setupConnector(canvas);
		const points = parsePoints(
			await canvas.objectById(connectorId).getAttribute("points"),
		);
		const labelLocator = canvas.page.locator(
			`foreignObject[data-kind=connector][data-id="${connectorId}"]`,
		);

		// 中点以外で編集を開始し、入力したままキャンセルする。
		await canvas.typeTextAt(pointAtRatio(points, 0.25), "Yes");
		await canvas.cancelText();
		await expect(labelLocator).toHaveCount(0);

		// キャンセルは痕跡を残さないので、別の位置のダブルクリックで作り直せる。
		await canvas.deselect();
		const clickPoint = pointAtRatio(points, 0.75);
		await canvas.typeTextAt(clickPoint, "Back");
		await canvas.commitText();
		await expect(labelLocator).toContainText("Back");
		await expect
			.poll(
				async () =>
					distance(await labelCenter(canvas, connectorId), clickPoint),
				{ message: "作り直したラベルも 2 回目のダブルクリック点に来ること" },
			)
			.toBeLessThanOrEqual(TOLERANCE_PX);
	});

	test("スタイリングUIでラベルの背景色を変更できる（label.fill）", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		// ラベルを付ける（label-style メニューはラベルがある時だけ出る）。
		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();

		// コネクターを選択してラベル背景色メニューを開き、背景色スウォッチを押す。
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));

		// ラベルボックスの背景がドット記法経由で更新される（label.fill → #dc2626）。
		const labelBox = canvas.page
			.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
			.locator("div")
			.first();
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");
	});

	test("スタイリングUIでラベルの枠線スタイル（太さ・破線）を変更できる", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();

		// 枠線スタイルメニューを開き、太さを 2 にして破線を選ぶ。
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-border-style");
		await canvas.page
			.locator('[data-testid="menu-number-input:label.strokeWidth"]')
			.fill("2");
		await canvas.page.click(
			selectors.objectMenuSet("label.strokeDashType", "dashed"),
		);

		const labelBox = canvas.page
			.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
			.locator("div")
			.first();
		await expect(labelBox).toHaveCSS("border-top-style", "dashed");
		await expect(labelBox).toHaveCSS("border-top-width", "2px");
	});

	test("スタイリングUIでラベルを太字にできる（label.fontWeight）", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();

		// 太字トグルはドロップダウン無しの直接ボタン（gesture 経路の set）。
		await canvas.clickAt(onLine);
		await canvas.page.click(
			selectors.objectMenuSet("label.fontWeight", "bold"),
		);

		const labelBox = canvas.page
			.locator(`foreignObject[data-kind=connector][data-id="${connectorId}"]`)
			.locator("div")
			.first();
		await expect(labelBox).toHaveCSS("font-weight", "700");
	});

	test("コネクター選択中に Enter でラベル編集を開始でき、Escape でキャンセルできる", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		// 線をクリックしてコネクターを選択 → Enter でラベル編集開始（StartTextEditCommand）。
		// 単一クリックはダブルクリック判定のため認識が遅延するので、選択が確定した
		// シグナル（ラベルスタイルメニューの出現）を待ってから Enter を送る。
		await canvas.clickAt(onLine);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("label-bg-color")),
		).toBeVisible();
		await canvas.page.keyboard.press("Enter");
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		// 既存ラベルがプリフィルされる。
		await expect(canvas.textArea()).toHaveValue("Yes");

		// Escape はキャンセル。テキストを書き換えても破棄され、元のラベルが残る。
		await canvas.textArea().fill("Changed");
		await canvas.cancelText();
		await expect(labelBoxOf(canvas, connectorId)).toContainText("Yes");
	});

	test("スタイリングUIでラベルの文字色を変更できる（label.fontColor）", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-font-color");
		await canvas.page.click(
			selectors.objectMenuSet("label.fontColor", "#3b82f6"),
		);

		await expect(labelBoxOf(canvas, connectorId)).toHaveCSS(
			"color",
			"rgb(59, 130, 246)",
		);
	});

	test("スタイリングUIでラベルのフォントサイズを変更できる（label.fontSize）", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-font-size");
		await canvas.setNumberInput("label.fontSize", 28);

		await expect(labelBoxOf(canvas, connectorId)).toHaveCSS(
			"font-size",
			"28px",
		);
	});

	test("スタイリングUIでラベルの枠線色を変更できる（label.stroke）", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		// 枠線は太さ > 0 のときだけ見えるので、まず太さを与えてから色を選ぶ。
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-border-style");
		await canvas.setNumberInput("label.strokeWidth", 3);
		await canvas.openObjectMenu("label-border-color");
		await canvas.page.click(selectors.objectMenuSet("label.stroke", "#3b82f6"));

		const labelBox = labelBoxOf(canvas, connectorId);
		await expect(labelBox).toHaveCSS("border-top-width", "3px");
		await expect(labelBox).toHaveCSS("border-top-color", "rgb(59, 130, 246)");
	});

	test("太字はトグルで解除できる（bold → normal で 400 に戻る）", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);
		const labelBox = labelBoxOf(canvas, connectorId);

		await canvas.clickAt(onLine);
		await canvas.page.click(
			selectors.objectMenuSet("label.fontWeight", "bold"),
		);
		await expect(labelBox).toHaveCSS("font-weight", "700");

		// 太字ボタンは状態で data-id が反転する直接トグル。もう一度押すと normal に戻る。
		await canvas.page.click(
			selectors.objectMenuSet("label.fontWeight", "normal"),
		);
		await expect(labelBox).toHaveCSS("font-weight", "400");
	});

	test("複数スタイルを適用後、テキストを再編集してもスタイルが保持される", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);
		const labelBox = labelBoxOf(canvas, connectorId);

		// 太字＋背景色を適用。
		await canvas.clickAt(onLine);
		await canvas.page.click(
			selectors.objectMenuSet("label.fontWeight", "bold"),
		);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
		await expect(labelBox).toHaveCSS("font-weight", "700");
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");

		// ラベルボックスから再編集してテキストだけ変更（空文字でないので label は維持されるはず）。
		await labelBox.dblclick();
		await expect(canvas.textArea()).toHaveValue("Yes");
		await canvas.textArea().fill("No");
		await canvas.commitText();

		await expect(labelBox).toContainText("No");
		await expect(labelBox).toHaveCSS("font-weight", "700");
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");
	});

	test("ラベル（テキスト・スタイル）がコピー＆ペーストで引き継がれる", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);

		// ラベルに背景色を付けてからコピペし、複製側にテキスト＋スタイルが残るか見る。
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
		await expect(labelBoxOf(canvas, connectorId)).toHaveCSS(
			"background-color",
			"rgb(220, 38, 38)",
		);

		// メニューを閉じ、フォーカスをキャンバスへ戻してから全選択＆コピペ。
		await canvas.deselect();
		await canvas.selectAll();
		await canvas.copy();
		await canvas.paste();

		// コネクターが 2 本になるのを待ち、複製側の id を得る。
		await expect
			.poll(
				async () =>
					(await canvas.page.locator(selectors.connectorPolyline).all()).length,
			)
			.toBeGreaterThanOrEqual(2);
		const allIds = await canvas.page.evaluate((sel) => {
			return [...document.querySelectorAll(sel)]
				.map((el) => el.getAttribute("data-id"))
				.filter((id): id is string => id !== null);
		}, selectors.connectorPolyline);
		const clonedId = allIds.find((id) => id !== connectorId);
		if (!clonedId) {
			throw new Error("複製されたコネクターの data-id が取得できない");
		}

		const clonedLabel = labelBoxOf(canvas, clonedId);
		await expect(clonedLabel).toContainText("Yes");
		await expect(clonedLabel).toHaveCSS("background-color", "rgb(220, 38, 38)");
	});

	test("ラベルのスタイル変更は Undo で元に戻る", async ({ canvas }) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);
		const labelBox = labelBoxOf(canvas, connectorId);

		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");

		// 入力欄にフォーカスが残らないよう選択解除してから Undo。
		await canvas.deselect();
		await canvas.undo();

		// 背景色が赤でなくなる（既定＝キャンバス地色へ戻る）。ラベル自体は残る。
		await expect(labelBox).toContainText("Yes");
		await expect(labelBox).not.toHaveCSS(
			"background-color",
			"rgb(220, 38, 38)",
		);
	});

	test("スタイル付きラベルを空文字で消しても、再入力でスタイルが復元される", async ({
		canvas,
	}) => {
		const { connectorId, onLine } = await setupConnectorWithLabel(
			canvas,
			"Yes",
		);
		const labelBox = labelBoxOf(canvas, connectorId);

		// 背景色を付ける。
		await canvas.clickAt(onLine);
		await canvas.openObjectMenu("label-bg-color");
		await canvas.page.click(selectors.objectMenuSet("label.fill", "#dc2626"));
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");

		// ラベルボックスから編集し、テキストを空にして確定 → ラベルは見た目上消える（text="" で非表示）。
		await labelBox.dblclick();
		await expect(canvas.textArea()).toHaveValue("Yes");
		await canvas.textArea().fill("");
		await canvas.commitText();
		await expect(labelBox).toHaveCount(0);

		// ラベルが無くなったので、線のダブルクリックでテキストを入れ直せる（プリフィルは空）。
		const screen = canvas.toScreen(onLine);
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textArea()).toHaveValue("");
		await canvas.page.keyboard.type("Back");
		await canvas.commitText();

		// テキストが戻り、以前の背景色スタイルも復元されている。
		await expect(labelBox).toContainText("Back");
		await expect(labelBox).toHaveCSS("background-color", "rgb(220, 38, 38)");
	});

	test("ラベルがあるコネクターは、線のダブルクリックでは編集にならない（選択のみ）", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		await canvas.deselect();

		// 線上（ラベルボックスの外）をダブルクリック → コネクターは選択されるがエディタは開かない。
		const screen = canvas.toScreen(await bareLinePoint(canvas, connectorId));
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("line-style")),
		).toBeVisible();
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
	});

	test("編集中に線をダブルクリックするとラベル外タップとして確定され、余分なコミットは積まれない（#102）", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		const labelBox = labelBoxOf(canvas, connectorId);
		await expect(labelBox).toContainText("Yes");
		const offLabel = await bareLinePoint(canvas, connectorId);

		// ラベルボックスから編集を開始し、テキストを書き換える（まだ確定しない）。
		await labelBox.dblclick();
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textArea()).toHaveValue("Yes");
		await canvas.textArea().fill("No");

		// 確定せずに線上をダブルクリック → ラベル外のタップなので "No" が確定され、
		// エディタは再オープンしない（ラベルがある線のダブルクリックは選択のみ）。
		const screen = canvas.toScreen(offLabel);
		await canvas.page.mouse.dblclick(screen.x, screen.y);
		await expect(canvas.page.locator(selectors.textEditor)).toHaveCount(0);
		await expect(labelBox).toContainText("No");

		// コミットは「ラベル追加」と「Yes→No」の 2 つだけ（先頭の pressed と
		// doubleClick で二重にコミットされていれば、1 回目の Undo が "No" のまま
		// になる）。Undo 2 回でラベルごと消える。
		await canvas.deselect();
		await canvas.undo();
		await expect(labelBox).toContainText("Yes");
		await canvas.undo();
		await expect(labelBox).toHaveCount(0);
	});

	test("ラベルが無いコネクターにはラベルスタイルメニューが出ない", async ({
		canvas,
	}) => {
		await canvas.drawShape("Rectangle", { x: 300, y: 150 }, { x: 500, y: 250 });
		await canvas.deselect();
		await canvas.drawShape("Rectangle", { x: 700, y: 300 }, { x: 900, y: 400 });
		await canvas.deselect();

		await canvas.selectAt({ x: 400, y: 200 });
		const connectorId = await canvas.createConnector("rightCenter", {
			x: 715,
			y: 350,
		});
		await canvas.deselect();

		// ラベル未設定のコネクターを選択 → label 系メニューは現れない。
		// 先に line-style トグルの出現で「選択済み」を確認してから label トグルの不在を検証する。
		const onLine = await pointOnConnector(canvas, connectorId);
		await canvas.clickAt(onLine);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("line-style")),
		).toBeVisible();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("label-bg-color")),
		).toHaveCount(0);

		// ラベルを付けて選択し直すと現れる。選択解除を挟んで連続クリックの合体を避ける。
		await canvas.deselect();
		await canvas.typeTextAt(onLine, "Yes");
		await canvas.commitText();
		await canvas.clickAt(onLine);
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("label-bg-color")),
		).toBeVisible();
	});
});
