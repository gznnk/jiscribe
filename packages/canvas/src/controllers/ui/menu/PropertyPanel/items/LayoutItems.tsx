import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { isSelectionAutoHeight } from "../../../../commands/shape/ToggleAutoHeightCommand";
import {
	commandPart,
	setPart,
} from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../registries/CanvasRegistriesContext";
import { getSelectedLockAspectRatio } from "../../ObjectMenu/items/KeepAspectRatioMenu/utils/getSelectedLockAspectRatio";
import { PropertyCheckbox } from "../common/PropertyCheckbox";
import { PropertyNumberField } from "../common/PropertyNumberField";
import { PropertyRow } from "../common/PropertyRow";
import { PropertyPanelFieldGrid } from "../PropertyPanelStyled";
import { getSelectedFrameValues } from "../utils/getSelectedFrameValues";

/** A box may not be driven to zero, the floor the transform drag applies too. */
const MIN_DIMENSION = 1;

/**
 * The frame's top-left corner in world coordinates, as two fields.
 * Absent while the selection carries no frame (a connector, or nothing).
 */
const PositionItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onTransformUpdate,
}) => {
	const messages = useCanvasMessages();
	const frame = getSelectedFrameValues(canvasState);
	if (frame === null) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowPosition}>
			<PropertyPanelFieldGrid>
				<PropertyNumberField
					value={frame.x}
					prefix="X"
					ariaLabel={messages.propertyPanelFieldX}
					testId="property-field:x"
					onUpdate={(value, commit, coalesceHistory) =>
						onTransformUpdate("x", value, commit, coalesceHistory)
					}
				/>
				<PropertyNumberField
					value={frame.y}
					prefix="Y"
					ariaLabel={messages.propertyPanelFieldY}
					testId="property-field:y"
					onUpdate={(value, commit, coalesceHistory) =>
						onTransformUpdate("y", value, commit, coalesceHistory)
					}
				/>
			</PropertyPanelFieldGrid>
		</PropertyRow>
	);
};

export const PositionItem = memo(PositionItemComponent);

/** The frame's size, as two fields resizing it about its top-left corner. */
const SizeItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onTransformUpdate,
}) => {
	const messages = useCanvasMessages();
	const frame = getSelectedFrameValues(canvasState);
	if (frame === null) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowSize}>
			<PropertyPanelFieldGrid>
				<PropertyNumberField
					value={frame.width}
					prefix="W"
					min={MIN_DIMENSION}
					ariaLabel={messages.propertyPanelFieldWidth}
					testId="property-field:width"
					onUpdate={(value, commit, coalesceHistory) =>
						onTransformUpdate("width", value, commit, coalesceHistory)
					}
				/>
				<PropertyNumberField
					value={frame.height}
					prefix="H"
					min={MIN_DIMENSION}
					ariaLabel={messages.propertyPanelFieldHeight}
					testId="property-field:height"
					onUpdate={(value, commit, coalesceHistory) =>
						onTransformUpdate("height", value, commit, coalesceHistory)
					}
				/>
			</PropertyPanelFieldGrid>
		</PropertyRow>
	);
};

export const SizeItem = memo(SizeItemComponent);

/** The frame's rotation about its own center, in degrees. */
const RotationItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onTransformUpdate,
}) => {
	const messages = useCanvasMessages();
	const frame = getSelectedFrameValues(canvasState);
	if (frame === null) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowRotation}>
			<PropertyPanelFieldGrid>
				<PropertyNumberField
					value={frame.rotation}
					unit="°"
					ariaLabel={messages.propertyPanelFieldRotation}
					testId="property-field:rotation"
					onUpdate={(value, commit, coalesceHistory) =>
						onTransformUpdate("rotation", value, commit, coalesceHistory)
					}
				/>
			</PropertyPanelFieldGrid>
		</PropertyRow>
	);
};

export const RotationItem = memo(RotationItemComponent);

/** Whether a resize keeps the frame's proportions. */
const LockAspectRatioItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const isLocked = getSelectedLockAspectRatio(canvasState);

	return (
		<PropertyCheckbox
			isOn={isLocked}
			part={setPart("lockAspectRatio", isLocked ? "false" : "true")}
			label={messages.menuLockAspectRatio}
			title={
				isLocked ? messages.menuUnlockAspectRatio : messages.menuLockAspectRatio
			}
		/>
	);
};

export const LockAspectRatioItem = memo(LockAspectRatioItemComponent);

/**
 * Whether the height is the document's or the text's. Lit when every switchable
 * object in the selection already follows its text, so a selection with one
 * fixed shape in it reads as off and one press brings the whole selection to
 * auto (see `isSelectionAutoHeight`).
 */
const AutoHeightItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const { objectAutoHeight } = useCanvasRegistries();
	const isAuto = isSelectionAutoHeight(canvasState, objectAutoHeight);

	return (
		<PropertyCheckbox
			isOn={isAuto}
			part={commandPart("toggleAutoHeight")}
			label={messages.menuAutoHeight}
			title={isAuto ? messages.menuFixedHeight : messages.menuAutoHeight}
		/>
	);
};

export const AutoHeightItem = memo(AutoHeightItemComponent);
