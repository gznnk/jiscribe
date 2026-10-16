import type { Stencil } from "@jiscribe/canvas";

import { createAwsStencilIcon } from "./createAwsStencilIcon";
import { toAwsIconStencilId } from "./toAwsIconStencilId";
import { AWS_ICON_ENTRIES } from "../schema/icon/iconData.generated";
import { AWS_TIER1_ICONS } from "../schema/icon/tier1Icons";

/** The short name tier 1 gives an icon, which wins over the asset's display label. */
const TIER1_LABEL_BY_ICON = new Map<string, string>(
	AWS_TIER1_ICONS.map(({ icon, label }) => [icon, label]),
);

/** Every icon name, tier 1 first in palette order, then the rest of the set. */
const ALL_ICON_NAMES: readonly string[] = [
	...new Set([
		...AWS_TIER1_ICONS.map(({ icon }) => icon),
		...Object.keys(AWS_ICON_ENTRIES),
	]),
];

/**
 * One awsIcon preset per icon in the set, so a library search can place any of
 * them; only {@link AWS_ICON_STENCIL_IDS} are laid out up front.
 *
 * The label rides in `defaultOverrides`, so a shape placed from the palette
 * comes with the short name already in it (`Lambda`, `S3`). It stays out of the
 * type's DOC_DEFAULTS, which are also the defaults a doc an AI writes falls back
 * to — every awsIcon would go by the same name.
 */
export const AwsIconStencils: Stencil[] = ALL_ICON_NAMES.map((icon) => {
	const entry = AWS_ICON_ENTRIES[icon];
	if (entry === undefined) {
		throw new Error(
			`AwsIconStencils: tier 1 names the icon "${icon}", which the icon set does not hold`,
		);
	}
	const label = TIER1_LABEL_BY_ICON.get(icon) ?? entry.label;
	return {
		id: toAwsIconStencilId(icon),
		objectType: "awsIcon",
		label,
		icon: createAwsStencilIcon(icon),
		defaultOverrides: { icon, text: label },
	};
});

/** The preset ids in palette order, for a host composing a toolbar of its own. */
export const AWS_ICON_STENCIL_IDS: readonly string[] = AWS_TIER1_ICONS.map(
	({ icon }) => toAwsIconStencilId(icon),
);
