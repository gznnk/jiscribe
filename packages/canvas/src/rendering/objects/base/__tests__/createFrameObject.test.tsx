// @vitest-environment jsdom

import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";
import type { TransformedFrame } from "@jiscribe/geometry";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import { FontsLoadedNonceContext } from "../../FontsLoadedNonceContext";
import { createFrameObject } from "../createFrameObject";
import type * as TextOverlayModule from "../TextOverlay";

/**
 * What a frame shape re-renders for. `draw` and the slot overlays measure text
 * while they render, so a font landing after the first paint has to reach them
 * through FontsLoadedNonceContext — the component's memo stops everything else.
 */

// Without this React treats every `act` below as unsupported and warns, the
// flushes being correct all the same.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const overlayRenderCount = vi.hoisted(() => ({ value: 0 }));

// Stands in for the real overlay only to count its renders, keeping the memo it
// is wrapped in: what is asserted is that a nonce-driven re-render of the parent
// still stops there.
vi.mock("../TextOverlay", async (importOriginal) => {
	const actual = await importOriginal<typeof TextOverlayModule>();
	const { memo } = await import("react");
	return {
		...actual,
		TextOverlay: memo(() => {
			overlayRenderCount.value += 1;
			return null;
		}),
	};
});

type ProbeState = ObjectState & TransformedFrame & Partial<TextStyleState>;

const probeState: ProbeState = {
	id: "frame-1",
	type: "rect",
	cx: 0,
	cy: 0,
	width: 100,
	height: 50,
	scaleX: 1,
	scaleY: 1,
	rotation: 0,
	features: { type: "rect", geometry: "rect", text: "body" },
	text: { [BODY_TEXT_SLOT_ID]: { text: "hello" } },
};

/** Mounts one frame shape and lets the test drive the nonce the tree is given. */
const renderFrameShape = () => {
	const drawCount = { value: 0 };
	const FrameShape = createFrameObject<ProbeState>((state, shape) => {
		drawCount.value += 1;
		// Only the attributes a bare SVG element accepts: the real shapes hand the
		// resolved colors to an emotion element, which is beside the point here.
		return (
			<rect
				data-kind={shape["data-kind"]}
				data-id={shape["data-id"]}
				transform={shape.transform}
				width={state.width}
				height={state.height}
			/>
		);
	});
	const container = document.createElement("div");
	const root = createRoot(container);
	return {
		drawCount,
		render: (nonce: number): void => {
			act(() =>
				root.render(
					<FontsLoadedNonceContext value={nonce}>
						<svg>
							<FrameShape {...probeState} />
						</svg>
					</FontsLoadedNonceContext>,
				),
			);
		},
		unmount: () => act(() => root.unmount()),
	};
};

describe("createFrameObject", () => {
	beforeEach(() => {
		overlayRenderCount.value = 0;
	});

	it("re-runs draw when the fonts-loaded nonce moves", () => {
		const shape = renderFrameShape();
		shape.render(0);
		const drawnBefore = shape.drawCount.value;

		shape.render(1);

		expect(shape.drawCount.value).toBe(drawnBefore + 1);
		shape.unmount();
	});

	it("holds its memo when the tree re-renders with the same nonce", () => {
		const shape = renderFrameShape();
		shape.render(0);
		const drawnBefore = shape.drawCount.value;

		shape.render(0);
		shape.render(0);

		expect(shape.drawCount.value).toBe(drawnBefore);
		shape.unmount();
	});

	it("leaves the text overlay's own memo intact, the region not having moved", () => {
		const shape = renderFrameShape();
		shape.render(0);
		const overlaysBefore = overlayRenderCount.value;

		shape.render(1);

		expect(shape.drawCount.value).toBeGreaterThan(0);
		expect(overlayRenderCount.value).toBe(overlaysBefore);
		shape.unmount();
	});
});
