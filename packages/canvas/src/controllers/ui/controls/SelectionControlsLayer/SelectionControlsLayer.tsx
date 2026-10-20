import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import type { DragKind } from "../../../CanvasTypes";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { CanvasSelection } from "../../../selection/CanvasSelection";
import { isObjectBeingMovedOrTransformed } from "../../utils/isObjectBeingMovedOrTransformed";
import type { SelectionControlLayer } from "../SelectionControlTypes";

type SelectionControlsLayerProps = {
	/** Which of the three layers this instance draws; the controls declaring another are left to its siblings. */
	layer: SelectionControlLayer;
	/**
	 * `state.selection` as it stands. Its `part` reaches every control of the sole
	 * selected object as `selectedPart` (reconcileSelection keeps it naming a part
	 * that object still holds).
	 */
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	zoom?: number;
	isTextEditing: boolean;
	/** Kind of the drag in progress; null when none is */
	activeDragKind: DragKind | null;
};

/**
 * Renders the type-specific selection controls registered via
 * `ObjectTypeDefinition.selectionControls` (e.g. the container header-height
 * handle). Single selection only; the built-in transform/vertex/connector
 * layers stay separate because they key on capabilities or controller state
 * rather than the object type.
 *
 * Mounted three times — under the selection outline, and on each side of those
 * layers — each instance drawing the controls that declared its `layer`
 * (SelectionControlLayer), so a control's place in the press order is its own
 * declaration rather than core's.
 *
 * Hidden while the object is moved or resized through a transform handle, as
 * the connection anchors are: the controls would only trail the shape, and none
 * of them is what is being dragged. A control's own drag opens as `"other"`
 * (the adapter sets no kind), so it keeps its handles through it.
 */
const SelectionControlsLayerComponent: React.FC<
	SelectionControlsLayerProps
> = ({
	layer,
	selection,
	objects,
	zoom = 1,
	isTextEditing,
	activeDragKind,
}) => {
	const registries = useCanvasRegistries();
	const { objectIds: selectedIds } = selection;

	// Do not render controls while text editing
	if (isTextEditing || selectedIds.length !== 1) {
		return null;
	}

	if (isObjectBeingMovedOrTransformed(activeDragKind)) {
		return null;
	}

	const selectedObject = objects[selectedIds[0]];
	if (!selectedObject) {
		return null;
	}

	const controls = registries.selectionControl
		.get(selectedObject.type)
		?.filter((control) => control.layer === layer);
	if (!controls?.length) {
		return null;
	}

	return (
		<>
			{controls.map((control) => (
				<control.Component
					key={control.action}
					object={selectedObject}
					zoom={zoom}
					action={control.action}
					selectedPart={selection.part}
				/>
			))}
		</>
	);
};

export const SelectionControlsLayer = memo(SelectionControlsLayerComponent);
