import {
	isArray,
	isCssSafeValue,
	isNumber,
	isString,
} from "@jiscribe/basic-validators";
import type { ArrowStyleDoc } from "@jiscribe/doc/model/objects/base/ArrowStyleDoc";
import type { FillStyleDoc } from "@jiscribe/doc/model/objects/base/FillStyleDoc";
import type { RadiusStyleDoc } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import { CORNER_RADIUS_MIN } from "@jiscribe/doc/model/objects/base/RadiusStyleDoc";
import type { StrokeStyleDoc } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import { STROKE_WIDTH_MIN } from "@jiscribe/doc/model/objects/base/StrokeStyleDoc";
import { isArrowType } from "@jiscribe/doc/model/objects/types/ArrowType";
import { isOwnedEndpointRef } from "@jiscribe/doc/model/objects/types/EndpointRef";
import type { GeometryType } from "@jiscribe/doc/model/objects/types/GeometryType";
import { GEOMETRY_SIZE_MIN } from "@jiscribe/doc/model/objects/types/GeometryType";
import type { ObjectFeatures } from "@jiscribe/doc/model/objects/types/ObjectFeatures";
import type { ObjectType } from "@jiscribe/doc/model/objects/types/ObjectType";
import { isPoly } from "@jiscribe/doc/model/objects/types/Poly";
import type {
	InlineTextStyle,
	RichText,
} from "@jiscribe/doc/model/objects/types/RichText";
import { FONT_SIZE_MIN } from "@jiscribe/doc/model/objects/types/RichText";
import { isStrokeDashType } from "@jiscribe/doc/model/objects/types/StrokeDashType";
import { isTextAlign } from "@jiscribe/doc/model/objects/types/TextAlign";
import type {
	TextSlot,
	TextSlotStyle,
} from "@jiscribe/doc/model/objects/types/TextSlot";
import { isTextRows } from "@jiscribe/doc/model/objects/types/TextSlot";
import { isVerticalAlign } from "@jiscribe/doc/model/objects/types/VerticalAlign";
import { isAutoColor } from "@jiscribe/doc/model/objects/utils/autoColor";
import { validateEndpointRef } from "@jiscribe/doc/model/objects/utils/validateDocUtils";
import { BODY_TEXT_SLOT_ID } from "@jiscribe/doc/text/style/textSlotId";

import { isCssColor } from "./isCssColor";
import { isTextStyleState } from "../base/TextStyleState";
import { isTransformState } from "../base/TransformState";

/**
 * Shared helpers for validating clipboard-derived `ObjectState` (= arbitrary untrusted objects)
 * by type. They use the type-guard style returning boolean, consistent with the state layer's
 * existing guards (`isTransformState` / `isTextStyleState` / `isGroupState`, etc.).
 *
 * Two checks are applied to style strings, and they answer different questions.
 * `isCssSafeValue` rejects CSS injection; `isValidColorValue` additionally asks whether the
 * value is a color at all. The latter is browser-only (`CSS.supports`), which is why it can
 * be used here and not in the schema-layer guards: everything below runs behind
 * `isClipboardData`, i.e. only where a paste happens.
 *
 * That browser dependency also means a color cannot be exercised from the node test suite —
 * calling into `isCssColor` there throws. Colors are covered by the paste e2e instead; the
 * unit tests here stay on what node can reach (ranges, enums, the `"auto"` sentinel, and
 * injection strings, which `isCssSafeValue` rejects before `CSS` is ever touched).
 *
 * Which fields a style group holds is not restated here: each group's table is keyed by the
 * very type the doc-side one is (`Record<keyof StrokeStyleDoc, …>`, ...), so a field the
 * group gains has to be given a check on both sides or fails to compile on both. Only the
 * predicates differ between the two boundaries — the column of fields cannot.
 */
export type StateRecord = Record<string, unknown>;

/**
 * Validates a required numeric field: it must be a number and, when `min` is given, meet the lower bound.
 * The bound itself is never written here — it is passed in from the constant the
 * field's group declares (GEOMETRY_SIZE_MIN and friends), which the doc side reads
 * as well, so the two boundaries cannot come to hold different numbers.
 */
const isValidRequiredNumber = (value: unknown, min?: number): boolean =>
	isNumber(value) && (min === undefined || value >= min);

/** Validates that id is a non-empty string and type matches the expected value. */
export const hasValidIdAndType = (o: StateRecord, type: ObjectType): boolean =>
	isString(o.id) && o.id.length > 0 && o.type === type;

/**
 * Validates Frame geometry (cx / cy / width / height are numbers).
 * width / height have minimum: 0 in the schema (positions cx / cy have no lower bound).
 */
export const isValidFrameState = (o: StateRecord): boolean =>
	isNumber(o.cx) &&
	isNumber(o.cy) &&
	isValidRequiredNumber(o.width, GEOMETRY_SIZE_MIN) &&
	isValidRequiredNumber(o.height, GEOMETRY_SIZE_MIN);

/**
 * Validates the height-follows-the-text flag (ObjectState.autoHeight): true or
 * absent for a shape whose doc stores a `height` to leave out, absent for every
 * other geometry. This is the clipboard boundary, and the flag decides whether
 * the mapper writes a `height` at all, so a stray one would save a doc missing a
 * field its type requires.
 *
 * @param o - The state record to check
 * @param geometry - The type's declared geometry; only `"rect"` may carry the flag
 */
export const isValidAutoHeightState = (
	o: StateRecord,
	geometry: GeometryType,
): boolean =>
	o.autoHeight === undefined || (geometry === "rect" && o.autoHeight === true);

/**
 * Validates Poly geometry (the points array). `minPoints` is the minimum point count,
 * which each poly type declares beside its features (POLYLINE_MIN_POINTS /
 * POLYGON_MIN_POINTS) and passes to the Doc-side `validatePolyFields` as well.
 */
export const isValidPolyState = (o: StateRecord, minPoints: number): boolean =>
	isPoly(o) && o.points.length >= minPoints;

/**
 * Connector invariant: at least one endpoint must be owned.
 * Both ends free (no owner) is equivalent to ink(polyline) and invalid as a connector.
 * Corresponds to the same-named rule in the Doc-side `validateConnectorDoc`.
 */
export const hasOwnedEndpoint = (source: unknown, target: unknown): boolean =>
	isOwnedEndpointRef(source) || isOwnedEndpointRef(target);

/**
 * Validates a value used as a color: safe to put in a CSS context, and a color the CSS
 * parser recognises. The two are independent — `"notacolor"` is safe but not a color,
 * `"red; } body {"` is a color-ish prefix but not safe — so both have to hold.
 *
 * The `"auto"` sentinel (theme-following, issue #38) is checked first: `CSS.supports` does
 * not know it, and it is what several shapes carry by default, so reaching `isCssColor`
 * with it would reject ordinary documents.
 *
 * Browser-only, through `isCssColor`. Every caller sits behind `isClipboardData`.
 *
 * @param value - Value to check; non-strings fail at `isCssSafeValue` without reaching `CSS`
 */
export const isValidColorValue = (value: unknown): boolean =>
	isCssSafeValue(value) && (isAutoColor(value) || isCssColor(value));

/** Validates TransformState (rotation / scaleX / scaleY are numbers). */
export const isValidTransformState = (o: StateRecord): boolean =>
	isTransformState(o);

/**
 * How one field's value is checked at the paste boundary: true when the value is
 * admissible. The boolean counterpart of the doc side's `DocFieldValidator`.
 */
export type StateFieldValidator = (value: unknown) => boolean;

/**
 * Builds a validator for a numeric field.
 *
 * @param min - Lower bound, inclusive — the schema's `minimum` for the field; omitted leaves the number unbounded
 * @returns A predicate true for a number meeting the bound
 */
export const numberValidator =
	(min?: number): StateFieldValidator =>
	(value) =>
		isValidRequiredNumber(value, min);

/**
 * Builds a validator for a numeric field bounded at both ends.
 *
 * @param min - Smallest admissible value, inclusive
 * @param max - Largest admissible value, inclusive
 * @returns A predicate true for a number inside the range
 */
export const numberRangeValidator =
	(min: number, max: number): StateFieldValidator =>
	(value) =>
		isNumber(value) && value >= min && value <= max;

/**
 * Validates the fields of one group, each against the validator the group's table
 * gives it — the doc side runs the same walk over a table keyed by the same type
 * (`validateFields`), which is what keeps the two boundaries covering one column
 * of fields.
 *
 * @param o - The untrusted state record to check; keys outside the table are ignored
 * @param validators - The group's table
 * @returns True when every field is unspecified (absent / undefined) or valid
 */
export const hasValidFields = (
	o: StateRecord,
	validators: Readonly<Record<string, StateFieldValidator>>,
): boolean =>
	Object.entries(validators).every(
		([key, isValid]) => o[key] === undefined || isValid(o[key]),
	);

/** The stroke group's fields; colors are held to being colors, unlike on the doc side. */
const strokeStyleValidators = {
	stroke: isValidColorValue,
	strokeWidth: numberValidator(STROKE_WIDTH_MIN),
	strokeDashType: isStrokeDashType,
} as const satisfies Record<keyof StrokeStyleDoc, StateFieldValidator>;

/** The fill group's fields. */
const fillStyleValidators = {
	fill: isValidColorValue,
} as const satisfies Record<keyof FillStyleDoc, StateFieldValidator>;

/** The corner-radius group's fields. */
const radiusStyleValidators = {
	rx: numberValidator(CORNER_RADIUS_MIN),
} as const satisfies Record<keyof RadiusStyleDoc, StateFieldValidator>;

/** The arrowhead group's fields. */
const arrowStyleValidators = {
	startArrow: isArrowType,
	endArrow: isArrowType,
} as const satisfies Record<keyof ArrowStyleDoc, StateFieldValidator>;

/**
 * The inline typography. Applied to a slot and to every run of its text alike, a
 * run being inlined into the same CSS wherever it sits.
 */
const inlineTextStyleValidators = {
	fontColor: isValidColorValue,
	fontSize: numberValidator(FONT_SIZE_MIN),
	fontFamily: isCssSafeValue,
	fontWeight: isCssSafeValue,
	fontStyle: isCssSafeValue,
	textDecoration: isCssSafeValue,
} as const satisfies Record<keyof InlineTextStyle, StateFieldValidator>;

/** A slot's whole styling: the alignment that places the block, plus the inline half. */
const textSlotStyleValidators = {
	textAlign: isTextAlign,
	verticalAlign: isVerticalAlign,
	...inlineTextStyleValidators,
} as const satisfies Record<keyof TextSlotStyle, StateFieldValidator>;

/** Validates StrokeStyleState's optional fields for type/safety when present. */
export const isValidStrokeStyleState = (o: StateRecord): boolean =>
	hasValidFields(o, strokeStyleValidators);

/** Validates FillStyleState's fill as a color when present. */
export const isValidFillStyleState = (o: StateRecord): boolean =>
	hasValidFields(o, fillStyleValidators);

/**
 * Validates one styling group beyond its declared types: CSS-injection safety for
 * fontFamily / fontWeight / fontStyle / textDecoration / fontColor (which `isTextSlot`
 * only checks via `isString`), strict color validity for fontColor, and the schema's
 * fontSize minimum. Applied to every run of a text — a run is inlined into the same
 * CSS wherever it sits, so it is the same boundary as the slot around it.
 */
const isValidInlineTextStyle = (style: InlineTextStyle): boolean =>
	hasValidFields(style, inlineTextStyleValidators);

/** Validates the styling of every run one body of text is styled in; a plain string carries none. */
const isValidRichTextStyle = (content: RichText): boolean =>
	isString(content) || content.every(isValidInlineTextStyle);

/**
 * Validates a slot's own styling and that of every run its text is styled in,
 * row-partitioned content included: a run is inlined into the same CSS wherever
 * it sits, so a row is no less of a boundary than a single body.
 *
 * The slot walks the whole slot table, alignment included. `isTextSlot` already
 * checks the two alignment fields with the same guards, so this re-checks rather
 * than widens — and it is the table, not this call site, that has to grow when
 * the slot gains a field.
 */
const isValidTextSlotStyle = (slot: TextSlot): boolean =>
	hasValidFields(slot, textSlotStyleValidators) &&
	(isTextRows(slot.text)
		? slot.text.every(isValidRichTextStyle)
		: isValidRichTextStyle(slot.text));

/**
 * Whether the slot keys are the set `textShape` declares. A `"body"` type holds
 * exactly the one `body` slot: the mapper materializes it even for a doc with
 * neither text nor styling (see TextSlotsMapper), so a state missing it, or
 * carrying a key beside it, never came through the mapper. Left unchecked, such
 * a key would be drawn and editable yet dropped on save, since `mapTextStateToDoc`
 * reads only `body`. A `"slots"` type's key set is the type's own to pin
 * (see validateRecordState), so it passes here.
 */
const hasDeclaredTextSlots = (
	text: unknown,
	textShape: ObjectFeatures["text"],
): boolean => {
	if (textShape !== "body") {
		return true;
	}
	const slotIds = Object.keys(text ?? {});
	return slotIds.length === 1 && slotIds[0] === BODY_TEXT_SLOT_ID;
};

/**
 * In addition to TextStyleState validity, validates the slot key set against the
 * type's declared text shape, and each slot's styling for CSS safety, color
 * validity, and the fontSize minimum — the boundary checks that `isTextSlot`
 * leaves out because they need browser APIs the schema layer cannot reach.
 *
 * @param o - The untrusted state record to check
 * @param textShape - The type's `features.text`; decides which slot keys are
 *   admissible (see {@link hasDeclaredTextSlots})
 */
export const isValidTextStyleState = (
	o: StateRecord,
	textShape: ObjectFeatures["text"],
): boolean =>
	isTextStyleState(o) &&
	hasDeclaredTextSlots(o.text, textShape) &&
	Object.values(o.text ?? {}).every(isValidTextSlotStyle);

/** Validates RadiusStyleState's rx as a number (minimum: 0 in the schema) when present. */
export const isValidRadiusStyleState = (o: StateRecord): boolean =>
	hasValidFields(o, radiusStyleValidators);

/** Validates arrow ends (startArrow / endArrow) as ArrowType when present. */
export const isValidArrowFields = (o: StateRecord): boolean =>
	hasValidFields(o, arrowStyleValidators);

/**
 * Validates that childIds is a non-empty array of strings.
 * An empty group is a degenerate state where bounds are undefined, and creation paths always
 * produce children, so an empty array is treated as corruption and rejected (corresponds to the
 * empty-children rejection in the Doc-side validateStructure).
 * Whether the child IDs actually exist in `objects` (self-containedness) is cross-validated by isClipboardData.
 */
export const isValidChildIds = (o: StateRecord): boolean =>
	isArray(o.childIds) && o.childIds.length > 0 && o.childIds.every(isString);

/** Validates that a connector's endpoint reference (EndpointRef) is valid. */
export const isValidEndpointRefState = (ref: unknown): boolean =>
	validateEndpointRef(ref, "").length === 0;
