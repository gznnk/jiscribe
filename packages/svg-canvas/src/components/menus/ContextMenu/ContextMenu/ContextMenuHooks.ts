import { useCallback, useState } from "react";

// Import types related to SvgCanvas.
import type { ContextMenuStateMap, ContextMenuType } from "./ContextMenuTypes";
import type { SvgCanvasProps } from "../../../../canvas/types/SvgCanvasProps";
// Import functions related to SvgCanvas.
// TEMPORARY: Commented out due to EventBusContext not being available in this component
// import { useGroup } from "../../../../hooks/useGroup";
// import { useUngroup } from "../../../../hooks/useUngroup";
import { getSelectedDiagrams } from "../../../../utils/core/getSelectedDiagrams";
import { isExportable } from "../../../../utils/validation/isExportable";
// Imports related to this component.

export const useContextMenu = (
	canvasProps: SvgCanvasProps,
	containerRef?: React.RefObject<HTMLDivElement | null>,
) => {
	// TEMPORARY: Commented out due to EventBusContext not being available in this component
	// const onGroup = useGroup();
	// const onUngroup = useUngroup();

	// Extract properties from canvasProps.
	const {
		items,
		multiSelectGroup,
		history,
		historyIndex,
		suppressContextMenu,
		onUndo,
		onRedo,
		onSelectAll,
		onExport,
		onDelete,
		onCopy,
		onPaste,
	} = canvasProps;

	// State to manage the context menu position and visibility
	const [contextMenuState, setContextMenuState] = useState({
		x: 0,
		y: 0,
		isVisible: false,
	});

	// Create a map of context menu states.
	const selectedItems = getSelectedDiagrams(items);
	const isItemSelected = selectedItems.length > 0;
	const isGroupSelected = selectedItems.some((item) => item.type === "Group");
	const isExportableSelected = selectedItems.some((item) => isExportable(item));
	const menuStateMap = {
		Undo: historyIndex > 0 ? "Enable" : "Disable",
		Redo: historyIndex < history.length - 1 ? "Enable" : "Disable",
		Copy: isItemSelected ? "Enable" : "Disable",
		Paste: "Enable", // Paste function is always enabled
		SelectAll: items.length > 0 ? "Enable" : "Disable",
		Group: multiSelectGroup ? "Enable" : "Disable",
		Ungroup: isGroupSelected ? "Enable" : "Disable",
		Export: isExportableSelected ? "Enable" : "Disable",
		Delete: isItemSelected ? "Enable" : "Disable",
	} as ContextMenuStateMap;

	/**
	 * Handle menu item clicks.
	 */
	const onMenuClick = useCallback(
		(menuType: ContextMenuType) => {
			switch (menuType) {
				case "Undo":
					onUndo?.();
					break;
				case "Redo":
					onRedo?.();
					break;
				case "Copy":
					onCopy?.();
					break;
				case "Paste":
					onPaste?.();
					break;
				case "SelectAll":
					onSelectAll?.();
					break;
				case "Group":
					// TEMPORARY: Disabled due to EventBusContext not being available
					// {
					// 	const diagramIds = selectedItems.map((d) => d.id);
					// 	onGroup({ diagramIds });
					// }
					break;
				case "Ungroup":
					// TEMPORARY: Disabled due to EventBusContext not being available
					// onUngroup();
					break;
				case "Export":
					onExport?.();
					break;
				case "Delete":
					onDelete?.();
					break;
				default:
			}
			setContextMenuState({ x: 0, y: 0, isVisible: false });
		},
		[
			onUndo,
			onRedo,
			onCopy,
			onPaste,
			onSelectAll,
			// TEMPORARY: Removed onGroup, onUngroup, selectedItems from dependencies
			onExport,
			onDelete,
		],
	);

	/**
	 * Handle right-click events to show the context menu.
	 */
	const onContextMenu = useCallback(
		(e: React.MouseEvent<SVGSVGElement>) => {
			e.preventDefault();

			// If context menu should be suppressed (e.g., after grab scroll), do not show it.
			if (suppressContextMenu === true) return;

			let x = e.clientX;
			let y = e.clientY;

			// Adjust coordinates relative to the container if containerRef is provided
			if (containerRef?.current) {
				const containerRect = containerRef.current.getBoundingClientRect();
				x = e.clientX - containerRect.left;
				y = e.clientY - containerRect.top;
			}

			setContextMenuState({ x, y, isVisible: true });
		},
		[suppressContextMenu, containerRef],
	);

	/**
	 * Close the context menu.
	 */
	const closeContextMenu = useCallback(() => {
		setContextMenuState((prevState) => ({
			...prevState,
			isVisible: false,
		}));
	}, []);

	// Get container dimensions for positioning logic
	const containerWidth = containerRef?.current?.clientWidth ?? 0;
	const containerHeight = containerRef?.current?.clientHeight ?? 0;

	return {
		contextMenuProps: {
			...contextMenuState,
			containerWidth,
			containerHeight,
			menuStateMap,
			onMenuClick,
		},
		contextMenuHandlers: {
			onContextMenu,
		},
		contextMenuFunctions: {
			closeContextMenu,
		},
	};
};
