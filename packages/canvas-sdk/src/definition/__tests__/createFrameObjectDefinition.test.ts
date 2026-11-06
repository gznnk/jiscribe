import type { CreateObjectState } from "@jiscribe/canvas";
import { createTextSlotPartKindDefinition } from "@jiscribe/canvas/unstable";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";
import { calcFullBoxTextRegion } from "@jiscribe/doc";
import { AUTO_COLOR } from "@jiscribe/doc/unstable";
import { describe, it, expect } from "vitest";

import { createFrameObjectDoc } from "../../schema/createFrameObjectDoc";
import { createFrameObjectDefinition } from "../createFrameObjectDefinition";

// Colours are the "auto" sentinel: a real colour would reach isCssColor
// (CSS.supports), which the node test environment has no CSS for. Real colours
// are covered by the canvas paste e2e.
const DemoFeatures = {
	type: "sdkDemo",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
} as const satisfies ObjectFeatures;

const DEMO_DOC_DEFAULTS = {
	type: "sdkDemo",
	x: 0,
	y: 0,
	width: 120,
	height: 80,
	variant: "plain",
	fill: "auto",
	stroke: "auto",
	strokeWidth: 2,
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 16,
	fontFamily: "sans-serif",
	fontWeight: "normal",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DemoDocBrand: unique symbol;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const DemoStateBrand: unique symbol;

type DemoDoc = CreateObjectType<
	typeof DemoFeatures,
	typeof DemoDocBrand,
	{ variant: string }
>;
type DemoState = CreateObjectState<
	typeof DemoFeatures,
	typeof DemoStateBrand,
	{ variant: string }
>;

const demoDocDefinition = createFrameObjectDoc({
	features: DemoFeatures,
	defaults: DEMO_DOC_DEFAULTS,
	textRegion: calcFullBoxTextRegion,
	description: "Demo shape.",
});

const DemoComponent = () => null;

const demoDoc = { ...DEMO_DOC_DEFAULTS, id: "demo-1" } as unknown as DemoDoc;

describe("createFrameObjectDefinition", () => {
	it("spreads the doc definition and passes the UI fields through", () => {
		const outline = () => [];
		const anchorRegion = () => ({ x: -10, y: -5, width: 20, height: 10 });
		const docDefinition = createFrameObjectDoc({
			features: DemoFeatures,
			defaults: DEMO_DOC_DEFAULTS,
			textRegion: calcFullBoxTextRegion,
			description: "Demo shape.",
			outline,
			anchorRegion,
		});
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: docDefinition,
			component: DemoComponent,
			stencils: [],
		});

		expect(definition.features).toBe(DemoFeatures);
		expect(definition.validateDoc).toBe(docDefinition.validateDoc);
		expect(definition.factory).toBe(docDefinition.factory);
		expect(definition.description).toBe("Demo shape.");
		expect(definition.component).toBe(DemoComponent);
		expect(definition.outline).toBe(outline);
		expect(definition.anchorRegion).toBe(anchorRegion);
		expect(definition.stencils).toEqual([]);
	});

	it("inherits the doc's text region, which the core builds the text slot kind from", () => {
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
		});

		expect(definition.textRegion).toBe(calcFullBoxTextRegion);
	});

	it("carries an explicit denial across untouched", () => {
		const denied = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: createFrameObjectDoc({
				features: DemoFeatures,
				defaults: DEMO_DOC_DEFAULTS,
				textRegion: calcFullBoxTextRegion,
				autoHeight: false,
			}),
			component: DemoComponent,
		});

		expect(denied.autoHeight).toBe(false);
	});

	it("carries the auto-height padding from the doc to the canvas definition", () => {
		const padded = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: createFrameObjectDoc({
				features: DemoFeatures,
				defaults: DEMO_DOC_DEFAULTS,
				textRegion: calcFullBoxTextRegion,
				autoHeightPaddingEm: 0.25,
			}),
			component: DemoComponent,
		});

		expect(padded.autoHeightPaddingEm).toBe(0.25);
	});

	it("passes the declared part kinds through untouched", () => {
		const vertexKind = { kind: "vertex", has: () => false };
		const textSlotKind = createTextSlotPartKindDefinition<DemoState>();
		const partKinds = [vertexKind, textSlotKind];
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
			partKinds,
		});

		// Untouched here: registration is what places this text slot kind's body in
		// the doc's textRegion (applyObjectDefinition).
		expect(definition.partKinds).toBe(partKinds);
	});

	it("declares no part kind when given none", () => {
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
		});

		expect(definition.partKinds).toBeUndefined();
	});

	it("derives a mapper that converts geometry both ways", () => {
		const { mapper } = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
		});

		const state = mapper.toState(demoDoc);
		expect(state).toMatchObject({ cx: 60, cy: 40, width: 120, height: 80 });
		expect(mapper.toDoc(state)).toMatchObject({ x: 0, y: 0 });
	});

	it("takes the shape's own field names from the doc definition", () => {
		const withoutExtraKeys = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
		});
		const withExtraKeys = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: createFrameObjectDoc({
				features: DemoFeatures,
				defaults: DEMO_DOC_DEFAULTS,
				textRegion: calcFullBoxTextRegion,
				description: "Demo shape.",
				extraKeys: ["variant"],
			}),
			component: DemoComponent,
		});

		expect(withoutExtraKeys.mapper.toState(demoDoc)).not.toHaveProperty(
			"variant",
		);
		expect(withExtraKeys.mapper.toState(demoDoc)).toMatchObject({
			variant: "plain",
		});
	});

	it("derives a state validator from features", () => {
		const { mapper, stateValidator } = createFrameObjectDefinition<
			DemoDoc,
			DemoState
		>({
			doc: demoDocDefinition,
			component: DemoComponent,
		});

		const state = mapper.toState(demoDoc);
		expect(stateValidator(state)).toBe(true);
		expect(stateValidator({ ...state, type: "other" })).toBe(false);
	});

	it("runs isExtraStateValid last in the type-guard chain", () => {
		const { mapper, stateValidator } = createFrameObjectDefinition<
			DemoDoc,
			DemoState
		>({
			doc: demoDocDefinition,
			component: DemoComponent,
			isExtraStateValid: (state) => state.variant === "plain",
		});

		const state = mapper.toState(demoDoc) as unknown as Record<string, unknown>;
		expect(stateValidator({ ...state, variant: "plain" })).toBe(true);
		expect(stateValidator({ ...state, variant: "fancy" })).toBe(false);
	});

	it("derives the shared frame behavior", () => {
		const { behavior } = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
		});

		const moved = behavior.moveByDelta({ cx: 10, cy: 20 } as DemoState, {
			x: 5,
			y: -5,
		});
		expect(moved).toMatchObject({ cx: 15, cy: 15 });
	});
});
