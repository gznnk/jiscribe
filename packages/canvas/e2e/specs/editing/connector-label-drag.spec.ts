import { test, expect } from "../../fixtures";
import type { CanvasDriver } from "../../support/CanvasDriver";
import { selectors } from "../../support/selectors";

/**
 * コネクターラベルのドラッグ移動（issue #86）の e2e。
 *
 * ラベルボックス（foreignObject[data-kind=connector][data-part=label]）自体を掴んで
 * 動かすと、ドロップ点が経路上の {position（弧長比率）, offset（垂直距離）} に逆算
 * されて label に書き戻る。DOM から読めるのはラベルボックスの位置だけなので、
 * 「掴んだラベルの中心がドロップ点に来る」ことで逆算の正しさを見る。ただし線の
 * すぐ脇（8px 以内）へ落としたときだけは offset が 0 に吸着するので、線上へ寄る。
 *
 * ラベル編集（connector-label.spec.ts）とは別ファイルにしている。
 */

type Vec = { x: number; y: number };

/** ドロップ点とラベル中心のズレ許容値。 */
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

/**
 * 2つの矩形を結ぶコネクターを作り、ラベルを付けて返す。
 * ルーティングは既定（orthogonal）なので経路は途中で折れる。
 */
async function setupConnectorWithLabel(
	canvas: CanvasDriver,
	text: string,
): Promise<{ connectorId: string; onLine: Vec }> {
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
	await canvas.typeTextAt(onLine, text);
	await canvas.commitText();
	return { connectorId, onLine };
}

/** 描画されている経路の頂点列（zoom=1 なので絶対座標）。 */
async function connectorPoints(
	canvas: CanvasDriver,
	connectorId: string,
): Promise<Vec[]> {
	return parsePoints(
		await canvas.objectById(connectorId).getAttribute("points"),
	);
}

type Segment = { start: Vec; end: Vec };

/** 経路の中で最も長いセグメント。内部の点は必ず射影が clamp されない。 */
function longestSegment(points: Vec[]): Segment {
	expect(points.length).toBeGreaterThanOrEqual(2);
	let longest: Segment = { start: points[0], end: points[1] };
	let longestLength = -1;
	for (let i = 0; i < points.length - 1; i++) {
		const length = Math.hypot(
			points[i + 1].x - points[i].x,
			points[i + 1].y - points[i].y,
		);
		if (length > longestLength) {
			longestLength = length;
			longest = { start: points[i], end: points[i + 1] };
		}
	}
	return longest;
}

/** セグメント上の比率 t（0=start, 1=end）の点。 */
function segmentPointAt({ start, end }: Segment, t: number): Vec {
	return {
		x: start.x + (end.x - start.x) * t,
		y: start.y + (end.y - start.y) * t,
	};
}

/** セグメントの終点から進行方向へ distancePx 延長した、線分の外側の点。 */
function pointBeyondEnd(segment: Segment, distancePx: number): Vec {
	const length = Math.hypot(
		segment.end.x - segment.start.x,
		segment.end.y - segment.start.y,
	);
	return segmentPointAt(segment, 1 + distancePx / length);
}

/** セグメントの進行方向に対する左法線（単位ベクトル）。 */
function leftNormal({ start, end }: Segment): Vec {
	const length = Math.hypot(end.x - start.x, end.y - start.y);
	return { x: -(end.y - start.y) / length, y: (end.x - start.x) / length };
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

async function expectLabelCenterNear(
	canvas: CanvasDriver,
	connectorId: string,
	expected: Vec,
): Promise<void> {
	await expect
		.poll(
			async () => distance(await labelCenter(canvas, connectorId), expected),
			{
				message: `ラベル中心が ${JSON.stringify(expected)} に来ること`,
			},
		)
		.toBeLessThanOrEqual(TOLERANCE_PX);
}

/**
 * ラベルボックスの中心を掴んで `to` へドラッグする。
 * 選択中はコントロールハンドルがラベルに重なって pointerdown を奪うため、
 * 掴む前に選択を解除する（未選択のラベルも直接ドラッグできる）。
 */
async function dragLabelTo(
	canvas: CanvasDriver,
	connectorId: string,
	to: Vec,
): Promise<void> {
	await canvas.deselect();
	const box = await labelBoxOf(canvas, connectorId).boundingBox();
	if (!box) {
		throw new Error("ラベルボックスの位置が取得できない");
	}
	await canvas.drag(
		canvas.toContent({ x: box.x + box.width / 2, y: box.y + box.height / 2 }),
		to,
		10,
	);
}

test.describe("コネクターラベルのドラッグ移動", () => {
	test("経路に沿ってドラッグするとラベルがドロップ点へ移る", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.25);
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, dropPoint);
	});

	test("線と垂直方向へドラッグするとラベルが脇に浮く", async ({ canvas }) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const onLine = segmentPointAt(segment, 0.5);
		const normal = leftNormal(segment);
		const dropPoint = {
			x: onLine.x + normal.x * 40,
			y: onLine.y + normal.y * 40,
		};
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, dropPoint);
		// 線上ではなく、離れた位置に置かれている（offset が効いている）。
		expect(
			distance(await labelCenter(canvas, connectorId), onLine),
		).toBeGreaterThan(30);
	});

	test("線のすぐ脇へ落とすと線上に吸着する", async ({ canvas }) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const onLine = segmentPointAt(segment, 0.4);
		const normal = leftNormal(segment);
		// 吸着しきい値（SNAP_THRESHOLD_PX = 8、zoom=1 なのでそのまま world px）の内側。
		const dropPoint = {
			x: onLine.x + normal.x * 5,
			y: onLine.y + normal.y * 5,
		};
		await dragLabelTo(canvas, connectorId, dropPoint);

		// ドロップ点ではなく、その真横の線上へ吸い付く。
		await expectLabelCenterNear(canvas, connectorId, onLine);
	});

	test("1回のドラッグは Undo 1回で元の位置に戻る", async ({ canvas }) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		const originalCenter = await labelCenter(canvas, connectorId);

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.2);
		await dragLabelTo(canvas, connectorId, dropPoint);
		await expectLabelCenterNear(canvas, connectorId, dropPoint);

		// 入力欄にフォーカスが残らないよう選択解除してから Undo。
		await canvas.deselect();
		await canvas.undo();
		await expectLabelCenterNear(canvas, connectorId, originalCenter);
	});

	test("ドラッグ後もラベルのクリック選択・ダブルクリック編集は効く", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.3);
		await dragLabelTo(canvas, connectorId, dropPoint);
		await expectLabelCenterNear(canvas, connectorId, dropPoint);

		// クリックは選択（ラベルスタイルメニューの出現で確認）。
		await canvas.deselect();
		await labelBoxOf(canvas, connectorId).click();
		await expect(
			canvas.page.locator(selectors.objectMenuToggle("label-bg-color")),
		).toBeVisible();

		// ダブルクリックはテキスト編集。
		await canvas.deselect();
		await labelBoxOf(canvas, connectorId).dblclick();
		await expect(canvas.page.locator(selectors.textEditor)).toBeVisible();
		await expect(canvas.textArea()).toHaveValue("Yes");
		await canvas.cancelText();
	});

	test("orthogonal ルーティング（既定）の折れた経路でも任意のセグメントへ置ける", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		// 既定ルーティングは折れ点を持つ（曲がっていなければ前提が崩れている）。
		const points = await connectorPoints(canvas, connectorId);
		expect(points.length).toBeGreaterThanOrEqual(3);

		// 最長セグメントではない最初のセグメントの中点へ落とす。
		const dropPoint = segmentPointAt({ start: points[0], end: points[1] }, 0.5);
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, dropPoint);
	});

	test("未選択のコネクターでもラベルを直接ドラッグでき、ドラッグが選択を兼ねる", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		const sourceHandle = canvas.page.locator(
			`[data-id="${connectorId}"][data-part="endpoint:source"]`,
		);

		await canvas.deselect();
		await expect(sourceHandle).toHaveCount(0);

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.75);
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, dropPoint);
		// 端点ハンドルが出ている＝コネクターが選択された。
		await expect(sourceHandle).toHaveCount(1);
	});

	test("終点の先へドラッグしても経路の終端で止まる", async ({ canvas }) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		const points = await connectorPoints(canvas, connectorId);
		const lastSegment: Segment = {
			start: points[points.length - 2],
			end: points[points.length - 1],
		};
		// 経路の延長線上（＝垂直距離 0）へ大きくはみ出させる。position は [0,1] に
		// clamp されるので終点止まり、offset は 0 のままになる。他のセグメントより
		// 最終セグメントの方が近い距離に収めている。
		const dropPoint = pointBeyondEnd(lastSegment, 150);
		await dragLabelTo(canvas, connectorId, dropPoint);

		await expectLabelCenterNear(canvas, connectorId, lastSegment.end);
	});

	test("Undo で戻した位置は Redo でドラッグ後の位置に戻る", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		const originalCenter = await labelCenter(canvas, connectorId);

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const dropPoint = segmentPointAt(segment, 0.8);
		await dragLabelTo(canvas, connectorId, dropPoint);
		await expectLabelCenterNear(canvas, connectorId, dropPoint);

		// 入力欄にフォーカスが残らないよう選択解除してから Undo / Redo。
		await canvas.deselect();
		await canvas.undo();
		await expectLabelCenterNear(canvas, connectorId, originalCenter);

		await canvas.redo();
		await expectLabelCenterNear(canvas, connectorId, dropPoint);
	});

	test("ドラッグ後にテキストを編集し直しても位置は保たれる", async ({
		canvas,
	}) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");

		// position も offset も既定でない場所へ移す。
		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const normal = leftNormal(segment);
		const onLine = segmentPointAt(segment, 0.3);
		const dropPoint = {
			x: onLine.x + normal.x * 40,
			y: onLine.y + normal.y * 40,
		};
		await dragLabelTo(canvas, connectorId, dropPoint);
		await expectLabelCenterNear(canvas, connectorId, dropPoint);

		// 選択中のコントロールがラベルに重なるので、解除してから再編集する。
		await canvas.deselect();
		const labelBox = labelBoxOf(canvas, connectorId);
		await labelBox.dblclick();
		await expect(canvas.textArea()).toHaveValue("Yes");
		await canvas.textArea().fill("No");
		await canvas.commitText();

		await expect(labelBox).toContainText("No");
		await expectLabelCenterNear(canvas, connectorId, dropPoint);
	});

	test("元の位置へ戻すドラッグで作成時の位置に戻る", async ({ canvas }) => {
		const { connectorId } = await setupConnectorWithLabel(canvas, "Yes");
		// ドラッグ前の中心＝ラベルを作ったダブルクリック点のアンカー。
		const createdCenter = await labelCenter(canvas, connectorId);

		const segment = longestSegment(await connectorPoints(canvas, connectorId));
		const normal = leftNormal(segment);
		const onLine = segmentPointAt(segment, 0.2);
		const awayPoint = {
			x: onLine.x + normal.x * 30,
			y: onLine.y + normal.y * 30,
		};
		await dragLabelTo(canvas, connectorId, awayPoint);
		await expectLabelCenterNear(canvas, connectorId, awayPoint);

		await dragLabelTo(canvas, connectorId, createdCenter);
		await expectLabelCenterNear(canvas, connectorId, createdCenter);
	});
});
