// @vitest-environment jsdom

import type { CanvasDoc } from "@jiscribe/doc/model/canvas/CanvasDoc";
import type { ViewDoc } from "@jiscribe/doc/model/canvas/ViewDoc";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { canvasToState } from "../../states/canvas/CanvasMapper";
import { CanvasThumbnail } from "../CanvasThumbnail";
import { defaultCanvasRegistries } from "../registries";
import { calcFitViewport } from "../utils/calcFitViewport";

/**
 * A thumbnail is a fit and nothing else: it has no reducer, so no
 * APPLY_INITIAL_VIEW ever reaches it, and its own `padding` prop is the only
 * margin it knows. A document's `view` is therefore ignored — its framing, its
 * padding and its wall alike — which is deliberate (a gallery wants every tile
 * framed the same way) but is stated nowhere and has never been checked.
 *
 * Pinned here so that wiring `view` into the thumbnail becomes a decision
 * somebody makes rather than something that quietly happens.
 */

const roots: { unmount: () => void }[] = [];

/** Content spanning 0,0..400,240; the same extent the parity fixture uses. */
const twoRectsDocWith = (view?: ViewDoc): CanvasDoc =>
	({
		version: 1,
		...(view !== undefined ? { view } : {}),
		root: [
			{ id: "rect-1", type: "rect", x: 0, y: 0, width: 100, height: 60 },
			{ id: "rect-2", type: "rect", x: 300, y: 200, width: 100, height: 40 },
		],
	}) as unknown as CanvasDoc;

/** The `viewBox` the thumbnail's `<svg>` is drawn with, as the attribute string. */
const renderViewBox = (doc: CanvasDoc): string => {
	const host = document.createElement("div");
	const root = createRoot(host);
	roots.push(root);
	act(() => {
		root.render(<CanvasThumbnail canvasDoc={doc} width={480} height={270} />);
	});
	const svg = host.querySelector("svg");
	if (svg === null) {
		throw new Error("the thumbnail drew no svg");
	}
	return svg.getAttribute("viewBox") ?? "";
};

afterEach(() => {
	act(() => {
		roots.splice(0).forEach((root) => {
			root.unmount();
		});
	});
});

describe("CanvasThumbnail against a document that declares a view", () => {
	const fitViewBox = renderViewBox(twoRectsDocWith());

	it("frames the content with calcFitViewport and the prop padding, nothing else", () => {
		const { objects } = canvasToState(
			twoRectsDocWith(),
			defaultCanvasRegistries.objectMapper,
			defaultCanvasRegistries.objectContentResizer,
		);
		const fitted = calcFitViewport(
			objects,
			{ width: 480, height: 270, padding: 24 },
			defaultCanvasRegistries.objectVisualBounds,
		);
		if (fitted === null) {
			throw new Error("the fixture has no content to fit");
		}
		expect(fitViewBox).toBe(
			`${fitted.minX} ${fitted.minY} ${480 / fitted.zoom} ${270 / fitted.zoom}`,
		);
	});

	it("frames a document declaring an open mode exactly as one declaring none", () => {
		expect(renderViewBox(twoRectsDocWith({ open: "fit-width" }))).toBe(
			fitViewBox,
		);
	});

	it("frames a document declaring padding exactly as one declaring none", () => {
		expect(
			renderViewBox(
				twoRectsDocWith({
					padding: { top: 10, right: 20, bottom: 30, left: 40 },
				}),
			),
		).toBe(fitViewBox);
	});

	it("frames a document declaring the whole view exactly as one declaring none", () => {
		expect(
			renderViewBox(
				twoRectsDocWith({
					padding: { top: 10, right: 20, bottom: 30, left: 40 },
					open: "fit-all",
					scroll: "content",
				}),
			),
		).toBe(fitViewBox);
	});

	it("follows its own padding prop instead, which is the one margin it has", () => {
		const host = document.createElement("div");
		const root = createRoot(host);
		roots.push(root);
		act(() => {
			root.render(
				<CanvasThumbnail
					canvasDoc={twoRectsDocWith({ padding: { left: 400 } })}
					width={480}
					height={270}
					padding={0}
				/>,
			);
		});
		expect(host.querySelector("svg")?.getAttribute("viewBox")).not.toBe(
			fitViewBox,
		);
	});
});
