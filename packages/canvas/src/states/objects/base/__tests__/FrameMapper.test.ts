import type { ConnectorDoc } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { ConnectorFeatures } from "@jiscribe/doc/model/objects/connector/ConnectorDoc";
import { EllipseFeatures } from "@jiscribe/doc/model/objects/primitives/ellipse/EllipseDoc";
import type { PolylineDoc } from "@jiscribe/doc/model/objects/primitives/polyline/PolylineDoc";
import { PolylineFeatures } from "@jiscribe/doc/model/objects/primitives/polyline/PolylineDoc";
import type { RectDoc } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import { RectFeatures } from "@jiscribe/doc/model/objects/primitives/rect/RectDoc";
import type { CreateObjectType } from "@jiscribe/doc/model/objects/types/CreateObjectType";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import { describe, expect, it } from "vitest";

import type { ConnectorState } from "../../connector/ConnectorState";
import type { EllipseState } from "../../primitives/ellipse/EllipseState";
import type { PolylineState } from "../../primitives/polyline/PolylineState";
import { rectToDoc, rectToState } from "../../primitives/rect/RectMapper";
import type { RectState } from "../../primitives/rect/RectState";
import type { CreateObjectState } from "../../types/CreateObjectState";
import { createFrameMapper } from "../FrameMapper";
import { createPolyMapper } from "../PolyMapper";

/**
 * A stroke-less frame type, declared here rather than borrowed from a real shape:
 * every built-in has `stroke: true` since sticky moved to
 * `@jiscribe/plugin-sticky-shape`, and the mapper's behavior is a property of the
 * descriptor, not of any one shape.
 */
const NoStrokeFeatures = {
	type: "noStroke",
	geometry: "rect",
	transform: true,
	stroke: false,
	fill: true,
	text: "body",
	radius: false,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const NoStrokeBrand: unique symbol;
type NoStrokeDoc = CreateObjectType<
	typeof NoStrokeFeatures,
	typeof NoStrokeBrand
>;
type NoStrokeState = CreateObjectState<
	typeof NoStrokeFeatures,
	typeof NoStrokeBrand
>;

const { toState: noStrokeToState } = createFrameMapper<
	NoStrokeDoc,
	NoStrokeState
>(NoStrokeFeatures);

/**
 * Regression test for the pass-through approach.
 * createFrameMapper only picks up feature-derived style keys plus extra keys via an
 * allow-list. The runtime-only parentId that CanvasMapper attaches to every State, and
 * the State-only minWidth/minHeight, are not in the allow-list, so this guarantees they
 * do not leak into the Doc (a nested tree where hierarchy is expressed via children).
 * Conversely, rect's rounded-corner rx is included in the allow-list as a radius style,
 * so this also pins down that it is preserved across the round-trip.
 */
describe("FrameMapper pass-through: does not leak runtime-only fields into the Doc", () => {
	it("preserves rect's rounded-corner rx (radius style) across a doc↔state round-trip", () => {
		const doc = {
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			rx: 12,
		} as unknown as Parameters<typeof rectToState>[0];

		const state = rectToState(doc) as Record<string, unknown>;
		expect(state.rx).toBe(12);

		const roundTripped = rectToDoc(state as never) as Record<string, unknown>;
		expect(roundTripped.rx).toBe(12);
	});

	it("drops unknown doc keys through a doc→state→doc round-trip", () => {
		// Unknown properties are specified as "ignored when displaying, dropped when
		// saving". The saving half of that is exactly this allow-list letting them fall
		// away, so pin the round trip dropping them as the specification.
		const doc = {
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			unknownKey: "keep-out",
		} as unknown as Parameters<typeof rectToState>[0];

		const state = rectToState(doc) as Record<string, unknown>;
		expect("unknownKey" in state).toBe(false);

		const roundTripped = rectToDoc(state as never) as Record<string, unknown>;
		expect("unknownKey" in roundTripped).toBe(false);
	});

	it("rectToDoc does not include parentId in the Doc", () => {
		const state = {
			id: "rect-1",
			type: "rect",
			parentId: "group-9",
			cx: 50,
			cy: 50,
			width: 100,
			height: 100,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			fill: "#fff",
		} as unknown as RectState;

		const doc = rectToDoc(state) as Record<string, unknown>;

		expect("parentId" in doc).toBe(false);
	});

	it("rectToDoc does not include the State-only minWidth/minHeight in the Doc", () => {
		const state = {
			id: "rect-1",
			type: "rect",
			cx: 50,
			cy: 50,
			width: 100,
			height: 100,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			minWidth: 20,
			minHeight: 10,
		} as unknown as RectState;

		const doc = rectToDoc(state) as Record<string, unknown>;

		expect("minWidth" in doc).toBe(false);
		expect("minHeight" in doc).toBe(false);
	});
});

/**
 * The allow-list intake contract (Doc→State direction).
 * createFrameMapper "explicitly enumerates the keys to pick up and lets nothing else
 * through". This pins down that unknown fields and style groups disabled by features are
 * not carried into the state even if they exist on the doc.
 */
describe("FrameMapper allow-list: does not carry keys other than the ones to pick up into the State", () => {
	it("does not surface unknown fields sneaked into the doc in the state", () => {
		const doc = {
			id: "rect-1",
			type: "rect",
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			bogusField: "should-be-dropped",
		} as unknown as Parameters<typeof rectToState>[0];

		const state = rectToState(doc) as Record<string, unknown>;

		expect("bogusField" in state).toBe(false);
	});

	it("does not carry doc.stroke into the state for a shape with stroke disabled", () => {
		const doc = {
			id: "no-stroke-1",
			type: NoStrokeFeatures.type,
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			fill: "#ffff00",
			stroke: "#000000",
			strokeWidth: 4,
		} as unknown as NoStrokeDoc;

		const state = noStrokeToState(doc) as Record<string, unknown>;

		// fill is picked up since features.fill=true, and stroke fields are dropped since features.stroke=false.
		expect(state.fill).toBe("#ffff00");
		expect("stroke" in state).toBe(false);
		expect("strokeWidth" in state).toBe(false);
	});
});

/**
 * Compile-time regression guard for the features↔Doc/State binding.
 *
 * `createFrameMapper` / `createPolyMapper` tie the descriptor to `TDoc["type"]`, so a call
 * that names three different object types no longer compiles. Nothing here runs — the
 * `@ts-expect-error` directives fail `pnpm typecheck` if a constraint is ever loosened.
 */
describe("mapper factories reject a features / Doc / State mismatch", () => {
	it("is enforced at compile time", () => {
		// Correct pairings, including connector whose Doc narrows points to optional.
		createFrameMapper<RectDoc, RectState>(RectFeatures);
		createPolyMapper<ConnectorDoc, ConnectorState>(ConnectorFeatures);

		// @ts-expect-error EllipseState.type is "ellipse", so it cannot pair with RectDoc
		createFrameMapper<RectDoc, EllipseState>(RectFeatures);

		// @ts-expect-error EllipseFeatures.type is "ellipse", so it cannot describe RectDoc
		createFrameMapper<RectDoc, RectState>(EllipseFeatures);

		createFrameMapper<PolylineDoc, PolylineState>(
			// @ts-expect-error PolylineFeatures.geometry is "poly", not a Frame family one
			PolylineFeatures,
		);

		expect(true).toBe(true);
	});
});
