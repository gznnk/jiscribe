import { BELOW_LABEL_STYLE_DEFAULTS } from "@jiscribe/canvas-sdk/doc";
import type {
	CreateObjectType,
	ExtraStylePropertyDescriptor,
	ObjectFeatures,
} from "@jiscribe/doc";

/** The icon drawn when `icon` is omitted: the one an architecture diagram places most. */
export const DEFAULT_AWS_ICON_NAME = "service/amazon-ec2";

/**
 * A node drawing one icon of the AWS Architecture Icons set.
 *
 * It carries `text` and is `connectable` because it is what an architecture
 * diagram is made of, unlike the decorative lucideIcon. The label hangs under
 * the box and is sized from its own text, so shrinking the box never makes it
 * unreadable.
 *
 * There is no `stroke` and no `fill`: AWS's guidelines forbid altering or
 * recolouring the icons, and the stroke / fill menus are left out to match.
 *
 * It borrows rect geometry (x/y/width/height), so transforming it and attaching
 * connectors to it work exactly as they do for a rect. The drawing is scaled
 * uniformly to the box's shorter side and centred, so a non-square box adds
 * margin rather than stretching it.
 */
export const AwsIconFeatures = {
	type: "awsIcon",
	geometry: "rect",
	transform: true,
	text: "body",
	connectable: true,
} as const satisfies ObjectFeatures;

/** The style properties of this shape that no ObjectFeatures flag covers. */
export const AwsIconExtraStyleProperties = {
	icon: { valueType: "string" },
} as const satisfies Record<string, ExtraStylePropertyDescriptor>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const AwsIconDocBrand: unique symbol;

export type AwsIconDoc = CreateObjectType<
	typeof AwsIconFeatures,
	typeof AwsIconDocBrand,
	{
		/**
		 * Which icon to draw, as kebab-case behind a layer prefix
		 * (`service/aws-lambda`, `resource/amazon-ec2/instance`, `general/user`).
		 * Short names (`lambda`, `s3`) and spellings with `amazon-` / `aws-` dropped
		 * resolve too, wherever they are unambiguous. A name that resolves to
		 * nothing is a validation error carrying candidates. Omitted =
		 * {@link DEFAULT_AWS_ICON_NAME}
		 */
		icon?: string;
	}
>;

/** The doc fields of this shape alone; the doc definition's `extraKeys`. */
export const AwsIconExtraKeys = [
	"icon",
] as const satisfies readonly (keyof AwsIconDoc)[];

export const AWS_ICON_DOC_DEFAULTS: Omit<AwsIconDoc, "id"> = {
	type: "awsIcon",
	x: 0,
	y: 0,
	width: 64,
	height: 64,
	icon: DEFAULT_AWS_ICON_NAME,
	text: "",
	// The drawing scales as a square, so a non-square box only gains margin.
	// Locking the ratio by default makes a resize do the one thing it can here.
	lockAspectRatio: true,
	...BELOW_LABEL_STYLE_DEFAULTS,
} as const as AwsIconDoc;
