// @vitest-environment jsdom

import {
	DEFAULT_FILL,
	DEFAULT_FILL_OPACITY,
} from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import {
	DEFAULT_STROKE_OPACITY,
	DEFAULT_STROKE_WIDTH,
} from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import type { ObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";
import { createObjectShapeStyleDefaultsRegistry } from "@jiscribe/doc/plugin/ObjectShapeStyleDefaultsRegistry";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";
import type { TransformedFrame } from "@jiscribe/geometry";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FillStyleState } from "../../../../states/objects/base/FillStyleState";
import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { StrokeStyleState } from "../../../../states/objects/base/StrokeStyleState";
import type { TextStyleState } from "../../../../states/objects/base/TextStyleState";
import { theme } from "../../../../theme/themeTokens";
import { FontsLoadedNonceContext } from "../../FontsLoadedNonceContext";
import { ObjectShapeStyleDefaultsRegistryContext } from "../../registry/ObjectShapeStyleDefaultsRegistryContext";
import { createFrameObject } from "../createFrameObject";
import type { FrameShapeProps } from "../createFrameObject";
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

type ProbeState = ObjectState &
	TransformedFrame &
	StrokeStyleState &
	FillStyleState &
	Partial<TextStyleState>;

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

/**
 * Mounts one frame shape and lets the test drive the nonce the tree is given.
 *
 * `shapeStyleDefaults` stands in for the canvas's own registry, so a test can
 * see what a type's declared defaults do to a state that omits the field; the
 * empty default registry leaves every omission on the shared last resort.
 */
const renderFrameShape = (options?: {
	state?: ProbeState;
	shapeStyleDefaults?: ObjectShapeStyleDefaultsRegistry;
}) => {
	const drawCount = { value: 0 };
	const drawnShape: { value: FrameShapeProps | null } = { value: null };
	const state = options?.state ?? probeState;
	const shapeStyleDefaults =
		options?.shapeStyleDefaults ?? createObjectShapeStyleDefaultsRegistry();
	const FrameShape = createFrameObject<ProbeState>((drawState, shape) => {
		drawCount.value += 1;
		drawnShape.value = shape;
		// Only the attributes a bare SVG element accepts: the real shapes hand the
		// resolved colors to an emotion element, which is beside the point here.
		return (
			<rect
				data-kind={shape["data-kind"]}
				data-id={shape["data-id"]}
				transform={shape.transform}
				width={drawState.width}
				height={drawState.height}
			/>
		);
	});
	const container = document.createElement("div");
	const root = createRoot(container);
	return {
		drawCount,
		drawnShape,
		render: (nonce: number): void => {
			act(() =>
				root.render(
					<ObjectShapeStyleDefaultsRegistryContext value={shapeStyleDefaults}>
						<FontsLoadedNonceContext value={nonce}>
							<svg>
								<FrameShape {...state} />
							</svg>
						</FontsLoadedNonceContext>
					</ObjectShapeStyleDefaultsRegistryContext>,
				),
			);
		},
		unmount: () => act(() => root.unmount()),
	};
};

/** A registry answering for the probe's own type and nothing else. */
const registryFor = (
	defaults: Parameters<ObjectShapeStyleDefaultsRegistry["register"]>[1],
): ObjectShapeStyleDefaultsRegistry => {
	const registry = createObjectShapeStyleDefaultsRegistry();
	registry.register(probeState.type, defaults);
	return registry;
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

	it("draws the type's own fill where the state omits one", () => {
		const shape = renderFrameShape({
			shapeStyleDefaults: registryFor({ fill: AUTO_COLOR }),
		});
		shape.render(0);

		expect(shape.drawnShape.value?.fillColor).toBe(theme.objectSurface);
		shape.unmount();
	});

	it("draws the type's own stroke width where the state omits one", () => {
		const shape = renderFrameShape({
			shapeStyleDefaults: registryFor({ strokeWidth: 4 }),
		});
		shape.render(0);

		expect(shape.drawnShape.value?.strokeWidth).toBe(4);
		shape.unmount();
	});

	it("falls to the shared last resort for a type declaring nothing", () => {
		const shape = renderFrameShape();
		shape.render(0);

		expect(shape.drawnShape.value?.strokeWidth).toBe(DEFAULT_STROKE_WIDTH);
		expect(shape.drawnShape.value?.fillColor).toBe(DEFAULT_FILL);
		shape.unmount();
	});

	it("draws fully opaque where neither the state nor the type states an opacity", () => {
		const shape = renderFrameShape();
		shape.render(0);

		expect(shape.drawnShape.value?.fillAlpha).toBe(DEFAULT_FILL_OPACITY);
		expect(shape.drawnShape.value?.strokeAlpha).toBe(DEFAULT_STROKE_OPACITY);
		shape.unmount();
	});

	it("draws the opacities the state states", () => {
		const shape = renderFrameShape({
			state: { ...probeState, fillOpacity: 0.4, strokeOpacity: 0.7 },
		});
		shape.render(0);

		expect(shape.drawnShape.value?.fillAlpha).toBe(0.4);
		expect(shape.drawnShape.value?.strokeAlpha).toBe(0.7);
		shape.unmount();
	});

	it("draws the type's own opacities where the state omits them", () => {
		const shape = renderFrameShape({
			shapeStyleDefaults: registryFor({
				fillOpacity: 0.5,
				strokeOpacity: 0.25,
			}),
		});
		shape.render(0);

		expect(shape.drawnShape.value?.fillAlpha).toBe(0.5);
		expect(shape.drawnShape.value?.strokeAlpha).toBe(0.25);
		shape.unmount();
	});

	it("lets the state's own fill win over the type's", () => {
		const shape = renderFrameShape({
			state: { ...probeState, fill: "#ff0000" },
			shapeStyleDefaults: registryFor({ fill: AUTO_COLOR }),
		});
		shape.render(0);

		expect(shape.drawnShape.value?.fillColor).toBe("#ff0000");
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
