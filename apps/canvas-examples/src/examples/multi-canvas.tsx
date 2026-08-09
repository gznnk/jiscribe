import { Canvas, parseCanvasText } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";

// 図形 ID はページ内で一意にしてセレクタ・参照の衝突を避ける
const parseSeedDoc = (rectId: string): CanvasDoc => {
	const result = parseCanvasText(
		JSON.stringify({
			version: 1,
			root: [
				{ id: rectId, type: "rect", x: 100, y: 100, width: 120, height: 80 },
			],
		}),
	);
	if (result.kind !== "ok") {
		throw new Error(`invalid seed doc: ${result.kind}`);
	}
	return result.doc;
};

const leftDoc = parseSeedDoc("rect-left");
const rightDoc = parseSeedDoc("rect-right");

/**
 * 複数 Canvas 埋め込みの例。キーボードショートカットはフォーカスされた Canvas に
 * スコープされる。マウント時のフォーカス奪取を避けるため autoFocus は切り、
 * フォーカス管理はホスト（クリック）に委ねる。
 */
export function MultiCanvasExample() {
	return (
		<div style={{ display: "flex", width: "100%", height: "100%" }}>
			<div style={{ flex: 1, minWidth: 0 }}>
				<Canvas doc={leftDoc} autoFocus={false} />
			</div>
			<div style={{ flex: 1, minWidth: 0, borderLeft: "1px solid #333" }}>
				<Canvas doc={rightDoc} autoFocus={false} />
			</div>
		</div>
	);
}
