import { memo } from "react";

import type { ObjectState } from "../../../../../states/objects/base/ObjectState";
import type { CanvasControllerState } from "../../../../CanvasTypes";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { resolveMetaTargetId } from "../../../../utils/resolveMetaTargetId";
import { PropertyRow } from "../common/PropertyRow";
import { PropertyTextField } from "../common/PropertyTextField";
import type { PropertyPanelMetaUpdater } from "../PropertyPanelTypes";

type MetaItemProps = {
	/** The state the row reads: the one object the selection names, and its `meta`. */
	canvasState: CanvasControllerState;
	onMetaUpdate: PropertyPanelMetaUpdater;
};

/**
 * The object the Meta section is drawn for. Undefined while the selection names
 * no single one, which is also when the section itself is not shown
 * (isMetaSectionShown); an object carrying no note yet is still one, and gets
 * its rows empty.
 */
const resolveMetaTarget = (
	canvasState: CanvasControllerState,
): ObjectState | undefined => {
	const targetId = resolveMetaTargetId(canvasState);
	if (targetId === null) {
		return undefined;
	}
	return canvasState.objects[targetId];
};

/**
 * The name the object goes by outside the drawing — in the document, and to an
 * AI reading it. Emptying the field drops it again, so no empty note is left
 * behind.
 */
const MetaNameItemComponent: React.FC<MetaItemProps> = ({
	canvasState,
	onMetaUpdate,
}) => {
	const messages = useCanvasMessages();
	const target = resolveMetaTarget(canvasState);
	if (target === undefined) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowName}>
			<PropertyTextField
				value={target.meta?.name ?? ""}
				ariaLabel={messages.propertyPanelRowName}
				testId="property-field:metaName"
				onUpdate={(value, commit) =>
					onMetaUpdate("name", value === "" ? null : value, commit)
				}
			/>
		</PropertyRow>
	);
};

export const MetaNameItem = memo(MetaNameItemComponent);

/** What the object is for, over several lines: Enter breaks the line, Ctrl/Cmd+Enter commits. */
const MetaDescriptionItemComponent: React.FC<MetaItemProps> = ({
	canvasState,
	onMetaUpdate,
}) => {
	const messages = useCanvasMessages();
	const target = resolveMetaTarget(canvasState);
	if (target === undefined) {
		return null;
	}

	return (
		<PropertyRow label={messages.propertyPanelRowDescription}>
			<PropertyTextField
				value={target.meta?.description ?? ""}
				multiline
				ariaLabel={messages.propertyPanelRowDescription}
				testId="property-field:metaDescription"
				onUpdate={(value, commit) =>
					onMetaUpdate("description", value === "" ? null : value, commit)
				}
			/>
		</PropertyRow>
	);
};

export const MetaDescriptionItem = memo(MetaDescriptionItemComponent);
