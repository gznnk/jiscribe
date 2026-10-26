import type {
	CanvasControllerState,
	StencilFlyoutContent,
	StencilPanelContent,
} from "../CanvasTypes";

/**
 * Whether what the flyout slot holds is a stencil panel's content, rather than
 * one of the rail's popovers.
 *
 * @param value - The slot's content (`stencilFlyout`), never null
 */
export const isStencilPanelContent = (
	value: StencilFlyoutContent,
): value is StencilPanelContent =>
	value.kind === "category" || value.kind === "catalog";

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
 * What a stencil panel draws for the content the state names: the content
 * itself, or the catalog when it names a category the library does not hold
 * (a docked panel restored on a host without that plugin). The state keeps the
 * id; the drawing, the rail's pressed buttons and the rail's toggles all go by
 * this, so a button shown pressed is the one that closes the panel.
 *
 * @param content - The flyout's or the docked panel's content (reducer state)
 * @param libraryCategoryIds - Ids of the sections `stencilLibrary.sections`
 *   resolved to, empty sections dropped; a category is held when listed here
 * @returns `content` itself when it is drawn as is (so a memoized reader sees
 *   the same reference), else {@link CATALOG_PANEL_CONTENT}
 */
export const resolveDrawnStencilPanelContent = (
	content: StencilPanelContent,
	libraryCategoryIds: readonly string[],
): StencilPanelContent =>
	content.kind === "category" &&
	!libraryCategoryIds.includes(content.categoryId)
		? CATALOG_PANEL_CONTENT
		: content;

/**
 * What the stencil panels draw right now: the flyout's content, else the docked
 * panel's while it is docked, else nothing, each as
 * {@link resolveDrawnStencilPanelContent} draws it. The flyout and the docked
 * panel never coexist (see CanvasControllerState.stencilFlyout), so at most one
 * of them answers; a rail popover in the flyout's slot is no panel, and leaves
 * the docked panel's content to answer.
 *
 * @param state - Read for `stencilFlyout`, `stencilLibraryPanel` and
 *   `stencilLibraryCategoryIds` only
 * @returns null when neither panel is open; a closed docked panel's retained
 *   content is not reported
 */
export const readDrawnStencilPanelContent = (
	state: Pick<
		CanvasControllerState,
		"stencilFlyout" | "stencilLibraryPanel" | "stencilLibraryCategoryIds"
	>,
): StencilPanelContent | null => {
	const dockedContent = state.stencilLibraryPanel.isOpen
		? state.stencilLibraryPanel.content
		: null;
	const shownContent =
		state.stencilFlyout !== null && isStencilPanelContent(state.stencilFlyout)
			? state.stencilFlyout
			: dockedContent;
	return shownContent === null
		? null
		: resolveDrawnStencilPanelContent(
				shownContent,
				state.stencilLibraryCategoryIds,
			);
};

/**
 * The press of a rail button (a category, or the catalog button): shows
 * `content`, or closes the panel already drawing it.
 *
 * - Drawn already, in the flyout or the docked panel: that panel closes. What is
 *   compared is what the panel draws ({@link readDrawnStencilPanelContent}), so
 *   a docked panel holding a category the library lacks, drawn as the catalog,
 *   closes from the catalog button.
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
		"stencilFlyout" | "stencilLibraryPanel" | "stencilLibraryCategoryIds"
	>,
>(
	state: TState,
	content: StencilPanelContent,
): TState => {
	const drawnContent = readDrawnStencilPanelContent(state);
	const isDrawn =
		drawnContent !== null && isSameStencilPanelContent(drawnContent, content);
	if (state.stencilLibraryPanel.isOpen) {
		return {
			...state,
			stencilFlyout: null,
			stencilLibraryPanel: isDrawn
				? { ...state.stencilLibraryPanel, isOpen: false }
				: { isOpen: true, content },
		};
	}
	return { ...state, stencilFlyout: isDrawn ? null : content };
};
