import type { CanvasDoc } from "../../src";
import { Canvas, parseCanvasText } from "../../src";

// 2 キャンバス構成。キーボードスコープ（フォーカスされた Canvas だけが
// ショートカットを処理する）の e2e 検証に使う。図形 ID はページ内で一意にして
// セレクタの衝突を避ける。Canvas の契約どおり parseCanvasText を通した doc を渡す。
const parseMultiDoc = (rectId: string): CanvasDoc => {
	const result = parseCanvasText(
		JSON.stringify({
			version: 1,
			root: [
				{ id: rectId, type: "rect", x: 100, y: 100, width: 120, height: 80 },
			],
		}),
	);
	if (result.kind !== "ok") {
		throw new Error(`invalid multi-canvas doc: ${result.kind}`);
	}
	return result.doc;
};

const multiDocA = parseMultiDoc("rect-a");
const multiDocB = parseMultiDoc("rect-b");

/** 複数 Canvas 埋め込みの検証ページ。ホストがフォーカスを管理する想定で autoFocus は切る。 */
export function MultiCanvasApp() {
	return (
		<div className="app" style={{ display: "flex" }}>
			<div data-testid="canvas-a" style={{ flex: 1, minWidth: 0 }}>
				<Canvas doc={multiDocA} autoFocus={false} />
			</div>
			<div data-testid="canvas-b" style={{ flex: 1, minWidth: 0 }}>
				<Canvas doc={multiDocB} autoFocus={false} />
			</div>
		</div>
	);
}
