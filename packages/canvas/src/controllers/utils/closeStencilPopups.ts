import type { CanvasControllerState } from "../CanvasTypes";

/** The two shape pickers that float over the canvas: the category flyout and the Other shapes popover. */
export type StencilPopupsClosed = Pick<
	CanvasControllerState,
	"stencilLibraryOpenCategory" | "isOtherShapesPopoverOpen"
>;

/**
 * Closed values for both shape pickers that float over the canvas, the
 * toolbar's category flyout and the stencil bar's Other shapes popover.
 * Spread over a state at every site that dismisses them (`{ ...state,
 * ...closeStencilPopups() }`), so the two always close together.
 *
 * The only sites that write one without the other are the ones that open a
 * picker or keep it open: StencilCategoryToggleHandler, OtherShapesToggleHandler
 * (a press on the button), StencilLibraryPanelHandler (a press inside the
 * popover), and ObjectMenuHandler / CLOSE_OTHER_SHAPES_POPOVER, which close the
 * popover alone.
 *
 * @returns A fresh object each call: `stencilLibraryOpenCategory: null` and
 *   `isOtherShapesPopoverOpen: false`
 */
export const closeStencilPopups = (): StencilPopupsClosed => ({
	stencilLibraryOpenCategory: null,
	isOtherShapesPopoverOpen: false,
});

/**
 * Whether either shape picker is open, i.e. whether spreading
 * {@link closeStencilPopups} would change anything.
 *
 * @param state - The current canvas controller state
 */
export const isAnyStencilPopupOpen = (state: CanvasControllerState): boolean =>
	state.stencilLibraryOpenCategory !== null || state.isOtherShapesPopoverOpen;
