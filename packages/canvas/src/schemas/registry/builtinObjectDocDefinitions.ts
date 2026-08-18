import {
	CONNECTOR_EXTRA_KEYS,
	ConnectorFeatures,
} from "../objects/connector/ConnectorDoc";
import { validateConnectorDoc } from "../objects/connector/validateConnectorDoc";
import {
	ELLIPSE_DOC_DEFAULTS,
	EllipseFeatures,
} from "../objects/primitives/ellipse/EllipseDoc";
import { EllipseObjectFactory } from "../objects/primitives/ellipse/EllipseObjectFactory";
import { validateEllipseDoc } from "../objects/primitives/ellipse/validateEllipseDoc";
import { GroupFeatures } from "../objects/primitives/group/GroupDoc";
import { validateGroupDoc } from "../objects/primitives/group/validateGroupDoc";
import { PolygonFeatures } from "../objects/primitives/polygon/PolygonDoc";
import { PolygonObjectFactory } from "../objects/primitives/polygon/PolygonObjectFactory";
import { validatePolygonDoc } from "../objects/primitives/polygon/validatePolygonDoc";
import { PolylineFeatures } from "../objects/primitives/polyline/PolylineDoc";
import { PolylineObjectFactory } from "../objects/primitives/polyline/PolylineObjectFactory";
import { validatePolylineDoc } from "../objects/primitives/polyline/validatePolylineDoc";
import {
	RECT_DOC_DEFAULTS,
	RectFeatures,
} from "../objects/primitives/rect/RectDoc";
import { RectObjectFactory } from "../objects/primitives/rect/RectObjectFactory";
import { validateRectDoc } from "../objects/primitives/rect/validateRectDoc";
import { SVG_EXTRA_KEYS, SvgFeatures } from "../objects/primitives/svg/SvgDoc";
import { validateSvgDoc } from "../objects/primitives/svg/validateSvgDoc";
import {
	TEXT_DOC_DEFAULTS,
	TextFeatures,
} from "../objects/primitives/text/TextDoc";
import { TextObjectFactory } from "../objects/primitives/text/TextObjectFactory";
import { validateTextDoc } from "../objects/primitives/text/validateTextDoc";
import type { ObjectDocDefinition } from "../plugin/ObjectDocDefinition";

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
 * `description` / `summary` / `defaults` feed the generated JSON schema and AI docs
 * (`pnpm generate:ai`); types whose schema `$def` is a handwritten template
 * (group / connector / svg / polyline / polygon) carry only `summary`.
 */
export const builtinObjectDocDefinitions = {
	rect: {
		features: RectFeatures,
		validateDoc: validateRectDoc,
		factory: RectObjectFactory,
		description: "Rectangle shape.",
		summary: "general-purpose node / label box",
		defaults: RECT_DOC_DEFAULTS,
	},
	ellipse: {
		features: EllipseFeatures,
		validateDoc: validateEllipseDoc,
		factory: EllipseObjectFactory,
		description: "Ellipse (oval) shape.",
		summary: "ellipse / oval node (center-based geometry)",
		defaults: ELLIPSE_DOC_DEFAULTS,
	},
	text: {
		features: TextFeatures,
		validateDoc: validateTextDoc,
		factory: TextObjectFactory,
		description:
			'Standalone text with no box drawn around it. `x` / `y` are the top-left of the text; its width and height are measured from the content, so they are not stored and growing text extends to the right and down. Under `rotation` or a flip, "right and down" means the shape\'s own axes, `x` / `y` staying put.',
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
