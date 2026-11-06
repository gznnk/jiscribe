import { AUTO_COLOR } from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo, useRef } from "react";

import { useCanvasMessages } from "../../../../../../foundation/i18n/CanvasMessagesContext";
import { useDocumentSurface } from "../../../../../../rendering/objects/DocumentSurfaceContext";
import { resolveLabelFill } from "../../../../../../rendering/objects/utils/resolveLabelFill";
import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { toggleAction } from "../../../../../gestures/handlers/menu/utils/menuActions";
import { useMemoAcrossMoveDrag } from "../../../../../hooks/useMemoAcrossMoveDrag";
import type { SelectionValue } from "../../../../../style/SelectionValue";
import {
	isMixedSelectionValue,
	selectionMixedValues,
	selectionValueOr,
} from "../../../../../style/SelectionValue";
import { CONNECTOR_STYLE_TABLE } from "../../../../../style/tables/connectorStyleTable";
import { hasSelectedConnectorLabelText } from "../../../../../utils/hasSelectedConnectorLabelText";
import { hasSelectedLabelText } from "../../../../../utils/hasSelectedLabelText";
import { ColorPreviewIcon } from "../../../../icons/ColorPreviewIcon";
import { useSelectionStyle } from "../../../SelectionStyleReaderContext";
import { ObjectMenuColorPickerGrid } from "../../common/ObjectMenuColorPickerGrid/ObjectMenuColorPickerGrid";
import { ObjectMenuDropdownPanel } from "../../common/ObjectMenuDropdownPanel";
import { useSubmenuPosition } from "../../hooks/useSubmenuPosition";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";
import type {
	ObjectMenuItemProps,
	StyleIntentUpdater,
} from "../../ObjectMenuTypes";

const SECTION_ID = "label-bg-color";

type LabelBackgroundColorMenuProps = {
	/** Where the color lands: a connector label's `label.fill`, or a `text: "label"` caption's `labelFill`. */
	property: "label.fill" | "labelFill";
	/** What the selection states for `property`, an unset one reading as undefined or `"auto"`. */
	fill: SelectionValue<string | undefined>;
	/** Whether the selection holds a label to paint; false draws nothing, and the emptied section collapses via `:empty`. */
	hasLabelText: boolean;
	/** ID of the currently open menu section. */
	openSectionId: string | null;
	onStyleIntent: StyleIntentUpdater;
};

/**
 * A label's background color menu (same layout as the shape's Background
 * Color), for whichever label `property` names. Omitted/auto shows the page's
 * color, as resolveLabelFill resolves it (knockout); a selection disagreeing on
 * it shows every color it holds and checks none.
 */
const LabelBackgroundColorMenuComponent: React.FC<
	LabelBackgroundColorMenuProps
> = ({ property, fill, hasLabelText, openSectionId, onStyleIntent }) => {
	const messages = useCanvasMessages();
	const documentSurface = useDocumentSurface();
	const menuItemRef = useRef<HTMLDivElement>(null);
	const isOpen = openSectionId === SECTION_ID;
	const { submenuRef, placement, offsetX } = useSubmenuPosition(
		menuItemRef,
		isOpen,
	);

	if (!hasLabelText) {
		return null;
	}

	const isMixed = isMixedSelectionValue(fill);
	const currentColor = selectionValueOr(fill, AUTO_COLOR);
	return (
		<ObjectMenuItemPositioner ref={menuItemRef}>
			<ObjectMenuButton
				isActive={isOpen}
				data-action={toggleAction(SECTION_ID)}
				title={messages.menuLabelBackgroundColor}
			>
				<ColorPreviewIcon
					color={resolveLabelFill(currentColor, documentSurface)}
					mixedColors={selectionMixedValues(fill)?.map((mixedColor) =>
						resolveLabelFill(mixedColor, documentSurface),
					)}
					title={messages.menuLabelBackgroundColor}
				/>
			</ObjectMenuButton>
			{isOpen && (
				<ObjectMenuDropdownPanel
					ref={submenuRef}
					placement={placement}
					offsetX={offsetX}
				>
					<ObjectMenuColorPickerGrid
						currentColor={isMixed ? "" : currentColor}
						// Not mixed means every label the selection reaches was read.
						currentColorIsShared={!isMixed}
						property={property}
						onStyleIntent={onStyleIntent}
					/>
				</ObjectMenuDropdownPanel>
			)}
		</ObjectMenuItemPositioner>
	);
};

const LabelBackgroundColorMenu = memo(LabelBackgroundColorMenuComponent);

/** The selected connector's label background (`label.fill`), the custom item of its menu. */
const ConnectorLabelBackgroundColorMenuComponent: React.FC<
	ObjectMenuItemProps
> = ({ objects, selection, openSectionId, onStyleIntent }) => (
	<LabelBackgroundColorMenu
		property="label.fill"
		fill={useSelectionStyle(CONNECTOR_STYLE_TABLE, "label.fill")}
		hasLabelText={hasSelectedConnectorLabelText({ objects, selection })}
		openSectionId={openSectionId}
		onStyleIntent={onStyleIntent}
	/>
);

export const ConnectorLabelBackgroundColorMenu = memo(
	ConnectorLabelBackgroundColorMenuComponent,
);

type LabelFillMenuProps = {
	canvasState: CanvasControllerState;
	onStyleIntent: StyleIntentUpdater;
};

/**
 * The background of the selected `text: "label"` captions (`labelFill`), the
 * `labelBackgroundColor` built-in item. Offered while any caption the selection
 * reaches has text.
 */
const LabelFillMenuComponent: React.FC<LabelFillMenuProps> = ({
	canvasState,
	onStyleIntent,
}) => (
	<LabelBackgroundColorMenu
		property="labelFill"
		fill={useSelectionStyle("labelFill")}
		// Walks the selected groups' descendants, so a move drag reuses the answer.
		hasLabelText={useMemoAcrossMoveDrag(
			canvasState,
			() => hasSelectedLabelText(canvasState),
			[canvasState.selection],
		)}
		openSectionId={canvasState.objectMenuOpenId}
		onStyleIntent={onStyleIntent}
	/>
);

export const LabelFillMenu = memo(LabelFillMenuComponent);
