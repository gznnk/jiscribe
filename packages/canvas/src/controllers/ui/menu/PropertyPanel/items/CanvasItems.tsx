import {
	AUTO_COLOR,
	isAutoColor,
} from "@jiscribe/doc/model/objects/utils/autoColor";
import { memo, useCallback } from "react";

import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import type { ObjectMenuPropertyUpdater } from "../../ObjectMenu/ObjectMenuTypes";
import { PropertyColorField } from "../common/PropertyColorField";
import { PropertyRow } from "../common/PropertyRow";
import type { PropertyPanelDocumentUpdater } from "../PropertyPanelTypes";

type BackgroundItemProps = {
	/** The document's surface color; undefined means it declares none. */
	background: string | undefined;
	onDocumentUpdate: PropertyPanelDocumentUpdater;
};

/**
 * The canvas surface color. Unset is shown as `auto` — the theme's own canvas
 * color beside the word — because that is exactly what an omitted `background`
 * means, and picking Auto back writes null so the field is dropped rather than
 * frozen at whatever the theme happened to be.
 */
const BackgroundItemComponent: React.FC<BackgroundItemProps> = ({
	background,
	onDocumentUpdate,
}) => {
	const messages = useCanvasMessages();

	// The picker speaks the style-property shape, so the sentinel it writes for
	// Auto is translated here into the null the document route takes.
	const handleColorUpdate = useCallback<ObjectMenuPropertyUpdater>(
		(_property, value, commit, coalesceHistory) => {
			onDocumentUpdate(
				"background",
				isAutoColor(value) ? null : value,
				commit,
				coalesceHistory,
			);
		},
		[onDocumentUpdate],
	);

	return (
		<PropertyRow label={messages.propertyPanelRowBackground}>
			<PropertyColorField
				value={background ?? AUTO_COLOR}
				property="background"
				role="canvas"
				writesThroughCallback
				title={messages.propertyPanelRowBackground}
				onPropertyUpdate={handleColorUpdate}
			/>
		</PropertyRow>
	);
};

export const BackgroundItem = memo(BackgroundItemComponent);
