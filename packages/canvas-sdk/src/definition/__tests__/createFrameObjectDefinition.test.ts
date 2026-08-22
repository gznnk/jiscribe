import type { CreateObjectState } from "@jiscribe/canvas";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";
import { calcFullBoxTextRegion, calcOutsideBoxTextRegion } from "@jiscribe/doc";
import { AUTO_COLOR } from "@jiscribe/doc/unstable";
import { describe, it, expect } from "vitest";

import { createFrameObjectDoc } from "../../schema/createFrameObjectDoc";
import { createFrameObjectDefinition } from "../createFrameObjectDefinition";

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
	fill: "transparent",
	stroke: "#000000",
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
	description: "Demo shape.",
});

const DemoComponent = () => null;

const demoDoc = { ...DEMO_DOC_DEFAULTS, id: "demo-1" } as unknown as DemoDoc;

describe("createFrameObjectDefinition", () => {
	it("spreads the doc definition and passes the UI fields through", () => {
		const outline = () => [];
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
			outline,
			stencils: [],
		});

		expect(definition.features).toBe(DemoFeatures);
		expect(definition.validateDoc).toBe(demoDocDefinition.validateDoc);
		expect(definition.factory).toBe(demoDocDefinition.factory);
		expect(definition.description).toBe("Demo shape.");
		expect(definition.component).toBe(DemoComponent);
		expect(definition.outline).toBe(outline);
		expect(definition.stencils).toEqual([]);
	});

	it("carries the doc's verdict on a height that may follow the text", () => {
		const inTheBox = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: createFrameObjectDoc({
				features: DemoFeatures,
				defaults: DEMO_DOC_DEFAULTS,
				textRegion: calcFullBoxTextRegion,
			}),
			component: DemoComponent,
			textRegion: calcFullBoxTextRegion,
		});
		// The shape labelled below its outline: its doc says the box holds no text,
		// while its UI region is the caption box it draws that label in. Only the
		// doc's answer decides, so the UI one must not talk the canvas into offering
		// a height the parser then refuses.
		const belowTheBox = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: createFrameObjectDoc({
				features: DemoFeatures,
				defaults: DEMO_DOC_DEFAULTS,
				textRegion: calcOutsideBoxTextRegion,
			}),
			component: DemoComponent,
			textRegion: ({ width, height }) => ({
				x: -width / 2,
				y: height / 2,
				width,
				height: 20,
			}),
		});

		expect(inTheBox.autoHeight).toBeUndefined();
		expect(belowTheBox.autoHeight).toBe(false);
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
			textRegion: calcFullBoxTextRegion,
		});

		expect(denied.autoHeight).toBe(false);
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
