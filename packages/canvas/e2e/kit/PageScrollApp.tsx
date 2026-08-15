import type { CanvasDoc } from "../../src";
import { Canvas } from "../../src";
import { createCanvasParser } from "../../src/doc";

// Page for verifying gestureHandling="cooperative": a canvas embedded in a
// document that scrolls, the way a landing page or an article figure embeds one.
// The spacers make the document taller than the window, so window.scrollY is a
// direct readout of whether the wheel reached the page or was trapped by the canvas.
const canvasParser = createCanvasParser();

const parseEmbeddedDoc = (): CanvasDoc => {
	const result = canvasParser.parse(
		JSON.stringify({
			version: 1,
			root: [
				{
					id: "rect-embedded",
					type: "rect",
					x: 100,
					y: 100,
					width: 120,
					height: 80,
				},
			],
		}),
	);
	if (result.kind !== "ok") {
		throw new Error(`invalid page-scroll doc: ${result.kind}`);
	}
	return result.doc;
};

const embeddedDoc = parseEmbeddedDoc();

/** Spacer tall enough that the page scrolls in both directions around the canvas. */
const spacerStyle = { height: "150vh" } as const;

export function PageScrollApp() {
	return (
		<div data-testid="scrolling-page">
			<div data-testid="spacer-above" style={spacerStyle} />
			<div data-testid="embedded-canvas" style={{ height: "60vh" }}>
				<Canvas
					doc={embeddedDoc}
					gestureHandling="cooperative"
					autoFocus={false}
				/>
			</div>
			<div data-testid="spacer-below" style={spacerStyle} />
		</div>
	);
}
