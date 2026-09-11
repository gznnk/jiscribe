import type { CommandRegistry } from "../../../../commands/CommandRegistry";
import type { Command } from "../../../../commands/CommandTypes";
import type { Stencil } from "../../../objects/Stencil";
import type { StencilRegistry } from "../../../objects/StencilRegistry";
import {
	resolveStencilCategory,
	type ResolvedStencilCategory,
} from "../../StencilLibrary/utils/resolveStencilCategory";
import type { ToolbarItem, ToolbarSection } from "../toolbarSections";

/** A toolbar item with its registry lookups done, ready to draw. */
export type ResolvedToolbarItem =
	| { type: "stencilPreset"; preset: Stencil }
	| ({ type: "stencilCategory" } & ResolvedStencilCategory)
	| ({ type: "command"; command: Command } & Pick<
			Extract<ToolbarItem, { type: "command" }>,
			"commandId" | "icon" | "label"
	  >)
	| { type: "zoom" }
	| { type: "stencilLibraryToggle" }
	| { type: "propertyPanelToggle" }
	| { type: "divider" }
	| { type: "slot"; id: string; node: React.ReactNode };

/** A section with every item resolved and `align` filled in. */
export type ResolvedToolbarSection = {
	id: string;
	align: "start" | "end";
	items: ResolvedToolbarItem[];
};

/** What the declared items are looked up against. */
export type ToolbarResolutionContext = {
	/** Registry answering "what presets exist" for this canvas. */
	stencil: StencilRegistry;
	/** Registry the `command` items are looked up in; an unknown id is dropped. */
	command: CommandRegistry;
	/**
	 * Whether the host's `stencilLibrary.sections` resolved to at least one
	 * section. False drops every `stencilLibraryToggle` item: the toggle would
	 * open an empty sidebar.
	 */
	hasLibrary: boolean;
};

/**
 * Drops the dividers left dangling by the items that resolution removed: all but
 * the first of a consecutive run, and one that only reached an end of the section
 * because what stood beyond it was dropped.
 *
 * A divider the host itself put at an end is kept: there it means the boundary
 * with the neighbouring section, not a separation inside this one. So the
 * declaration decides, not the resolved run — a section declared
 * `[slot, divider]` keeps its divider, while `[…, divider, stencilLibraryToggle]`
 * loses it along with the toggle.
 *
 * @param items The section's items after resolution, in display order.
 * @param declaredItems The same section's items before resolution; only their
 * two ends are read, to tell a host-placed edge divider from a stranded one.
 */
const dropDanglingDividers = (
	items: readonly ResolvedToolbarItem[],
	declaredItems: readonly ToolbarItem[],
): ResolvedToolbarItem[] => {
	const kept: ResolvedToolbarItem[] = [];
	for (const item of items) {
		const isDoubled =
			item.type === "divider" && kept[kept.length - 1]?.type === "divider";
		if (!isDoubled) {
			kept.push(item);
		}
	}
	if (kept[0]?.type === "divider" && declaredItems[0]?.type !== "divider") {
		kept.shift();
	}
	if (
		kept[kept.length - 1]?.type === "divider" &&
		declaredItems[declaredItems.length - 1]?.type !== "divider"
	) {
		kept.pop();
	}
	return kept;
};

const resolveToolbarItem = (
	item: ToolbarItem,
	context: ToolbarResolutionContext,
): ResolvedToolbarItem[] => {
	switch (item.type) {
		case "stencilPreset": {
			const preset = context.stencil.get(item.presetId);
			return preset ? [{ type: "stencilPreset", preset }] : [];
		}
		case "stencilCategory": {
			const resolved = resolveStencilCategory(item.category, context.stencil);
			return resolved ? [{ type: "stencilCategory", ...resolved }] : [];
		}
		case "command": {
			const command = context.command.get(item.commandId);
			return command
				? [
						{
							type: "command",
							command,
							commandId: item.commandId,
							icon: item.icon,
							label: item.label,
						},
					]
				: [];
		}
		case "stencilLibraryToggle":
			return context.hasLibrary ? [item] : [];
		default:
			return [item];
	}
};

/**
 * Turns the declared bar into the bar that can actually be drawn: every id
 * looked up, everything unresolvable dropped, and the leftover dividers and
 * emptied sections cleaned away.
 *
 * Dropping is silent by design — a host may name presets and commands it did
 * not install, and the bar shows whatever is there. What is left of a section
 * therefore depends on the registries, which is why the cleanup runs here
 * rather than being baked into the declaration.
 *
 * @param sections Declared bar in display order (`toolbar.sections`, defaulting
 * to `DEFAULT_TOOLBAR_SECTIONS`); an empty array resolves to an empty bar.
 * @param context Registries and host facts the ids are resolved against.
 * @returns The drawable sections in the given order, each with `align` filled
 * in (omitted = `"start"`); a section left with no item at all is gone, so the
 * result can be shorter than `sections`. A divider the host declared at an end
 * of a section survives as the intended boundary with the next one
 * (see {@link dropDanglingDividers}).
 * @throws When two sections share an `id`, or a `stencilCategory` item repeats a preset
 *   id (see {@link resolveStencilCategory}). The id keys the rendered section,
 *   so a repeat would be indistinguishable from the first rather than visibly
 *   wrong.
 */
export const resolveToolbarSections = (
	sections: readonly ToolbarSection[],
	context: ToolbarResolutionContext,
): ResolvedToolbarSection[] => {
	const seenSectionIds = new Set<string>();
	for (const section of sections) {
		if (seenSectionIds.has(section.id)) {
			throw new Error(
				`resolveToolbarSections: the section id "${section.id}" is used twice; each id may appear once`,
			);
		}
		seenSectionIds.add(section.id);
	}

	return sections.flatMap((section) => {
		const items = dropDanglingDividers(
			section.items.flatMap((item) => resolveToolbarItem(item, context)),
			section.items,
		);
		return items.length > 0
			? [{ id: section.id, align: section.align ?? "start", items }]
			: [];
	});
};

/**
 * Collects the commands whose enabled state the bar needs, so the caller can
 * evaluate `canExecute` for exactly those.
 *
 * Reads the declaration rather than the resolved bar: the answer must not
 * change with the registries, since it feeds a `useMemo` keyed on `sections`
 * alone.
 *
 * @param sections Declared bar; a `zoom` item counts as naming `zoomIn` and
 * `zoomOut`, which it draws as buttons of its own.
 * @returns The ids, deduplicated and sorted ascending so a caller joining them
 * into a string gets a stable order.
 */
export const collectToolbarCommandIds = (
	sections: readonly ToolbarSection[],
): string[] => {
	const commandIds = new Set<string>();
	for (const section of sections) {
		for (const item of section.items) {
			if (item.type === "command") {
				commandIds.add(item.commandId);
			}
			if (item.type === "zoom") {
				commandIds.add("zoomIn");
				commandIds.add("zoomOut");
			}
		}
	}
	return Array.from(commandIds).sort();
};
