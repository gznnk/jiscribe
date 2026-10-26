import type {
	CanvasControllerState,
	StencilPanelContent,
} from "../CanvasTypes";

/** The catalog as panel content; the one value both panels start from. */
export const CATALOG_PANEL_CONTENT: StencilPanelContent = { kind: "catalog" };

/**
 * Whether two panel contents show the same thing.
 *
 * @param a - Compared by value, so two separately built `{ kind: "catalog" }` agree
 * @param b - The other content; either side may be the catalog or a category
 */
export const isSameStencilPanelContent = (
	a: StencilPanelContent,
	b: StencilPanelContent,
): boolean =>
	a.kind === "catalog"
		? b.kind === "catalog"
		: b.kind === "category" && a.categoryId === b.categoryId;

/**
 * What the stencil panels show right now: the flyout's content, else the docked
 * panel's while it is docked, else nothing. The two never coexist (see
 * CanvasControllerState.stencilFlyout), so at most one of them answers.
 *
 * @param state - Read for `stencilFlyout` and `stencilLibraryPanel` only
 * @returns null when neither panel is open; a closed docked panel's retained
 *   content is not reported
 */
export const readShownStencilPanelContent = (
	state: Pick<CanvasControllerState, "stencilFlyout" | "stencilLibraryPanel">,
): StencilPanelContent | null =>
	state.stencilFlyout ??
	(state.stencilLibraryPanel.isOpen ? state.stencilLibraryPanel.content : null);

/**
 * The press of a rail button (a category, or the catalog button): shows
 * `content`, or closes the panel already showing it.
 *
 * - Shown already, in the flyout or the docked panel: that panel closes.
 * - The docked panel is open with something else: it switches to `content` and
 *   stays docked.
 * - Nothing docked: the flyout opens on `content`, replacing whatever it showed.
 *
 * @param state - The state the press lands on
 * @param content - What the pressed button stands for
 * @returns The state with the flyout and the docked panel updated; nothing else
 *   is touched
 */
export const toggleStencilPanelContent = <
	TState extends Pick<
		CanvasControllerState,
		"stencilFlyout" | "stencilLibraryPanel"
	>,
>(
	state: TState,
	content: StencilPanelContent,
): TState => {
	const shownContent = readShownStencilPanelContent(state);
	const isShown =
		shownContent !== null && isSameStencilPanelContent(shownContent, content);
	if (state.stencilLibraryPanel.isOpen) {
		return {
			...state,
			stencilFlyout: null,
			stencilLibraryPanel: isShown
				? { ...state.stencilLibraryPanel, isOpen: false }
				: { isOpen: true, content },
		};
	}
	return { ...state, stencilFlyout: isShown ? null : content };
};
