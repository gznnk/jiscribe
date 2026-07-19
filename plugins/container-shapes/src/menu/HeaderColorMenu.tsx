import type { MenuItemProps } from "@workspace/canvas";
import {
	ColorPickerGrid,
	DropdownPanel,
	MenuItemPositioner,
	ObjectMenuButton,
	getFirstSelectedWithProp,
	resolveAutoColor,
	useCanvasMessages,
	useSubmenuPosition,
	type CanvasControllerState,
} from "@workspace/canvas/unstable";
import { memo, useRef } from "react";

import { HeaderColorPreviewIcon } from "./HeaderColorPreviewIcon";

const SECTION_ID = "header-color";

const getSelectedHeaderColor = (state: CanvasControllerState): string => {
	const obj = getFirstSelectedWithProp(
		state.selectedIds,
		state.objects,
		"headerFill",
	);
	const headerFill = (obj as Record<string, unknown>)?.headerFill;
	return typeof headerFill === "string" ? headerFill : "transparent";
};

/**
 * Header color menu (container only). Sets the `headerFill` property via a color
 * picker. Unset = the header shows a derived faint tint of the stroke.
 *
 * `menuHeaderColor` is a core `CanvasMessageStrings` key (i18n (a) 方式,
 * docs/05_extensibility/custom-menu-design.md) — read via `useCanvasMessages()`
 * rather than a plugin-local string.
 */
const HeaderColorMenuComponent: React.FC<MenuItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = canvasState.objectMenuOpenId === SECTION_ID;
	const currentColor = getSelectedHeaderColor(canvasState);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<MenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-kind="menu"
				data-id="object-menu"
				data-part={`toggle:${SECTION_ID}`}
				title={messages.menuHeaderColor}
			>
				<HeaderColorPreviewIcon
					color={resolveAutoColor(currentColor, "surface")}
					title={messages.menuHeaderColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<DropdownPanel ref={submenuRef} placement={placement} offsetX={offsetX}>
					<ColorPickerGrid
						currentColor={currentColor}
						property="headerFill"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</DropdownPanel>
			)}
		</MenuItemPositioner>
	);
};

export const HeaderColorMenu = memo(HeaderColorMenuComponent);
