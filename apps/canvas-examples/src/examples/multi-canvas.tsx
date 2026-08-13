import { Canvas } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";
import { createCanvasParser } from "@jiscribe/canvas/doc";

// This example ships no plugin, so the default parser (every built-in type) is enough.
const canvasParser = createCanvasParser();

// Keep shape IDs unique across the page, so selectors and references cannot collide
const parseSeedDoc = (rectId: string): CanvasDoc => {
	const result = canvasParser.parse(
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
 * Example of embedding several Canvases. Keyboard shortcuts are scoped to the focused
 * Canvas. autoFocus is turned off so nothing steals focus on mount, leaving focus
 * management to the host (a click).
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
