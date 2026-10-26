import { ContextMenuHandler } from "./ContextMenuHandler";
import { ObjectMenuHandler } from "./ObjectMenuHandler";
import { PropertyPanelHandler } from "./PropertyPanelHandler";
import { StencilCategoryToggleHandler } from "./StencilCategoryToggleHandler";
import { StencilLibraryItemHandler } from "./StencilLibraryItemHandler";
import { StencilLibraryPanelHandler } from "./StencilLibraryPanelHandler";
import { StencilRailHandler } from "./StencilRailHandler";
import { ToolbarHandler } from "./ToolbarHandler";
import type { CanvasControllerState } from "../../../CanvasTypes";
import type { ICanvasRegistries } from "../../../registries/ICanvasRegistries";
import { claimDrag } from "../../../utils/claimDrag";
import type {
	CanvasEvent,
	GestureHandler,
} from "../../registry/GestureHandlerTypes";
import { isPerTargetInteraction } from "../utils/isPerTargetInteraction";

/**
 * Sub-handlers of the "menu" targetKind, exported for the exclusivity test.
 */
export const MENU_HANDLERS: readonly GestureHandler[] = [
	StencilLibraryItemHandler,
	StencilLibraryPanelHandler,
	PropertyPanelHandler,
	StencilCategoryToggleHandler,
	StencilRailHandler,
	ToolbarHandler,
	ContextMenuHandler,
	ObjectMenuHandler,
];

/**
 * Main handler for all menu-level events.
 * Routes each event to the first sub-handler whose supports() accepts it. The
 * sub-handlers split on targetId (stencil-library / stencil-library-panel /
 * property-panel / stencil-category / stencil-rail / toolbar / context-menu /
 * object-menu) and are mutually
 * exclusive, so the array order never decides routing.
 *
 * A drag on a menu is a `"menu"` one unless the sub-handler names it otherwise
 * (a preset dragged off the StencilLibrary is a `"stencil"` drag).
 */
export const MenuEventHandler: GestureHandler = {
	supports(event: CanvasEvent): boolean {
		return event.targetKind === "menu" && isPerTargetInteraction(event);
	},

	handle(
		state: CanvasControllerState,
		event: CanvasEvent,
		registries: ICanvasRegistries,
	): CanvasControllerState {
		const menuState =
			event.type === "dragStart"
				? claimDrag(state, { kind: "menu" }, { edgeScroll: false })
				: state;
		for (const handler of MENU_HANDLERS) {
			if (handler.supports(event)) {
				return handler.handle(menuState, event, registries);
			}
		}

		// Events no sub-handler claims (an unknown targetId) pass through
		return menuState;
	},
};
