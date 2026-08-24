/**
 * How the view is framed when a document is opened.
 *
 * The set is closed so a host can switch on it exhaustively. Every member fits
 * the padded content box (content bounds grown by {@link ViewPaddingDoc}) on the
 * axes it names, and the anchor for the rest follows one rule: **an axis that
 * was not fitted starts at that axis's start edge of the padded box**. So
 * `"fit-width"` fits the horizontal axis and starts at the top edge, while
 * `"fit-all"` fits both and therefore centers. A future `"fit-height"` would fit
 * the vertical axis and start at the left edge, needing no new rule.
 */
export type ViewOpenMode = "fit-width" | "fit-all";

const VIEW_OPEN_MODES: readonly ViewOpenMode[] = ["fit-width", "fit-all"];

/**
 * Whether a value names one of the {@link ViewOpenMode} members.
 *
 * @param value - Any value; only the exact mode strings pass
 */
export const isViewOpenMode = (value: unknown): value is ViewOpenMode =>
	typeof value === "string" &&
	(VIEW_OPEN_MODES as readonly string[]).includes(value);

/**
 * Whether the document is a bounded page or an endless board.
 *
 * `"content"` walls panning in at the content bounds grown by
 * {@link ViewDoc.padding} — the same rectangle the framing uses, so a document
 * opened `"fit-width"` cannot be panned sideways off its own page. The exported
 * image covers that same rectangle too when a padding is declared; a document
 * declaring none keeps the exporter's own default margin, which is wider than
 * the zero-padding wall. `"infinite"` is the endless board, and is what an
 * omitted field means.
 */
export type ViewScrollMode = "content" | "infinite";

const VIEW_SCROLL_MODES: readonly ViewScrollMode[] = ["content", "infinite"];

/**
 * Whether a value names one of the {@link ViewScrollMode} members.
 *
 * @param value - Any value; only the exact mode strings pass
 */
export const isViewScrollMode = (value: unknown): value is ViewScrollMode =>
	typeof value === "string" &&
	(VIEW_SCROLL_MODES as readonly string[]).includes(value);

/**
 * Empty space in world px kept outside the content on each side. Every side is
 * optional and defaults to 0; see {@link ViewDoc} for what the padding applies to.
 */
export type ViewPaddingDoc = {
	/** Space above the content's top edge. */
	top?: number;
	/** Space right of the content's right edge. */
	right?: number;
	/** Space below the content's bottom edge. */
	bottom?: number;
	/** Space left of the content's left edge. */
	left?: number;
};

/** {@link ViewPaddingDoc} with every side filled in, as {@link resolveViewPadding} returns it. */
export type ResolvedViewPadding = Required<ViewPaddingDoc>;

/**
 * Fills in the sides a {@link ViewPaddingDoc} left out, each with 0.
 *
 * @param padding - The declared padding, or undefined for "no padding at all";
 *   both produce a fully-zero result
 * @returns A fresh object with all four sides present, so callers can destructure
 *   without repeating the defaults
 */
export const resolveViewPadding = (
	padding?: ViewPaddingDoc,
): ResolvedViewPadding => ({
	top: padding?.top ?? 0,
	right: padding?.right ?? 0,
	bottom: padding?.bottom ?? 0,
	left: padding?.left ?? 0,
});

/**
 * The document's display declaration: how much empty space belongs around the
 * drawing, how the view should be framed when the document is opened, and
 * whether it may be scrolled past its own edges.
 *
 * Every field describes *presentation*, never geometry. The padding is not a
 * canvas boundary: objects may be placed outside it and editing is not
 * constrained by it. What it does affect is everything derived from the content
 * box — the margin of rendered and exported images, the box `open` fits, and the
 * wall `scroll` puts up — which is why it lives in the document rather than in
 * each host's options.
 *
 * The content box is re-derived every time it is needed (auto-sized shapes
 * included), so no absolute rectangle is ever stored here and editing the drawing
 * cannot leave the declaration stale.
 *
 * `open` and `scroll` are intents, and the weakest inputs of their kind: a host
 * that passes `initialConfig.viewport` outranks `open`, a host that passes
 * `initialConfig.scrollBounds` outranks `scroll`, and a document that omits
 * either keeps whatever the host would have done anyway.
 */
export type ViewDoc = {
	/** Empty space kept outside the content; omitted means none on every side. */
	padding?: ViewPaddingDoc;
	/** How to frame the view on open; omitted leaves the host's own framing in force. */
	open?: ViewOpenMode;
	/**
	 * Whether panning is walled in at the content grown by {@link padding} — there
	 * is no separate margin for the wall, so the page the document frames itself
	 * as is the page it can be panned over. Omitted means the endless board, and a
	 * host that passes `initialConfig.scrollBounds` outranks this either way.
	 */
	scroll?: ViewScrollMode;
};
