import { type Dispatch, useCallback } from "react";

import type {
	CanvasAction,
	DocumentPropertyUpdate,
} from "../reducer/CanvasActions";
import type { StyleIntentUpdater } from "../ui/menu/ObjectMenu/ObjectMenuTypes";
import type {
	PropertyPanelDocumentUpdater,
	PropertyPanelMetaUpdater,
	PropertyPanelTransformUpdater,
} from "../ui/menu/PropertyPanel/PropertyPanelTypes";

type PropertyUpdaters = {
	/** Shared by ObjectMenu and PropertyPanel. */
	handleStyleIntent: StyleIntentUpdater;
	handleTransformUpdate: PropertyPanelTransformUpdater;
	handleDocumentUpdate: PropertyPanelDocumentUpdater;
	handleMetaUpdate: PropertyPanelMetaUpdater;
};

/**
 * The stable callbacks through which the style menu and the property panel
 * edit the selection, the document and its meta.
 */
export const usePropertyUpdaters = (
	dispatch: Dispatch<CanvasAction>,
): PropertyUpdaters => {
	const handleStyleIntent = useCallback<StyleIntentUpdater>(
		(intent, commit, coalesceHistory = false) => {
			dispatch({ type: "STYLE_INTENT", intent, commit, coalesceHistory });
		},
		[dispatch],
	);

	const handleTransformUpdate = useCallback<PropertyPanelTransformUpdater>(
		(property, value, commit, coalesceHistory = false) => {
			dispatch({
				type: "TRANSFORM_PROPERTY_UPDATE",
				property,
				value,
				commit,
				coalesceHistory,
			});
		},
		[dispatch],
	);

	const handleDocumentUpdate = useCallback<PropertyPanelDocumentUpdater>(
		(property, value, commit, coalesceHistory = false) => {
			// The updater's type parameter ties `value` to `property`, but TS cannot
			// carry that tie into the discriminated union the action is.
			const update = { property, value } as DocumentPropertyUpdate;
			dispatch({
				type: "DOCUMENT_PROPERTY_UPDATE",
				...update,
				commit,
				coalesceHistory,
			});
		},
		[dispatch],
	);

	const handleMetaUpdate = useCallback<PropertyPanelMetaUpdater>(
		(property, value, commit, coalesceHistory = false) => {
			dispatch({
				type: "META_PROPERTY_UPDATE",
				property,
				value,
				commit,
				coalesceHistory,
			});
		},
		[dispatch],
	);

	return {
		handleStyleIntent,
		handleTransformUpdate,
		handleDocumentUpdate,
		handleMetaUpdate,
	};
};
