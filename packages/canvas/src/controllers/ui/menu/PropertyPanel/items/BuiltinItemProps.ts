import type { CanvasControllerState } from "../../../../CanvasTypes";
import type { StylePropertyUpdater } from "../../ObjectMenu/ObjectMenuTypes";
import type { PropertyPanelTransformUpdater } from "../PropertyPanelTypes";

/**
 * What every built-in sidebar row is handed. The whole controller state, the way
 * the ObjectMenu's own items take it: a row reads the selection's style through
 * the shared readers, which resolve a text slot against the open editor and the
 * per-type defaults. A plugin row gets the narrowed
 * {@link PropertyPanelItemProps} instead.
 */
export type BuiltinItemProps = {
	canvasState: CanvasControllerState;
	onPropertyUpdate: StylePropertyUpdater;
	onTransformUpdate: PropertyPanelTransformUpdater;
};
