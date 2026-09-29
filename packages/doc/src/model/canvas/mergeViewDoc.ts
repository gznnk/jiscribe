import {
	VIEW_PADDING_KEYS,
	type ViewDoc,
	type ViewOpenMode,
	type ViewPaddingDoc,
	type ViewScrollMode,
} from "./ViewDoc";

/**
 * A change to a {@link ViewDoc}, part by part: a part left out keeps what the
 * declaration already says, a part given as null drops it.
 */
export type ViewParams = {
	/** Empty space kept outside the content, or null to declare none. */
	padding?: ViewPaddingDoc | null;
	/** How the view is framed on open, or null to leave it to the host. */
	open?: ViewOpenMode | null;
	/** Whether panning is walled in at the padded content, or null for the endless board. */
	scroll?: ViewScrollMode | null;
};

/**
 * The declaration a {@link ViewParams} leaves behind. Drops what says nothing: a
 * padding side of 0 (what an omitted side already means), a padding with no side
 * left, and the declaration itself once no part is left.
 *
 * Checks nothing: a caller taking input from outside validates it first (the
 * `setView` op throws on a negative side or an unknown mode).
 *
 * @param view - The declaration as it stands, or undefined for none; never mutated
 * @param params - The parts to change; padding sides are expected to be finite and 0 or more
 * @returns A fresh declaration, or undefined once no part is left
 */
export const mergeViewDoc = (
	view: ViewDoc | undefined,
	params: ViewParams,
): ViewDoc | undefined => {
	const nextView: ViewDoc = { ...view };
	if (params.padding !== undefined) {
		const storedPadding: ViewPaddingDoc = {};
		for (const side of VIEW_PADDING_KEYS) {
			const value = params.padding?.[side];
			if (value !== undefined && value > 0) {
				storedPadding[side] = value;
			}
		}
		if (Object.keys(storedPadding).length === 0) {
			delete nextView.padding;
		} else {
			nextView.padding = storedPadding;
		}
	}
	if (params.open !== undefined) {
		if (params.open === null) {
			delete nextView.open;
		} else {
			nextView.open = params.open;
		}
	}
	if (params.scroll !== undefined) {
		if (params.scroll === null) {
			delete nextView.scroll;
		} else {
			nextView.scroll = params.scroll;
		}
	}
	return Object.keys(nextView).length === 0 ? undefined : nextView;
};
