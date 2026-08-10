import type { CanvasDoc } from "../../src";
import { Canvas, parseCanvasText } from "../../src";

// Two-canvas setup for verifying keyboard scoping, where only the focused Canvas handles
// shortcuts. Shape IDs are unique across the page so selectors cannot collide, and the doc goes
// through parseCanvasText as the Canvas contract requires.
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

/** Page for verifying multiple embedded Canvases. autoFocus is off, as the host owns focus. */
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
