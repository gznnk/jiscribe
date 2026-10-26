/**
 * Shapes that exist only so the core e2e specs have something to drive: a
 * drag-drawn `tile` listed in a category flyout, a click-placed `pin` on the
 * rail, a `card` that roots its render in a `<g>` and carries a text slot, a
 * `panel` that declares creation defaults of its own, and a `memo` whose body is
 * written in a source language (`features.text: "source"`).
 * `tile` also leads its sidebar with a dropdown that opens beside the sidebar
 * (TileWideFillProperty).
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
import {
	AUTO_COLOR,
	DEFAULT_FONT_FAMILY,
	createFrameDocValidator,
	createFrameObjectFactory,
} from "@jiscribe/doc/unstable";
import { memo } from "react";

import type {
	CanvasPlugin,
	PropertyPanelItemProps,
	PropertyPanelSection,
	CreateObjectState,
	CreateObjectType,
	ObjectFeatures,
	ObjectTypeDefinition,
	StencilCategory,
	StencilIconProps,
} from "../../src";
import { BODY_TEXT_SLOT_ID } from "../../src";
import type { FrameShapeProps, TextEditable } from "../../src/unstable";
import {
	PropertyDropdownField,
	PropertyRow,
	TextOverlay,
	calcFullTextRegion,
	createFrameBehavior,
	createFrameMapper,
	createFrameObject,
	createDefaultPropertyPanel,
	createFrameStateValidator,
	createSvgTransform,
	readTextSlot,
	resolveAutoColor,
	setAction,
} from "../../src/unstable";

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

/**
 * Fills a tile's panel offers. Spelled as the core palette's swatches are, so a
 * spec can compare the computed fill with what it pressed.
 */
const TILE_WIDE_FILLS = ["#dc2626", "#2563eb"];

/**
 * Width (px) of the tile's wide panel: more than the sidebar's, so only a panel
 * opened beside the sidebar has it in full.
 */
const TILE_WIDE_PANEL_WIDTH = 320;

/**
 * A fill row whose panel opens beside the sidebar (`placement: "beside"`), for
 * the specs of that placement: a row of fill buttons wider than the sidebar.
 */
const TileWideFillProperty: React.FC<PropertyPanelItemProps> = () => (
	<PropertyRow>
		<PropertyDropdownField
			title="Wide Fill"
			placement="beside"
			preview="Wide Fill"
		>
			<div
				data-testid="tile-wide-fill-panel"
				style={{
					display: "flex",
					gap: 8,
					width: TILE_WIDE_PANEL_WIDTH,
					maxWidth: "100%",
					padding: 8,
					boxSizing: "border-box",
				}}
			>
				{TILE_WIDE_FILLS.map((fill) => (
					<button
						key={fill}
						type="button"
						data-action={setAction("fill", fill)}
					>
						{fill}
					</button>
				))}
			</div>
		</PropertyDropdownField>
	</PropertyRow>
);

/** The wide fill section, then the sections the features derive. */
const TILE_PROPERTY_PANEL: PropertyPanelSection[] = [
	{
		id: "tileWideFill",
		label: "Wide Fill",
		items: [
			{
				type: "custom",
				id: "tileWideFill",
				component: TileWideFillProperty,
			},
		],
	},
	...createDefaultPropertyPanel(TileFeatures),
];

/**
 * Drag-drawn shape; `tile` is the only member of the `spec` category flyout, and
 * `brick` (a second preset of the same type) is registered but listed nowhere, so
 * the stencil panels reach it only through the category's `search`.
 */
const tileDefinition: ObjectTypeDefinition<TileDoc, TileState> = {
	features: TileFeatures,
	validateDoc: createFrameDocValidator(TileFeatures),
	factory: createFrameObjectFactory(TILE_DOC_DEFAULTS),
	mapper: createFrameMapper<TileDoc, TileState>(TileFeatures),
	stateValidator: createFrameStateValidator(TileFeatures),
	behavior: createFrameBehavior<TileState>(),
	component: createFrameObject<TileState>(drawSpecShapeBox),
	propertyPanel: TILE_PROPERTY_PANEL,
	stencils: [
		{ id: "tile", objectType: "tile", label: "Tile", icon: SpecShapeIcon },
		{ id: "brick", objectType: "tile", label: "Brick", icon: SpecShapeIcon },
	],
};

/**
 * The panel's box. Same shape as `drawSpecShapeBox`, but the fill goes through
 * CSS: an `"auto"` fill resolves to a `var(--jiscribe-*)` token, which an SVG
 * presentation attribute cannot read.
 */
const drawPanelBox = (
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
		style={{ fill: fillColor }}
		pointerEvents="auto"
	/>
);

const PanelFeatures = {
	type: "panel",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PanelDocBrand: unique symbol;
type PanelDoc = CreateObjectType<typeof PanelFeatures, typeof PanelDocBrand>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const PanelStateBrand: unique symbol;
type PanelState = CreateObjectState<
	typeof PanelFeatures,
	typeof PanelStateBrand
>;

const PANEL_DOC_DEFAULTS: Omit<PanelDoc, "id"> = {
	type: "panel",
	x: 0,
	y: 0,
	width: 100,
	height: 100,
	fill: AUTO_COLOR,
	stroke: AUTO_COLOR,
	strokeWidth: 4,
} as const as PanelDoc;

/**
 * The only spec shape declaring its creation defaults to the registries
 * (`defaults`), and the only one whose fill is AUTO_COLOR rather than
 * transparent: the type a document has to omit `fill` / `strokeWidth` on for the
 * three-step resolution to be visible (default-fill.spec.ts). Off the rail and
 * listed only by the `mixed` category (`specMixedStencilCategory`), so no other
 * category claims a document using it.
 */
const panelDefinition: ObjectTypeDefinition<PanelDoc, PanelState> = {
	features: PanelFeatures,
	defaults: PANEL_DOC_DEFAULTS,
	validateDoc: createFrameDocValidator(PanelFeatures),
	factory: createFrameObjectFactory(PANEL_DOC_DEFAULTS),
	mapper: createFrameMapper<PanelDoc, PanelState>(PanelFeatures),
	stateValidator: createFrameStateValidator(PanelFeatures),
	behavior: createFrameBehavior<PanelState>(),
	component: createFrameObject<PanelState>(drawPanelBox),
	stencils: [
		{ id: "panel", objectType: "panel", label: "Panel", icon: SpecShapeIcon },
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

const MemoFeatures = {
	type: "memo",
	geometry: "rect",
	transform: true,
	stroke: false,
	fill: true,
	text: "source",
} as const satisfies ObjectFeatures;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MemoDocBrand: unique symbol;
type MemoDoc = CreateObjectType<typeof MemoFeatures, typeof MemoDocBrand>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const MemoStateBrand: unique symbol;
type MemoState = CreateObjectState<typeof MemoFeatures, typeof MemoStateBrand>;

const MEMO_DOC_DEFAULTS: Omit<MemoDoc, "id"> = {
	type: "memo",
	x: 0,
	y: 0,
	width: 200,
	height: 150,
	// Concrete rather than AUTO_COLOR, for the same reason the card's is: the
	// specs press the shape at its center, which only hits a painted face.
	fill: "#cbd5e1",
	text: "",
	textAlign: "center",
	verticalAlign: "middle",
	fontColor: "#000000",
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
} as const as MemoDoc;

/**
 * Click-placed shape whose body is source text: the stand-in for a type that
 * renders its own syntax (the markdown card). Its body is drawn by the shared
 * text overlay all the same — what the specs drive is the styling side, where
 * `"source"` differs: a plain string only, and no emphasis typography.
 */
const memoDefinition: ObjectTypeDefinition<MemoDoc, MemoState> = {
	features: MemoFeatures,
	defaults: MEMO_DOC_DEFAULTS,
	validateDoc: createFrameDocValidator(MemoFeatures),
	factory: createFrameObjectFactory(MEMO_DOC_DEFAULTS, {
		supportsBounds: false,
	}),
	mapper: createFrameMapper<MemoDoc, MemoState>(MemoFeatures),
	stateValidator: createFrameStateValidator(MemoFeatures),
	behavior: createFrameBehavior<MemoState>(),
	component: createFrameObject<MemoState>(drawSpecShapeBox),
	stencils: [
		{ id: "memo", objectType: "memo", label: "Memo", icon: SpecShapeIcon },
	],
};

/**
 * The test-only plugin the core e2e harness registers. Registration only makes
 * the stencils exist; `specShapesStencilCategory` and the `pin` / `card` / `memo`
 * rail presets are what put them on the rail.
 */
export const specShapesPlugin: CanvasPlugin = {
	id: "spec-shapes",
	objects: {
		tile: tileDefinition,
		pin: pinDefinition,
		card: cardDefinition,
		panel: panelDefinition,
		memo: memoDefinition,
	},
};

/** Every preset the `spec` category holds, listed in `presetIds` or not. */
const SPEC_CATEGORY_PRESETS = [
	{ id: "tile", label: "Tile" },
	{ id: "brick", label: "Brick" },
];

/**
 * Category listing the `tile` preset, so the flyout spec has a category to
 * open, and holding `brick` beyond it for the panel search to reach. Composed
 * into the harness `stencilLibrarySections` and pinned through
 * `pinnedCategoryIds` the same way a host composes a plugin's own category.
 */
export const specShapesStencilCategory: StencilCategory = {
	id: "spec",
	label: "Spec",
	icon: SpecShapeIcon,
	presetIds: ["tile"],
	search: (query) => {
		const needle = query.toLowerCase();
		const presetIds = SPEC_CATEGORY_PRESETS.filter((preset) =>
			preset.label.toLowerCase().includes(needle),
		).map((preset) => preset.id);
		return { presetIds, matchCount: presetIds.length };
	},
};

/**
 * Category listing `panel` beside core's `rect`, the way flowchart lists its
 * rect-typed `process` beside types of its own: a plain rectangle drawn from the
 * rail must not count toward it, and a panel must. Neither pinned nor using a
 * rail preset's type otherwise, so it is the one the rail adds for a document
 * (stencil-rail-auto.spec.ts).
 */
export const specMixedStencilCategory: StencilCategory = {
	id: "mixed",
	label: "Mixed",
	icon: SpecShapeIcon,
	presetIds: ["panel", "rect"],
};
