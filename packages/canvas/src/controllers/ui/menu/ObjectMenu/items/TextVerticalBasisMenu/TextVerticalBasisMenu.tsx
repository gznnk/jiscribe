import { memo } from "react";

import type { CanvasControllerState } from "../../../../../CanvasTypes";
import { isSelectionTextVerticalBasisFrame } from "../../../../../commands/shape/ToggleTextVerticalBasisCommand";
import { useCanvasMessages } from "../../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../../registries/CanvasRegistriesContext";
import { TextVerticalBasisIcon } from "../../../../icons/TextVerticalBasisIcon";
import {
	ObjectMenuButton,
	ObjectMenuItemPositioner,
} from "../../ObjectMenuStyled";

type TextVerticalBasisMenuProps = {
	canvasState: CanvasControllerState;
};

/**
 * Switches the selected shapes between placing their text in the region their
 * own outline leaves clear and placing it on their whole height. No dropdown —
 * the press toggles it, the way the auto-height switch does.
 *
 * Offered only for the types the switch actually moves the text of
 * (`ObjectTextVerticalBasisRegistry`), which is what registers the section this
 * item sits in: a selection mixing such a shape with a plain box drops the
 * section entirely, the menu keeping only the sections every selected type
 * registers (useMenuSections).
 *
 * Lit when every switchable object in the selection is already on the whole
 * height, so a selection with one region-placed shape in it reads as off and one
 * press brings the whole selection to the frame basis (see
 * `isSelectionTextVerticalBasisFrame`).
 */
const TextVerticalBasisMenuComponent: React.FC<TextVerticalBasisMenuProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const { objectTextVerticalBasis } = useCanvasRegistries();
	const isFrame = isSelectionTextVerticalBasisFrame(
		canvasState,
		objectTextVerticalBasis,
	);
	const title = isFrame
		? messages.menuTextBasisRegion
		: messages.menuTextBasisFrame;

	return (
		<ObjectMenuItemPositioner>
			<ObjectMenuButton
				isActive={isFrame}
				data-kind="menu"
				data-id="object-menu"
				data-part="command:toggleTextVerticalBasis"
				title={title}
			>
				<TextVerticalBasisIcon title={title} />
			</ObjectMenuButton>
		</ObjectMenuItemPositioner>
	);
};

export const TextVerticalBasisMenu = memo(TextVerticalBasisMenuComponent);
