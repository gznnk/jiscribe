import { AUTO_COLOR, DEFAULT_FONT_FAMILY } from "@jiscribe/canvas-sdk/doc";
import { DEFAULT_FILL, DEFAULT_STROKE_WIDTH } from "@jiscribe/doc";
import type {
	CreateObjectType,
	ExtraStylePropertyDescriptor,
	ObjectFeatures,
} from "@jiscribe/doc";

/**
 * The kinds of frame. The list AWS's own PowerPoint toolkit
 * (AWS-Architecture-Icons-Deck) draws, and what the border colour, the line
 * style and the corner badge all follow from (awsGroupKinds.ts).
 */
export const AWS_GROUP_KINDS = [
	"aws-cloud",
	"aws-cloud-plain",
	"region",
	"availability-zone",
	"vpc",
	"public-subnet",
	"private-subnet",
	"security-group",
	"auto-scaling-group",
	"aws-account",
	"corporate-data-center",
	"server-contents",
	"ec2-instance-contents",
	"spot-fleet",
	"iot-greengrass-deployment",
	"iot-greengrass",
	"elastic-beanstalk-container",
	"step-functions-workflow",
	"generic",
] as const;

export type AwsGroupKind = (typeof AWS_GROUP_KINDS)[number];

/** The kind used when `kind` is omitted: a generic frame tied to no AWS service. */
export const DEFAULT_AWS_GROUP_KIND: AwsGroupKind = "generic";

/**
 * Whether the value is one of the frame kinds.
 *
 * @param value - an unchecked value off a doc or a state
 * @returns true for any of {@link AWS_GROUP_KINDS}
 */
export const isAwsGroupKind = (value: unknown): value is AwsGroupKind =>
	AWS_GROUP_KINDS.includes(value as AwsGroupKind);

/** Side of the corner badge in local px. Kept inside the frame, as AWS draws it. */
export const AWS_GROUP_CORNER_ICON_SIZE = 24;

/** Padding between the border and the corner badge / the label. */
export const AWS_GROUP_PADDING = 8;

/** Gap between the corner badge and the label. */
export const AWS_GROUP_LABEL_GAP = 6;

/**
 * The boundary frame of an AWS architecture diagram — a VPC, a subnet — with the
 * kind's badge in the top-left corner and the label beside it.
 *
 * Like container, it does not *hold* what it surrounds: geometry and paint order
 * are all that put objects inside it (moving the frame leaves them behind; wrap
 * them in a group to move them together). Its body is click-through, so the
 * shapes lying over it stay selectable.
 *
 * The border colour and line style follow from `kind` (awsGroupKinds.ts), so
 * they are not declared as type defaults; an object writing `stroke` /
 * `strokeDashType` of its own wins over the kind.
 */
export const AwsGroupFeatures = {
	type: "awsGroup",
	geometry: "rect",
	transform: true,
	stroke: true,
	fill: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/** The style properties of this shape that no ObjectFeatures flag covers. */
export const AwsGroupExtraStyleProperties = {
	kind: { valueType: "string" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const AwsGroupDocBrand: unique symbol;

export type AwsGroupDoc = CreateObjectType<
	typeof AwsGroupFeatures,
	typeof AwsGroupDocBrand,
	{
		/**
		 * Which frame this is (`vpc`, `public-subnet`, `region`, …; AWS_GROUP_KINDS
		 * lists them all). The border colour, the line style and the corner badge
		 * follow from it. Omitted = {@link DEFAULT_AWS_GROUP_KIND}
		 */
		kind?: string;
	}
>;

/** The doc fields of this shape alone; the doc definition's `extraKeys`. */
export const AwsGroupExtraKeys = [
	"kind",
] as const satisfies readonly (keyof AwsGroupDoc)[];

/**
 * The defaults a newly created frame carries. `stroke` and `strokeDashType` are
 * absent: colour and line style come from `kind`, and a type holds one default
 * apiece, which could express one of the nineteen kinds. Leaving the type's rung
 * of the three (object → type default → SHAPE_STYLE_FALLBACK) empty lets the
 * drawing side fill it from the kind (presentation/resolveAwsGroupStroke.ts).
 */
export const AWS_GROUP_DOC_DEFAULTS: Omit<AwsGroupDoc, "id"> = {
	type: "awsGroup",
	x: 0,
	y: 0,
	width: 320,
	height: 200,
	kind: DEFAULT_AWS_GROUP_KIND,
	fill: DEFAULT_FILL,
	strokeWidth: DEFAULT_STROKE_WIDTH,
	text: "",
	textAlign: "left",
	verticalAlign: "middle",
	fontColor: AUTO_COLOR,
	fontSize: 14,
	fontFamily: DEFAULT_FONT_FAMILY,
	fontWeight: "bold",
} as const as AwsGroupDoc;

/**
 * The line styles. `@jiscribe/doc` does not export the type itself, so it is
 * taken off the field of the doc type the features derived — writing the
 * spellings out again would drift silently the day the engine adds one.
 */
export type AwsGroupDashType = NonNullable<AwsGroupDoc["strokeDashType"]>;
