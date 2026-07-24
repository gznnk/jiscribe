import { Canvas } from "@workspace/canvas";
import type { CanvasDoc } from "@workspace/canvas";

const emptyDoc: CanvasDoc = { version: 1, root: [] };

/**
 * 最小構成: 空ドキュメントで Canvas をマウントするだけの例。
 * テーマ・コールバック等はすべて省略可能で、既定は dark テーマ・非制御動作。
 */
export function MinimalExample() {
	return <Canvas doc={emptyDoc} />;
}
