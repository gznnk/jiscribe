/**
 * Shapes that exist only so the core e2e specs have something to drive: a
 * drag-drawn `tile` listed in a category flyout, a click-placed `pin` pinned on
 * the bar, and a `card` that roots its render in a `<g>` and carries a text slot.
 * Core supplies none of those traits itself any more — every categorized shape
 * moved to a plugin, and sticky, the last click-placed and last `<g>`-rooted one,
 * to `@jiscribe/plugin-sticky-shape` — so the specs covering the StencilLibrary
 * category flyout, the click-placement branch, and connector / text-style
 * handling of a grouped render supply them. Each of those branches keys off the
 * registered stencil, factory or features, not off any particular type, so
 * stand-ins are faithful.
 *
 * The unit-test counterparts are
 * `src/controllers/__tests__/support/{outlinedPlugin,clickPlacedPlugin}.ts`;
 * `pin` is named after the click-placed one there.
 */

// Relative, never through @jiscribe/canvas-sdk: canvas may not depend on the kit it ships.
import { memo } from "react";

import type {
	CanvasPlugin,
	CreateObjectState,
	CreateObjectType,
	ObjectFeatures,
	ObjectTypeDefinition,
	StencilIconProps,
	ToolbarEntry,
} from "../../src";
import { BODY_TEXT_SLOT_ID } from "../../src";
import type { FrameShapeProps, TextEditable } from "../../src/unstable";
import {
	TextOverlay,
	calcFullTextRegion,
	createFrameBehavior,
	createFrameMapper,
	createFrameObject,
	createFrameStateValidator,
	createSvgTransform,
	readTextSlot,
	resolveAutoColor,
} from "../../src/unstable";
import {
	AUTO_COLOR,
	DEFAULT_FONT_FAMILY,
	createFrameDocValidator,
	createFrameObjectFactory,
} from "../../src/unstable-doc";

/** Stencil icon edge length in px, the size StencilLibraryItem asks for. */
const ICON_SIZE = 24;

const SpecShapeIcon: React.FC<StencilIconProps> = ({
	width = ICON_SIZE,
	height = ICON_SIZE,
}) => (
	<svg
		width={width}
		height={height}
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
	>
		<rect
			x="4"
			y="4"
			width="16"
			height="16"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
		/>
	</svg>
);

/**
 * Draws the box both spec shapes share. Colors come in already resolved, and are
 * put on SVG presentation attributes rather than an emotion element: the specs
 * only ask that the shape be in the DOM under `data-kind="object"`.
 */
const drawSpecShapeBox = (
	state: { width: number; height: number },
	{ strokeColor, fillColor, ...shape }: FrameShapeProps,
) => (
	<rect
		{...shape}
		x={-state.width / 2}
		y={-state.height / 2}
		width={state.width}
		height={state.height}
		stroke={strokeColor}
		fill={fillColor}
		pointerEvents="auto"
	/>
);

const TileFeatures = {
	type: "tile",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TileDocBrand: unique symbol;
type TileDoc = CreateObjectType<typeof TileFeatures, typeof TileDocBrand>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const TileStateBrand: unique symbol;
type TileState = CreateObjectState<typeof TileFeatures, typeof TileStateBrand>;

const TILE_DOC_DEFAULTS: Omit<TileDoc, "id"> = {
	type: "tile",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
} as const as TileDoc;

/** Drag-drawn shape; the only member of the `spec` category flyout. */
const tileDefinition: ObjectTypeDefinition<TileDoc, TileState> = {
	features: TileFeatures,
	validateDoc: createFrameDocValidator(TileFeatures),
	factory: createFrameObjectFactory(TILE_DOC_DEFAULTS),
	mapper: createFrameMapper<TileDoc, TileState>(TileFeatures),
	stateValidator: createFrameStateValidator(TileFeatures),
	behavior: createFrameBehavior<TileState>(),
	component: createFrameObject<TileState>(drawSpecShapeBox),
	stencils: [
		{ id: "tile", objectType: "tile", label: "Tile", icon: SpecShapeIcon },
	],
};

const PinFeatures = {
	type: "pin",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PinDocBrand: unique symbol;
type PinDoc = CreateObjectType<typeof PinFeatures, typeof PinDocBrand>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PinStateBrand: unique symbol;
type PinState = CreateObjectState<typeof PinFeatures, typeof PinStateBrand>;

const PIN_DOC_DEFAULTS: Omit<PinDoc, "id"> = {
	type: "pin",
	x: 0,
	y: 0,
	width: 40,
	height: 40,
	fill: "transparent",
	stroke: AUTO_COLOR,
	strokeWidth: 2,
} as const as PinDoc;

/**
 * Click-placed shape: `supportsBounds: false` leaves the factory without
 * `createDocFromBounds`, which is what makes the StencilLibrary place it on press
 * instead of entering drawing mode.
 */
const pinDefinition: ObjectTypeDefinition<PinDoc, PinState> = {
	features: PinFeatures,
	validateDoc: createFrameDocValidator(PinFeatures),
	factory: createFrameObjectFactory(PIN_DOC_DEFAULTS, {
		supportsBounds: false,
	}),
	mapper: createFrameMapper<PinDoc, PinState>(PinFeatures),
	stateValidator: createFrameStateValidator(PinFeatures),
	behavior: createFrameBehavior<PinState>(),
	component: createFrameObject<PinState>(drawSpecShapeBox),
	stencils: [
		{ id: "pin", objectType: "pin", label: "Pin", icon: SpecShapeIcon },
	],
};

const CardFeatures = {
	type: "card",
	geometry: "rect",
	transform: true,
	stroke: false,
	fill: true,
	text: "body",
	radius: false,
	connectable: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CardDocBrand: unique symbol;
type CardDoc = CreateObjectType<typeof CardFeatures, typeof CardDocBrand>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const CardStateBrand: unique symbol;
type CardState = CreateObjectState<typeof CardFeatures, typeof CardStateBrand>;

const CARD_DOC_DEFAULTS: Omit<CardDoc, "id"> = {
	type: "card",
	x: 0,
	y: 0,
	width: 200,
	height: 150,
	// Concrete rather than AUTO_COLOR so the body is opaque whatever the theme:
	// the specs press the shape at its center, which only hits a painted face.
	fill: "#cbd5e1",
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000000",
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "normal",
} as const as CardDoc;

/**
 * Hand-written rather than built with `createFrameObject`: that helper returns a
 * fragment whose first child carries `data-kind` / `data-id`, and the point of
 * this type is the other structure — a `<g>` root with the body and the
 * TextOverlay underneath it.
 */
const CardComponent: React.FC<CardState & TextEditable> = (props) => {
	const {
		id,
		cx,
		cy,
		width,
		height,
		scaleX,
		scaleY,
		rotation,
		fill,
		text,
		isEditing = false,
	} = props;
	const transformAttr = createSvgTransform(scaleX, scaleY, rotation, cx, cy);

	// A "body" type addresses its one slot by name rather than enumerating, the
	// same way createFrameObject does.
	const bodySlot = text?.[BODY_TEXT_SLOT_ID];
	const textRegion = calcFullTextRegion(props);

	return (
		<g data-kind="object" data-id={id}>
			<rect
				x={-width / 2}
				y={-height / 2}
				width={width}
				height={height}
				transform={transformAttr}
				// Through CSS, not the `fill` attribute: an auto value resolves to a
				// `var(--jiscribe-*)` token, which a presentation attribute cannot read.
				style={{ fill: resolveAutoColor(fill, "surface") }}
				pointerEvents="auto"
			/>
			<TextOverlay
				x={textRegion.x}
				y={textRegion.y}
				width={textRegion.width}
				height={textRegion.height}
				transform={transformAttr}
				text={readTextSlot(text, BODY_TEXT_SLOT_ID)}
				textAlign={bodySlot?.textAlign}
				verticalAlign={bodySlot?.verticalAlign}
				fontColor={bodySlot?.fontColor}
				fontSize={bodySlot?.fontSize}
				fontFamily={bodySlot?.fontFamily}
				fontWeight={bodySlot?.fontWeight}
				fontStyle={bodySlot?.fontStyle}
				textDecoration={bodySlot?.textDecoration}
				isEditing={isEditing}
			/>
		</g>
	);
};

const Card = memo(CardComponent);

/**
 * Click-placed shape rooted in a `<g>`, connectable and carrying a body text
 * slot: the stand-in for the specs that used to drive a sticky note. The menu is
 * left to the features-derived default, which gives the text section those specs
 * reach for.
 */
const cardDefinition: ObjectTypeDefinition<CardDoc, CardState> = {
	features: CardFeatures,
	validateDoc: createFrameDocValidator(CardFeatures),
	factory: createFrameObjectFactory(CARD_DOC_DEFAULTS, {
		supportsBounds: false,
	}),
	mapper: createFrameMapper<CardDoc, CardState>(CardFeatures),
	stateValidator: createFrameStateValidator(CardFeatures),
	behavior: createFrameBehavior<CardState>(),
	component: Card,
	stencils: [
		{ id: "card", objectType: "card", label: "Card", icon: SpecShapeIcon },
	],
};

/**
 * The test-only plugin the core e2e harness registers. Registration only makes
 * the stencils exist; `specShapesToolbarEntry` and pinned `pin` / `card` entries
 * are what put them on the bar.
 */
export const specShapesPlugin: CanvasPlugin = {
	id: "spec-shapes",
	objects: {
		tile: tileDefinition,
		pin: pinDefinition,
		card: cardDefinition,
	},
};

/**
 * Category entry holding the `tile` preset, so the flyout spec has a category to
 * open. Composed into the harness `toolbar.layout` the same way a host composes a
 * plugin's own entry.
 */
export const specShapesToolbarEntry: ToolbarEntry = {
	kind: "category",
	id: "spec",
	label: "Spec",
	icon: SpecShapeIcon,
	presetIds: ["tile"],
};
