import type { Stencil } from "@jiscribe/canvas";

import { createLucideStencilIcon } from "./createLucideStencilIcon";
import { toIconStencilId } from "./toIconStencilId";
import { ICON_NODES } from "../schema/icon/iconData.generated";

/**
 * The icons the palette offers outright, in the order they are reached for: who, what runs,
 * what is stored, what moves between them, what guards it, then what a diagram says about
 * its own state.
 *
 * A short list on purpose — the whole set is 1767 icons, and the flyout is for the handful
 * a diagram reaches for without thinking. Everything else is a search away, in the picker
 * or in the stencil library.
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
 * One preset per icon in the set, so a library search can place any of them; only
 * {@link ICON_STENCIL_IDS} are laid out up front. Labelled with the icon's own name rather
 * than a translation: the name is what the document stores, what the picker searches and
 * what an AI writes, so it is the word worth learning from the tooltip.
 */
export const IconStencils: Stencil[] = Object.keys(ICON_NODES).map((name) => ({
	id: toIconStencilId(name),
	objectType: "lucideIcon",
	label: name,
	icon: createLucideStencilIcon(name),
	defaultOverrides: { icon: name },
}));

/**
 * Preset ids the icon category lists, in palette order: its `presetIds`, read by
 * a host composing its own library section or rail out of this set.
 */
export const ICON_STENCIL_IDS: readonly string[] =
	FLYOUT_ICON_NAMES.map(toIconStencilId);
