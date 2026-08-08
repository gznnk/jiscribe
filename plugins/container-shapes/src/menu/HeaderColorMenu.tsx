import type { ObjectMenuItemProps } from "@workspace/canvas";
import {
	ObjectMenuColorPickerGrid,
	ObjectMenuDropdownPanel,
	ObjectMenuItemPositioner,
	ObjectMenuButton,
	getFirstSelectedWithProp,
	resolveAutoColor,
	resolveLocaleMessages,
	useCanvasLocale,
	useSubmenuPosition,
} from "@workspace/canvas-sdk";
import { memo, useRef } from "react";

import { HeaderColorPreviewIcon } from "./HeaderColorPreviewIcon";
import { containerMessagesByLocale } from "../messages/containerMessages";

const SECTION_ID = "header-color";

const getSelectedHeaderColor = (
	selectedIds: string[],
	objects: ObjectMenuItemProps["objects"],
): string => {
	const obj = getFirstSelectedWithProp(selectedIds, objects, "headerFill");
	const headerFill = (obj as Record<string, unknown>)?.headerFill;
	return typeof headerFill === "string" ? headerFill : "transparent";
};

/**
 * Header color menu (container only). Sets the `headerFill` property via a color
 * picker. Unset = the header shows a derived faint tint of the stroke.
 *
 * `menuHeaderColor` is owned by this plugin: its dictionary is resolved from the
 * canvas locale (`useCanvasLocale` + `resolveLocaleMessages`), not from core.
 */
const HeaderColorMenuComponent: React.FC<ObjectMenuItemProps> = ({
	objects,
	selectedIds,
	openSectionId,
	onPropertyUpdate,
}) => {
	const locale = useCanvasLocale();
	const messages = resolveLocaleMessages(containerMessagesByLocale, locale);
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const currentColor = getSelectedHeaderColor(selectedIds, objects);
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
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
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={currentColor}
						property="headerFill"
						onPropertyUpdate={onPropertyUpdate}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

export const HeaderColorMenu = memo(HeaderColorMenuComponent);
