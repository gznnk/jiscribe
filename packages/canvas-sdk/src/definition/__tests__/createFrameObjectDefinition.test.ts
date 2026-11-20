import type { CreateObjectState } from "@jiscribe/canvas";
import {
	createTextSlotPartKindDefinition,
	TEXT_SLOT_PART_KIND,
} from "@jiscribe/canvas/unstable";
import type { CreateObjectType, ObjectFeatures } from "@jiscribe/doc";
import { calcFullBoxTextRegion } from "@jiscribe/doc";
import { AUTO_COLOR } from "@jiscribe/doc/unstable";
import type { Dimensions } from "@jiscribe/geometry";
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
	description: "Demo shape.",
});

const DemoComponent = () => null;

const labelDocDefinition = createFrameObjectDoc({
	features: { ...DemoFeatures, text: "label" },
	defaults: DEMO_DOC_DEFAULTS,
});

const innerLabelDocDefinition = createFrameObjectDoc({
	features: { ...DemoFeatures, text: "innerLabel" },
	defaults: DEMO_DOC_DEFAULTS,
});

/** A caption placed to the right of the box, the way a label type placing its own does. */
const captionBeside = ({ width }: Dimensions) => ({
	x: width / 2 + 8,
	y: -10,
	width: 40,
	height: 20,
});

const demoDoc = { ...DEMO_DOC_DEFAULTS, id: "demo-1" } as unknown as DemoDoc;

describe("createFrameObjectDefinition", () => {
	it("spreads the doc definition and passes the UI fields through", () => {
		const outline = () => [];
		const anchorRegion = () => ({ x: -10, y: -5, width: 20, height: 10 });
		const docDefinition = createFrameObjectDoc({
			features: DemoFeatures,
			defaults: DEMO_DOC_DEFAULTS,
			description: "Demo shape.",
			outline,
			anchorRegion,
		});
		const labelBackdrop = () => [];
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: docDefinition,
			component: DemoComponent,
			stencils: [],
			labelBackdrop,
		});

		expect(definition.features).toBe(DemoFeatures);
		expect(definition.validateDoc).toBe(docDefinition.validateDoc);
		expect(definition.factory).toBe(docDefinition.factory);
		expect(definition.description).toBe("Demo shape.");
		expect(definition.component).toBe(DemoComponent);
		expect(definition.outline).toBe(outline);
		expect(definition.anchorRegion).toBe(anchorRegion);
		expect(definition.stencils).toEqual([]);
		expect(definition.labelBackdrop).toBe(labelBackdrop);
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

	it("carries the auto-height padding from the doc to the canvas definition", () => {
		const padded = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: createFrameObjectDoc({
				features: DemoFeatures,
				defaults: DEMO_DOC_DEFAULTS,
				textRegion: calcFullBoxTextRegion,
				autoHeightPaddingEm: 0.25,
			}),
			component: DemoComponent,
			textRegion: calcFullBoxTextRegion,
		});

		expect(padded.autoHeightPaddingEm).toBe(0.25);
	});

	it("builds the text slot part kind from textRegion, after the declared kinds", () => {
		const captionRegion = ({ width, height }: Dimensions) => ({
			x: -width / 2,
			y: height / 2,
			width,
			height: 20,
		});
		const vertexKind = { kind: "vertex", has: () => false };
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
			textRegion: captionRegion,
			partKinds: [vertexKind],
		});

		expect(definition.partKinds?.map((part) => part.kind)).toEqual([
			"vertex",
			TEXT_SLOT_PART_KIND,
		]);
		expect(definition.partKinds?.[1].region).toBe(captionRegion);
	});

	it("declares no part kind when given no textRegion", () => {
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: demoDocDefinition,
			component: DemoComponent,
		});

		expect(definition.partKinds).toBeUndefined();
	});

	it("refuses textRegion next to a declared text slot kind, naming the type", () => {
		expect(() =>
			createFrameObjectDefinition<DemoDoc, DemoState>({
				doc: demoDocDefinition,
				component: DemoComponent,
				textRegion: calcFullBoxTextRegion,
				partKinds: [createTextSlotPartKindDefinition()],
			}),
		).toThrow(
			'createFrameObjectDefinition "sdkDemo": declares textRegion and a "textSlot" part kind',
		);
	});

	it("refuses textRegion without visualBounds on a label text type, naming the type and the parameters", () => {
		expect(() =>
			createFrameObjectDefinition<DemoDoc, DemoState>({
				doc: labelDocDefinition,
				component: DemoComponent,
				textRegion: captionBeside,
			}),
		).toThrow(
			'createFrameObjectDefinition "sdkDemo": features.text "label" passes textRegion without visualBounds; pass both to place the caption, or neither to have it placed under the box',
		);
	});

	it("refuses visualBounds without textRegion on a label text type", () => {
		expect(() =>
			createFrameObjectDefinition<DemoDoc, DemoState>({
				doc: labelDocDefinition,
				component: DemoComponent,
				visualBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
			}),
		).toThrow(
			'createFrameObjectDefinition "sdkDemo": features.text "label" passes visualBounds without textRegion; pass both to place the caption, or neither to have it placed under the box',
		);
	});

	it("builds the text slot kind of a label text type passing textRegion and visualBounds together", () => {
		const visualBounds = () => ({ x: -60, y: -40, width: 200, height: 80 });
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: labelDocDefinition,
			component: DemoComponent,
			textRegion: captionBeside,
			visualBounds,
		});

		expect(definition.partKinds?.map((part) => part.kind)).toEqual([
			TEXT_SLOT_PART_KIND,
		]);
		expect(definition.partKinds?.[0].region).toBe(captionBeside);
		expect(definition.visualBounds).toBe(visualBounds);
	});

	it.each([
		["neither", {}, "textRegion and visualBounds"],
		["only textRegion", { textRegion: captionBeside }, "visualBounds"],
		[
			"only visualBounds",
			{ visualBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }) },
			"textRegion",
		],
	])(
		"refuses an innerLabel text type passing %s, its caption having no default place",
		(_case, placement, missing) => {
			expect(() =>
				createFrameObjectDefinition<DemoDoc, DemoState>({
					doc: innerLabelDocDefinition,
					component: DemoComponent,
					...placement,
				}),
			).toThrow(
				`createFrameObjectDefinition "sdkDemo": features.text "innerLabel" passes no ${missing}; pass both textRegion and visualBounds, the caption having no default place`,
			);
		},
	);

	it("builds the text slot kind of an innerLabel text type passing textRegion and visualBounds together", () => {
		const visualBounds = () => ({ x: -60, y: -40, width: 200, height: 80 });
		const definition = createFrameObjectDefinition<DemoDoc, DemoState>({
			doc: innerLabelDocDefinition,
			component: DemoComponent,
			textRegion: captionBeside,
			visualBounds,
		});

		expect(definition.partKinds?.[0].region).toBe(captionBeside);
		expect(definition.visualBounds).toBe(visualBounds);
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
