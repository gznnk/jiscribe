import { memo } from "react";

import type { CanvasControllerState } from "../../../../../../controllers/CanvasTypes";
import type { TextStyleState } from "../../../../../../states/objects/base/TextStyleState";
import { BoldIcon } from "../../../../icons/BoldIcon";
import { ObjectMenuButton, MenuItemPositioner } from "../../ObjectMenuStyled";

type BoldMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * 太字メニュー。
 * 選択中のテキストオブジェクトの fontWeight をトグルする。
 */
const BoldMenuComponent: React.FC<BoldMenuProps> = ({ canvasState }) => {
	// Get fontWeight from the first selected object (if it has text properties)
	const { selectedIds, objects } = canvasState;
	const firstSelectedId = selectedIds[0];
	const firstSelectedObject = firstSelectedId
		? objects[firstSelectedId]
		: undefined;
	const fontWeight =
		firstSelectedObject && "fontWeight" in firstSelectedObject
			? (firstSelectedObject as TextStyleState).fontWeight
			: "normal";
	const isBold = fontWeight === "bold";

	return (
		<MenuItemPositioner>
			<ObjectMenuButton
				isActive={isBold}
				data-kind="object-menu"
				data-id={`object-menu:set:fontWeight:${isBold ? "normal" : "bold"}`}
				title="Bold"
			>
				<BoldIcon />
			</ObjectMenuButton>
		</MenuItemPositioner>
	);
};

export const BoldMenu = memo(BoldMenuComponent);
