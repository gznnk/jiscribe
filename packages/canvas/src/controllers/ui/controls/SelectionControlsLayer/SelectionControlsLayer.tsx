import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { CanvasSelection } from "../../../selection/CanvasSelection";

type SelectionControlsLayerProps = {
	/**
	 * `state.selection` as it stands. Its `part` reaches every control of the sole
	 * selected object as `selectedPart` (reconcileSelection keeps it naming a part
	 * that object still holds).
	 */
	selection: CanvasSelection;
	objects: Record<string, ObjectState>;
	zoom?: number;
	isTextEditing: boolean;
};

/**
 * Renders the type-specific selection controls registered via
 * `ObjectTypeDefinition.selectionControls` (e.g. the container header-height
 * handle). Single selection only; the built-in transform/vertex/connector
 * layers stay separate because they key on capabilities or controller state
 * rather than the object type.
 */
const SelectionControlsLayerComponent: React.FC<
	SelectionControlsLayerProps
> = ({ selection, objects, zoom = 1, isTextEditing }) => {
	const registries = useCanvasRegistries();
	const { objectIds: selectedIds } = selection;

	// Do not render controls while text editing
	if (isTextEditing || selectedIds.length !== 1) {
		return null;
	}

	const selectedObject = objects[selectedIds[0]];
	if (!selectedObject) {
		return null;
	}

	const controls = registries.selectionControl.get(selectedObject.type);
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
