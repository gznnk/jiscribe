import type { ObjectDocDefinition } from "./ObjectDocDefinition";
import { calcFullBoxTextRegion } from "./ObjectDocTextRegion";
import {
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
import { GroupFeatures } from "../model/objects/primitives/group/GroupDoc";
import { validateGroupDoc } from "../model/objects/primitives/group/validateGroupDoc";
import { PolygonFeatures } from "../model/objects/primitives/polygon/PolygonDoc";
import { PolygonObjectFactory } from "../model/objects/primitives/polygon/PolygonObjectFactory";
import { validatePolygonDoc } from "../model/objects/primitives/polygon/validatePolygonDoc";
import { PolylineFeatures } from "../model/objects/primitives/polyline/PolylineDoc";
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
 * (`ALL_OBJECT_DEFINITIONS`) spreads each entry and adds its render/interaction
 * fields, and `resolveDocDefinitions` uses them verbatim as the default preset
 * that `createCanvasParser` / `createDocOps` fall back to.
 *
 * When adding a new built-in type, add its entry here (otherwise parse-time
 * structure validation and connectability checks report it as unknown). `factory`
 * is present only for types created programmatically (group / connector / svg have none).
 *
 * `textRegion` is declared by every type that holds text: it is what a headless
 * overflow check measures against (`@jiscribe/doc-tools`), and the UI table
 * registers the same calculator, so the two cannot drift. The types carrying no
 * text at all (group / polygon / polyline / connector / svg) leave it out.
 *
 * `description` / `summary` / `defaults` feed the generated JSON schema and AI docs
 * (`pnpm generate:schema`); types whose schema `$def` is a handwritten template
 * (group / connector / svg / polyline / polygon) carry only `summary`.
 */
export const builtinObjectDocDefinitions = {
	rect: {
		features: RectFeatures,
		validateDoc: validateRectDoc,
		factory: RectObjectFactory,
		textRegion: calcFullBoxTextRegion,
		description: "Rectangle shape.",
		summary: "general-purpose node / label box",
		defaults: RECT_DOC_DEFAULTS,
	},
	ellipse: {
		features: EllipseFeatures,
		validateDoc: validateEllipseDoc,
		factory: EllipseObjectFactory,
		textRegion: calcEllipseTextRegion,
		description: "Ellipse (oval) shape.",
		summary: "ellipse / oval node (center-based geometry)",
		defaults: ELLIPSE_DOC_DEFAULTS,
	},
	text: {
		features: TextFeatures,
		validateDoc: validateTextDoc,
		factory: TextObjectFactory,
		// The box comes from the text either way — measured whole in the label
		// layout, wrapped in the stored width in the block one — so nothing can
		// overflow it; the declaration says where the text sits in the box it
		// comes to.
		textRegion: calcFullBoxTextRegion,
		extraKeys: TEXT_EXTRA_KEYS,
		description:
			'Standalone text with no box drawn around it. `x` / `y` are the top-left of the text; its width and height are measured from the content, so they are not stored and growing text extends to the right and down. Under `rotation` or a flip, "right and down" means the shape\'s own axes, `x` / `y` staying put. Set `textLayout: "block"` with a `width` for body copy instead: the text then wraps inside that width, and only the height stays measured.',
		summary: "bare text label / annotation",
		defaults: TEXT_DOC_DEFAULTS,
	},
	group: {
		features: GroupFeatures,
		validateDoc: validateGroupDoc,
		summary: "container of child objects",
	},
	polygon: {
		features: PolygonFeatures,
		validateDoc: validatePolygonDoc,
		factory: PolygonObjectFactory,
		summary: "closed shape from points",
	},
	polyline: {
		features: PolylineFeatures,
		validateDoc: validatePolylineDoc,
		factory: PolylineObjectFactory,
		summary: "open line",
	},
	connector: {
		features: ConnectorFeatures,
		validateDoc: validateConnectorDoc,
		extraKeys: CONNECTOR_EXTRA_KEYS,
		summary: "edge / arrow between objects",
	},
	svg: {
		features: SvgFeatures,
		validateDoc: validateSvgDoc,
		extraKeys: SVG_EXTRA_KEYS,
		summary: "raw SVG escape hatch (opaque box)",
	},
} satisfies Readonly<Record<string, ObjectDocDefinition>>;
