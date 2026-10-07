import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { StyleIntentUpdater } from "../../ObjectMenu/ObjectMenuTypes";
import type { PropertyPanelTransformUpdater } from "../PropertyPanelTypes";

/**
 * What every built-in sidebar row is handed. The whole controller state, the way
 * the ObjectMenu's own items take it: it is what the rows state the things no
 * style intent covers from — the transform frame and its two switches, the meta
 * target, whether a command is available. The selection's style is read through
 * the shared reader instead (useSelectionStyle), which both surfaces provide. A
 * plugin row gets the narrowed {@link PropertyPanelItemProps} instead.
 */
export type BuiltinItemProps = {
	canvasState: CanvasControllerState;
	onStyleIntent: StyleIntentUpdater;
	onTransformUpdate: PropertyPanelTransformUpdater;
};
