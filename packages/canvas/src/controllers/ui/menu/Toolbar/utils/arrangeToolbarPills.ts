import type {
	ResolvedToolbarItem,
	ResolvedToolbarSection,
} from "./resolveToolbarSections";

/** The two pills the collapsed bar is drawn as, each in display order. */
export type ToolbarPills = {
	/** Sections of the top-left pill; empty when the pill is not drawn. */
	start: ResolvedToolbarSection[];
	/** Sections of the top-right pill; empty when the pill is not drawn. */
	end: ResolvedToolbarSection[];
};

const DIVIDER: ResolvedToolbarItem = { type: "divider" };

/** Strips the dividers a section declared at its own two ends. */
const trimEdgeDividers = (
	items: readonly ResolvedToolbarItem[],
): ResolvedToolbarItem[] => {
	let startIndex = 0;
	let endIndex = items.length;
	while (startIndex < endIndex && items[startIndex].type === "divider") {
		startIndex++;
	}
	while (endIndex > startIndex && items[endIndex - 1].type === "divider") {
		endIndex--;
	}
	return items.slice(startIndex, endIndex);
};

/**
 * Lays one pill out: the sections in the order given, each stripped of its edge
 * dividers, and every one after the first opened by exactly one divider.
 */
const arrangePill = (
	sections: readonly ResolvedToolbarSection[],
): ResolvedToolbarSection[] =>
	sections
		.flatMap((section) => {
			const items = trimEdgeDividers(section.items);
			return items.length > 0 ? [{ ...section, items }] : [];
		})
		.map((section, index) =>
			index === 0
				? section
				: { ...section, items: [DIVIDER, ...section.items] },
		);

/**
 * Splits the resolved bar into the two pills it is drawn as while the sidebars
 * are collapsed, by each section's `collapsedAlign`.
 *
 * The dividers a section brings for the full-width bar mark its boundary with
 * whatever stood beside it there, which in a pill is a different neighbour or
 * nothing; so they are replaced rather than kept: no divider opens or closes a
 * pill, and adjacent sections are separated by exactly one. Dividers inside a
 * section stay.
 *
 * @param sections The bar as {@link resolveToolbarSections} returns it; the
 *   `"hidden"` ones are left out of both pills.
 */
export const arrangeToolbarPills = (
	sections: readonly ResolvedToolbarSection[],
): ToolbarPills => ({
	start: arrangePill(
		sections.filter((section) => section.collapsedAlign === "start"),
	),
	end: arrangePill(
		sections.filter((section) => section.collapsedAlign === "end"),
	),
});
