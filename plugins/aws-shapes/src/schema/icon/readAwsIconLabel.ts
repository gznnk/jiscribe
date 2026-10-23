import { AWS_ICON_ENTRIES } from "./iconData.generated";
import { resolveAwsIconName } from "./resolveAwsIconName";
import { AWS_TIER1_ICONS } from "./tier1Icons";

/** The short name tier 1 gives an icon, which wins over the asset's display label. */
const TIER1_LABEL_BY_ICON = new Map<string, string>(
	AWS_TIER1_ICONS.map(({ icon, label }) => [icon, label]),
);

/**
 * The label a shape drawing this icon starts out with: the one a stencil places
 * and the one the picker treats as "not yet renamed".
 *
 * @param name - Any spelling resolveAwsIconName accepts; tier 1 is looked up by
 *   the canonical name it resolves to
 * @returns Tier 1's short name (`Lambda`), else the asset's display label, or
 *   null when nothing answers to the name
 */
export const readAwsIconLabel = (name: string): string | null => {
	const resolved = resolveAwsIconName(name);
	if (resolved === null) {
		return null;
	}
	return (
		TIER1_LABEL_BY_ICON.get(resolved) ??
		AWS_ICON_ENTRIES[resolved]?.label ??
		null
	);
};
