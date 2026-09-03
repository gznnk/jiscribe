import type { Stencil } from "@jiscribe/canvas";

import { createLucideStencilIcon } from "./createLucideStencilIcon";

/**
 * The icons the palette offers outright, in the order they are reached for: who, what runs,
 * what is stored, what moves between them, what guards it, then what a diagram says about
 * its own state.
 *
 * A short list on purpose — the whole set is 1767 icons, and the flyout is for the handful
 * a diagram reaches for without thinking. Everything else is a search away in the picker,
 * which is where an unusual icon belongs.
 */
const FLYOUT_ICON_NAMES = [
	"user",
	"users",
	"monitor",
	"laptop",
	"server",
	"database",
	"cloud",
	"globe",
	"folder",
	"file-text",
	"mail",
	"message-square",
	"bell",
	"lock",
	"shield-check",
	"key",
	"check",
	"triangle-alert",
	"clock",
	"settings",
] as const;

/**
 * Preset id of the palette entry for one icon: the type name with the icon's own name
 * appended (`lucideIconFileText`). Prefixed because preset ids share one space across
 * every plugin a host applies, and bare names like `lock` are already taken by the
 * pictogram shapes; written as one word because the id travels inside a `data-part`
 * whose own separator is the colon.
 */
const stencilId = (name: string): string =>
	`lucideIcon${name
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("")}`;

/**
 * The palette entries. Labelled with the icon's own name rather than a translation: the
 * name is what the document stores, what the picker searches and what an AI writes, so it
 * is the word worth learning from the tooltip.
 */
export const IconStencils: Stencil[] = FLYOUT_ICON_NAMES.map((name) => ({
	id: stencilId(name),
	objectType: "lucideIcon",
	label: name,
	icon: createLucideStencilIcon(name),
	defaultOverrides: { icon: name },
}));

/** Preset ids of the flyout, in palette order; a host laying out its own toolbar reads these. */
export const ICON_STENCIL_IDS: readonly string[] =
	FLYOUT_ICON_NAMES.map(stencilId);
