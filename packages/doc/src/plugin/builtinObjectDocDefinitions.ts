import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import { calcFullBoxTextRegion } from "./ObjectDocTextRegion";
import {
	CONNECTOR_DOC_DEFAULTS,
	CONNECTOR_EXTRA_KEYS,
	ConnectorFeatures,
} from "../model/objects/connector/ConnectorDoc";
import { validateConnectorDoc } from "../model/objects/connector/validateConnectorDoc";
import { calcEllipseTextRegion } from "../model/objects/primitives/ellipse/calcEllipseTextRegion";
import {
	ELLIPSE_DOC_DEFAULTS,
	EllipseFeatures,
} from "../model/objects/primitives/ellipse/EllipseDoc";
import { EllipseObjectFactory } from "../model/objects/primitives/ellipse/EllipseObjectFactory";
import { validateEllipseDoc } from "../model/objects/primitives/ellipse/validateEllipseDoc";
import {
	GROUP_EXTRA_KEYS,
	GroupFeatures,
} from "../model/objects/primitives/group/GroupDoc";
import { validateGroupDoc } from "../model/objects/primitives/group/validateGroupDoc";
import {
	IMAGE_EXTRA_KEYS,
	ImageFeatures,
} from "../model/objects/primitives/image/ImageDoc";
import { validateImageDoc } from "../model/objects/primitives/image/validateImageDoc";
import {
	POLYGON_DOC_DEFAULTS,
	PolygonFeatures,
} from "../model/objects/primitives/polygon/PolygonDoc";
import { PolygonObjectFactory } from "../model/objects/primitives/polygon/PolygonObjectFactory";
import { validatePolygonDoc } from "../model/objects/primitives/polygon/validatePolygonDoc";
import {
	POLYLINE_DOC_DEFAULTS,
	PolylineFeatures,
} from "../model/objects/primitives/polyline/PolylineDoc";
import { PolylineObjectFactory } from "../model/objects/primitives/polyline/PolylineObjectFactory";
import { validatePolylineDoc } from "../model/objects/primitives/polyline/validatePolylineDoc";
import {
	RECT_DOC_DEFAULTS,
	RectFeatures,
} from "../model/objects/primitives/rect/RectDoc";
import { RectObjectFactory } from "../model/objects/primitives/rect/RectObjectFactory";
import { validateRectDoc } from "../model/objects/primitives/rect/validateRectDoc";
import {
	SVG_EXTRA_KEYS,
	SvgFeatures,
} from "../model/objects/primitives/svg/SvgDoc";
import { validateSvgDoc } from "../model/objects/primitives/svg/validateSvgDoc";
import { calcTextDocBounds } from "../model/objects/primitives/text/calcTextDocBounds";
import {
	TEXT_DOC_DEFAULTS,
	TEXT_EXTRA_KEYS,
	TextFeatures,
} from "../model/objects/primitives/text/TextDoc";
import { TextObjectFactory } from "../model/objects/primitives/text/TextObjectFactory";
import { validateTextDoc } from "../model/objects/primitives/text/validateTextDoc";

/**
 * One {@link ObjectDocDefinition} per built-in object type — the single source of
 * truth for the headless (doc) layer of the built-ins. The UI table
 * (`BUILTIN_OBJECT_DEFINITIONS`) spreads each entry and adds its render/interaction
 * fields, and `resolveDocDefinitions` uses them verbatim as the default preset
 * that `createCanvasParser` / `createDocOps` fall back to.
 *
 * When adding a new built-in type, add its entry here (otherwise parse-time
 * structure validation and connectability checks report it as unknown). `factory`
 * is present only for types created programmatically (group / connector / svg /
 * image have none).
 *
 * `textRegion` is declared by every type that holds text: it is what a headless
 * overflow check measures against (`@jiscribe/doc-tools`), and the UI table
 * registers the same calculator, so the two cannot drift. The types carrying no
 * text at all (group / polygon / polyline / connector / svg / image) leave it out.
 *
 * `bounds` is declared by every `geometry: "point"` type — text alone among the
 * built-ins — a doc of one storing no size for anything to read instead. It is
 * built on the same measurement that type's `factory` places by, so a new shape
 * lands on the box a saved one is measured by.
 *
 * `description` / `summary` / `defaults` feed the generated JSON schema and AI docs
 * (`pnpm generate:schema`); types whose schema `$def` is a handwritten template
 * (group / connector / svg / image / polyline / polygon) carry no `description`.
 * `defaults` is declared past that whenever the type has creation defaults to
 * state at all, the draw-time style registries reading the very same field
 * (ObjectShapeStyleDefaultsRegistry); only group, svg and image leave it out.
 */
export const builtinObjectDocDefinitions = {
	rect: {
		features: RectFeatures,
		validateDoc: validateRectDoc,
		factory: RectObjectFactory,
		defaults: RECT_DOC_DEFAULTS,
		textRegion: calcFullBoxTextRegion,
		description: "Rectangle shape.",
		summary: "general-purpose node / label box",
	},
	ellipse: {
		features: EllipseFeatures,
		validateDoc: validateEllipseDoc,
		factory: EllipseObjectFactory,
		defaults: ELLIPSE_DOC_DEFAULTS,
		textRegion: calcEllipseTextRegion,
		description: "Ellipse (oval) shape.",
		summary: "ellipse / oval node (center-based geometry)",
	},
	text: {
		features: TextFeatures,
		validateDoc: validateTextDoc,
		extraKeys: TEXT_EXTRA_KEYS,
		factory: TextObjectFactory,
		defaults: TEXT_DOC_DEFAULTS,
		bounds: calcTextDocBounds,
		// The box comes from the text either way — measured whole in the label
		// layout, wrapped in the stored width in the block one — so nothing can
		// overflow it; the declaration says where the text sits in the box it
		// comes to.
		textRegion: calcFullBoxTextRegion,
		description:
			'Standalone text with no box drawn around it. `x` / `y` are the top-left of the text; its width and height are measured from the content, so they are not stored and growing text extends to the right and down. Under `rotation` or a flip, "right and down" means the shape\'s own axes, `x` / `y` staying put. Set `textLayout: "block"` with a `width` for body copy instead: the text then wraps inside that width, and only the height stays measured.',
		summary: "bare text label / annotation",
	},
	group: {
		features: GroupFeatures,
		validateDoc: validateGroupDoc,
		extraKeys: GROUP_EXTRA_KEYS,
		summary: "container of child objects",
	},
	polygon: {
		features: PolygonFeatures,
		validateDoc: validatePolygonDoc,
		factory: PolygonObjectFactory,
		defaults: POLYGON_DOC_DEFAULTS,
		summary: "closed shape from points",
	},
	polyline: {
		features: PolylineFeatures,
		validateDoc: validatePolylineDoc,
		factory: PolylineObjectFactory,
		defaults: POLYLINE_DOC_DEFAULTS,
		summary: "open line",
	},
	connector: {
		features: ConnectorFeatures,
		validateDoc: validateConnectorDoc,
		extraKeys: CONNECTOR_EXTRA_KEYS,
		defaults: CONNECTOR_DOC_DEFAULTS,
		summary: "edge / arrow between objects",
	},
	svg: {
		features: SvgFeatures,
		validateDoc: validateSvgDoc,
		extraKeys: SVG_EXTRA_KEYS,
		summary: "raw SVG escape hatch (opaque box)",
	},
	image: {
		features: ImageFeatures,
		validateDoc: validateImageDoc,
		extraKeys: IMAGE_EXTRA_KEYS,
		summary:
			"picture file (raster or SVG) under the .jis directory (opaque box)",
	},
} satisfies Readonly<Record<string, ObjectDocDefinition>>;
