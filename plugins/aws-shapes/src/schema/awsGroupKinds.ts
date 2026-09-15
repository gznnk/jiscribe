import { AUTO_COLOR } from "@jiscribe/canvas-sdk/doc";

import type { AwsGroupDashType, AwsGroupKind } from "./AwsGroupDoc";
import { DEFAULT_AWS_GROUP_KIND, isAwsGroupKind } from "./AwsGroupDoc";

/** The look a kind decides. The colour is a default an object's own `stroke` overrides. */
export type AwsGroupKindStyle = {
	/** Border colour. `"auto"` follows the theme's ink. */
	strokeColor: string;
	/** Border line style. */
	strokeDashType: AwsGroupDashType;
	/** Name of the icon set in the top-left corner; undefined for a kind with no badge. */
	cornerIcon?: string;
};

/**
 * The single declaration of what each kind looks like. The drawing, the palette
 * presets and the AI-facing prose all read it.
 *
 * The colours are AWS's own category colours and do not follow the theme: the
 * point is that a diagram sits beside an official one without standing out. The
 * two AWS Cloud kinds are the exception — AWS ships that border in navy for a
 * white ground and in white for a black one, so the two collapse into the
 * theme-following `"auto"`.
 */
export const AWS_GROUP_KIND_STYLES: Readonly<
	Record<AwsGroupKind, AwsGroupKindStyle>
> = {
	"aws-cloud": {
		strokeColor: AUTO_COLOR,
		strokeDashType: "solid",
		cornerIcon: "group/aws-cloud-logo",
	},
	"aws-cloud-plain": {
		strokeColor: AUTO_COLOR,
		strokeDashType: "solid",
		cornerIcon: "group/aws-cloud",
	},
	region: {
		strokeColor: "#00A4A6",
		strokeDashType: "dotted",
		cornerIcon: "group/region",
	},
	"availability-zone": {
		strokeColor: "#00A4A6",
		strokeDashType: "dashed",
	},
	vpc: {
		strokeColor: "#8C4FFF",
		strokeDashType: "solid",
		cornerIcon: "group/virtual-private-cloud-vpc",
	},
	"public-subnet": {
		strokeColor: "#7AA116",
		strokeDashType: "solid",
		cornerIcon: "group/public-subnet",
	},
	"private-subnet": {
		strokeColor: "#00A4A6",
		strokeDashType: "solid",
		cornerIcon: "group/private-subnet",
	},
	"security-group": {
		strokeColor: "#DD344C",
		strokeDashType: "solid",
	},
	"auto-scaling-group": {
		strokeColor: "#ED7100",
		strokeDashType: "dashed",
		cornerIcon: "group/auto-scaling-group",
	},
	"aws-account": {
		strokeColor: "#E7157B",
		strokeDashType: "solid",
		cornerIcon: "group/aws-account",
	},
	"corporate-data-center": {
		strokeColor: "#7D8998",
		strokeDashType: "solid",
		cornerIcon: "group/corporate-data-center",
	},
	"server-contents": {
		strokeColor: "#7D8998",
		strokeDashType: "solid",
		cornerIcon: "group/server-contents",
	},
	"ec2-instance-contents": {
		strokeColor: "#ED7100",
		strokeDashType: "solid",
		cornerIcon: "group/ec2-instance-contents",
	},
	"spot-fleet": {
		strokeColor: "#ED7100",
		strokeDashType: "solid",
		cornerIcon: "group/spot-fleet",
	},
	"iot-greengrass-deployment": {
		strokeColor: "#7AA116",
		strokeDashType: "solid",
		cornerIcon: "group/aws-iot-greengrass-deployment",
	},
	"iot-greengrass": {
		strokeColor: "#7AA116",
		strokeDashType: "solid",
		cornerIcon: "service/aws-iot-greengrass",
	},
	"elastic-beanstalk-container": {
		strokeColor: "#ED7100",
		strokeDashType: "solid",
		cornerIcon: "service/aws-elastic-beanstalk",
	},
	"step-functions-workflow": {
		strokeColor: "#E7157B",
		strokeDashType: "solid",
		cornerIcon: "service/aws-step-functions",
	},
	generic: {
		strokeColor: "#7D8998",
		strokeDashType: "dashed",
	},
};

/**
 * Looks up what a kind looks like. Both an omitted `kind` and a value only an
 * in-memory state could carry fall back to the default kind, so the drawing side
 * needs no branch of its own.
 *
 * @param kind - the `kind` a doc or a state holds; undefined and anything
 *   unknown are treated as {@link DEFAULT_AWS_GROUP_KIND}
 * @returns the border colour, the line style and the corner badge
 */
export const readAwsGroupKindStyle = (
	kind: string | undefined,
): AwsGroupKindStyle =>
	AWS_GROUP_KIND_STYLES[isAwsGroupKind(kind) ? kind : DEFAULT_AWS_GROUP_KIND];
