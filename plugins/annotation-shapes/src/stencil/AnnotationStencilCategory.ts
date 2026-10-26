import type { StencilCategory } from "@jiscribe/canvas";

import { CalloutIcon } from "./CalloutIcon";

/**
 * Stencil category for the annotation shapes. Plugin-supplied, so a host
 * composes this into its `stencilLibrary.sections`, where the rail's catalog
 * lists it and the user can pin it to the rail.
 *
 * The two boxes that stand on their own — rather than marking a run of other
 * shapes — lead, because they are what a user wanting to "write something on the
 * diagram" is after. The callout goes first of the pair: it was pinned straight
 * on the bar until it moved here, and its tail says which shape the comment is
 * about, which is the commoner want. The three group markers follow, from the
 * most expressive to the plainest, since a user who has got past the boxes is
 * usually after the marker that can point somewhere.
 */
export const annotationStencilCategory: StencilCategory = {
	id: "annotation",
	label: { en: "Annotation", ja: "注釈" },
	icon: CalloutIcon,
	presetIds: ["callout", "note", "brace", "bracketWithStem", "bracket"],
};
