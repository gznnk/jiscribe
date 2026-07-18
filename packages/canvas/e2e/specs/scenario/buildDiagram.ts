/**
 * シナリオ用の「図づくり DSL」。
 *
 * 新しいプリミティブは一切足さず、CanvasDriver が既に提供しテスト済みの操作
 * （drawShape / setColor / typeTextAt / commitText / selectAt / createConnector）
 * だけを合成して、ワイヤーフレーム・アーキテクチャ図・画面遷移図のような
 * 「意味のある成果物」を組み立てられるようにする。
 *
 * 狙い: 個々の操作が緑なら、それらの組み合わせ（=実利用シナリオ）も自動で
 * 組み上がる、ということをコードで示す。
 */

import type { CanvasDriver } from "../../support/CanvasDriver";
import type {
	AnchorId,
	ColorSectionId,
	ToolTitle,
} from "../../support/selectors";

/** 左上原点・幅高さで表す矩形領域（画面座標 = ドキュメント座標） */
export type Rect = { x: number; y: number; width: number; height: number };

/** Rect の中心（クリック・テキスト編集の基準点） */
export const center = (rect: Rect) => ({
	x: rect.x + rect.width / 2,
	y: rect.y + rect.height / 2,
});

/** drawShape が要求する対角2点（from=左上, to=右下）へ変換する */
const corners = (rect: Rect) => ({
	from: { x: rect.x, y: rect.y },
	to: { x: rect.x + rect.width, y: rect.y + rect.height },
});

/**
 * 図形を描き、（任意で）塗りを設定し、ラベルを入れて確定する。
 * 「箱を1つ置く」という人間の1アクションを、テスト済み操作の合成で表現する。
 * 返り値は新規図形の data-id。
 */
export async function placeLabeledShape(
	canvas: CanvasDriver,
	options: { tool: ToolTitle; rect: Rect; label: string; fill?: string },
): Promise<string> {
	const { from, to } = corners(options.rect);
	const shapeId = await canvas.drawShape(options.tool, from, to);

	// drawShape 直後は対象が選択され ObjectMenu が出ているので、その間に塗る。
	if (options.fill) {
		await canvas.setColor("bg-color" satisfies ColorSectionId, options.fill);
	}

	// ObjectMenu が図形を覆ってテキスト編集を阻害しないよう、一度閉じてから入力する
	// （e2e/README.md「ハマりどころ 3」）。
	await canvas.deselect();
	await canvas.typeTextAt(center(options.rect), options.label);
	await canvas.commitText();

	return shapeId;
}

/** source の指定辺の真向かいにある target の辺中点（コネクターのドロップ先） */
const facingEdgePoint = (target: Rect, sourceAnchor: AnchorId) => {
	switch (sourceAnchor) {
		case "rightCenter":
			return { x: target.x, y: target.y + target.height / 2 };
		case "leftCenter":
			return { x: target.x + target.width, y: target.y + target.height / 2 };
		case "bottomCenter":
			return { x: target.x + target.width / 2, y: target.y };
		case "topCenter":
			return { x: target.x + target.width / 2, y: target.y + target.height };
	}
};

/**
 * source 図形の指定辺アンカーから target 図形へコネクターを引く。
 * source を選択 → 作成アンカーから target の対向辺へドラッグ、までを合成する。
 * 返り値は新規コネクターの data-id。
 */
export async function connectShapes(
	canvas: CanvasDriver,
	source: Rect,
	sourceAnchor: AnchorId,
	target: Rect,
): Promise<string> {
	await canvas.selectAt(center(source));
	return canvas.createConnector(
		sourceAnchor,
		facingEdgePoint(target, sourceAnchor),
	);
}
