import type { Stencil } from "@jiscribe/canvas";
import type { LocaleMessages } from "@jiscribe/canvas-sdk";

import { createAwsGroupFrameIcon } from "./createAwsGroupFrameIcon";
import { createAwsStencilIcon } from "./createAwsStencilIcon";
import type { AwsGroupKind } from "../schema/AwsGroupDoc";
import { AWS_GROUP_KINDS } from "../schema/AwsGroupDoc";
import { AWS_GROUP_KIND_STYLES } from "../schema/awsGroupKinds";

/** Palette name per kind. The badge alone does not say which frame it is, so every kind has one. */
const KIND_LABELS: Readonly<Record<AwsGroupKind, LocaleMessages<string>>> = {
	"aws-cloud": { en: "AWS Cloud", ja: "AWS クラウド" },
	"aws-cloud-plain": {
		en: "AWS Cloud (no logo)",
		ja: "AWS クラウド（ロゴ無し）",
	},
	region: { en: "Region", ja: "リージョン" },
	"availability-zone": {
		en: "Availability Zone",
		ja: "アベイラビリティーゾーン",
	},
	vpc: { en: "VPC", ja: "VPC" },
	"public-subnet": { en: "Public subnet", ja: "パブリックサブネット" },
	"private-subnet": { en: "Private subnet", ja: "プライベートサブネット" },
	"security-group": { en: "Security group", ja: "セキュリティグループ" },
	"auto-scaling-group": {
		en: "Auto Scaling group",
		ja: "Auto Scaling グループ",
	},
	"aws-account": { en: "AWS account", ja: "AWS アカウント" },
	"corporate-data-center": {
		en: "Corporate data center",
		ja: "オンプレミス DC",
	},
	"server-contents": { en: "Server contents", ja: "サーバーの中身" },
	"ec2-instance-contents": {
		en: "EC2 instance contents",
		ja: "EC2 インスタンスの中身",
	},
	"spot-fleet": { en: "Spot Fleet", ja: "スポットフリート" },
	"iot-greengrass-deployment": {
		en: "IoT Greengrass Deployment",
		ja: "IoT Greengrass デプロイ",
	},
	"iot-greengrass": { en: "IoT Greengrass", ja: "IoT Greengrass" },
	"elastic-beanstalk-container": {
		en: "Elastic Beanstalk container",
		ja: "Elastic Beanstalk コンテナ",
	},
	"step-functions-workflow": {
		en: "Step Functions workflow",
		ja: "Step Functions ワークフロー",
	},
	generic: { en: "Generic group", ja: "汎用グループ" },
};

/**
 * The preset id: the type name with the kind in PascalCase after it
 * (`awsGroupPublicSubnet`).
 *
 * @param kind - which frame this is, with `-` separating its words
 * @returns a preset id that collides with nothing
 */
const toStencilId = (kind: AwsGroupKind): string =>
	`awsGroup${kind
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("")}`;

/**
 * The awsGroup presets the palette carries — all nineteen kinds. A frame means
 * nothing until its kind is chosen, so placing one and then choosing would add
 * that step every time.
 *
 * The glyph is the corner badge where the kind has one, and otherwise
 * (availability zone, security group, generic) a frame drawn in the kind's
 * colour and line style.
 */
export const AwsGroupStencils: Stencil[] = AWS_GROUP_KINDS.map((kind) => {
	const { cornerIcon, strokeColor, strokeDashType } =
		AWS_GROUP_KIND_STYLES[kind];
	return {
		id: toStencilId(kind),
		objectType: "awsGroup",
		label: KIND_LABELS[kind],
		icon:
			cornerIcon === undefined
				? createAwsGroupFrameIcon({ strokeColor, strokeDashType })
				: createAwsStencilIcon(cornerIcon),
		defaultOverrides: { kind },
	};
});

/** The preset ids in palette order, for a host composing a toolbar of its own. */
export const AWS_GROUP_STENCIL_IDS: readonly string[] =
	AWS_GROUP_KINDS.map(toStencilId);
