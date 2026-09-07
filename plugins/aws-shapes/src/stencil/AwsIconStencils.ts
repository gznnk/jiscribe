import type { Stencil } from "@jiscribe/canvas";

import { createAwsStencilIcon } from "./createAwsStencilIcon";
import { AWS_TIER1_ICONS } from "../schema/icon/tier1Icons";

/**
 * The preset id: the type name with the icon name in PascalCase after it
 * (`awsIconAwsLambda`). Preset ids share one space across every plugin a host
 * applies, hence the prefix, and `:` cannot appear in one because it separates
 * the DOM's `data-part="item:{id}"`.
 *
 * @param icon - the canonical icon name, in which both `/` and `-` separate words
 * @returns a preset id that collides with nothing
 */
const toStencilId = (icon: string): string =>
	`awsIcon${icon
		.split(/[/-]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("")}`;

/**
 * The awsIcon presets the palette carries.
 *
 * The label rides in `defaultOverrides`, so a shape placed from the palette
 * comes with the short name already in it (`Lambda`, `S3`). It stays out of the
 * type's DOC_DEFAULTS, which are also the defaults a doc an AI writes falls back
 * to — every awsIcon would go by the same name.
 */
export const AwsIconStencils: Stencil[] = AWS_TIER1_ICONS.map(
	({ icon, label }) => ({
		id: toStencilId(icon),
		objectType: "awsIcon",
		label,
		icon: createAwsStencilIcon(icon),
		defaultOverrides: { icon, text: label },
	}),
);

/** The preset ids in palette order, for a host composing a toolbar of its own. */
export const AWS_ICON_STENCIL_IDS: readonly string[] = AWS_TIER1_ICONS.map(
	({ icon }) => toStencilId(icon),
);
