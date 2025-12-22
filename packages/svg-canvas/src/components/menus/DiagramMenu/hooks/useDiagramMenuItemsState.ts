import { useCallback, useEffect, useState } from "react";

import { type MenuItemId } from "../DiagramMenuConstants";

export type UseDiagramMenuItemsStateProps = {
	/**
	 * When true, all menus will be closed.
	 * Useful for closing all menus when the parent menu is hidden.
	 */
	shouldCloseAll?: boolean;
};

export type UseDiagramMenuItemsStateReturn = {
	/**
	 * Check if a specific menu is open
	 */
	isOpen: (menuId: MenuItemId) => boolean;
	/**
	 * Toggle a menu open/closed
	 * If opening a menu, all other menus will be closed (exclusive behavior)
	 */
	toggle: (menuId: MenuItemId) => void;
};

/**
 * Hook for managing DiagramMenu sub-menu items open/close state with exclusive behavior.
 *
 * This hook provides:
 * - Centralized state management for DiagramMenu sub-menu items
 * - Exclusive open behavior (only one menu item can be open at a time)
 * - Automatic close all when parent menu is hidden
 * - Clean API for checking state and toggling menu items
 *
 * @example
 * ```tsx
 * const menuState = useDiagramMenuItemsState({ shouldCloseAll: !shouldRender });
 *
 * <ColorPicker
 *   isOpen={menuState.isOpen(MenuItemId.BG_COLOR)}
 *   onToggle={() => menuState.toggle(MenuItemId.BG_COLOR)}
 * />
 * ```
 */
export const useDiagramMenuItemsState = (
	props: UseDiagramMenuItemsStateProps = {},
): UseDiagramMenuItemsStateReturn => {
	const { shouldCloseAll = false } = props;

	// Store the currently open menu ID (null means all closed)
	const [openMenuId, setOpenMenuId] = useState<MenuItemId | null>(null);

	// Close all menus when shouldCloseAll is true
	useEffect(() => {
		if (shouldCloseAll) {
			setOpenMenuId(null);
		}
	}, [shouldCloseAll]);

	// Check if a specific menu is open
	const isOpen = useCallback(
		(menuId: MenuItemId): boolean => {
			return openMenuId === menuId;
		},
		[openMenuId],
	);

	// Toggle a menu open/closed
	// If opening, close all other menus (exclusive behavior)
	const toggle = useCallback((menuId: MenuItemId): void => {
		setOpenMenuId((current) => (current === menuId ? null : menuId));
	}, []);

	return {
		isOpen,
		toggle,
	};
};
