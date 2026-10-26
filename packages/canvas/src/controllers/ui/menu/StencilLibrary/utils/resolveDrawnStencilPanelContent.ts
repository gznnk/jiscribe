import type { ResolvedStencilCategory } from "./resolveStencilCategory";
import type { StencilPanelContent } from "../../../../CanvasTypes";
import { CATALOG_PANEL_CONTENT } from "../../../../utils/stencilPanelContent";

/**
 * What a stencil panel draws for the content the state names: the content
 * itself, or the catalog when it names a category the library does not hold
 * (a docked panel restored on a host without that plugin). The state keeps the
 * id; only the drawing, and the rail's pressed buttons read from it, fall back.
 *
 * @param content - The flyout's or the docked panel's content (reducer state)
 * @param librarySections - `stencilLibrary.sections` resolved against the
 *   registry, empty sections dropped; a category is held when one of them has
 *   its id
 * @returns `content` itself when it is drawn as is (so a memoized reader sees
 *   the same reference), else {@link CATALOG_PANEL_CONTENT}
 */
export const resolveDrawnStencilPanelContent = (
	content: StencilPanelContent,
	librarySections: readonly ResolvedStencilCategory[],
): StencilPanelContent =>
	content.kind === "category" &&
	!librarySections.some((section) => section.category.id === content.categoryId)
		? CATALOG_PANEL_CONTENT
		: content;
