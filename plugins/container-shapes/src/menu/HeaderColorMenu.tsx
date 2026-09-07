import { isString } from "@jiscribe/basic-validators";
import type { ObjectMenuItemProps } from "@jiscribe/canvas";
import {
	ObjectMenuColorPickerGrid,
	ObjectMenuDropdownPanel,
	ObjectMenuItemPositioner,
	ObjectMenuButton,
	getFirstSelectedPropValue,
	resolveAutoColor,
	resolveLocaleMessages,
	useCanvasLocale,
	useSubmenuPosition,
} from "@jiscribe/canvas-sdk";
import { memo, useRef } from "react";

import { HeaderColorPreviewIcon } from "./HeaderColorPreviewIcon";
import { containerMessagesByLocale } from "../messages/containerMessages";
import { CONTAINER_DOC_DEFAULTS } from "../schema/ContainerDoc";

const SECTION_ID = "header-color";

const getSelectedHeaderColor = (
	selectedIds: string[],
	objects: ObjectMenuItemProps["objects"],
): string =>
	getFirstSelectedPropValue(selectedIds, objects, "headerFill", isString) ??
	CONTAINER_DOC_DEFAULTS.headerFill;

/**
 * Header color menu (container only). Sets the `headerFill` property via a color
 * picker. Unset reads as the doc default (`"auto"`, the theme surface), which is
 * what the header is drawn with (Container.tsx).
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
