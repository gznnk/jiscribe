import type { CanvasDoc } from "../../schemas/canvas/CanvasDoc";

/**
 * 2つの CanvasDoc が描画内容として同一かを判定する。
 * $schema は描画ステートと無関係なファイルメタデータのため、比較から除外する。
 *
 * 実装は固定キー順での JSON 文字列比較。トップレベルのキー順はここで固定するが、
 * root 内の各オブジェクト（コネクター含む）はそれぞれのキー挿入順のまま直列化されるため、
 * 内容が同じでもキー順が異なる doc は「異なる」と判定されうる（false negative）。
 * この性質上、「同一と判定できたら処理をスキップする」最適化にのみ使用し、
 * 厳密な同値判定が必要な用途には使用しないこと。
 */
export function isSameCanvasDocContent(
	docA: CanvasDoc,
	docB: CanvasDoc,
): boolean {
	return stringifyDocContent(docA) === stringifyDocContent(docB);
}

const stringifyDocContent = (doc: CanvasDoc): string =>
	JSON.stringify({
		version: doc.version,
		root: doc.root,
	});
