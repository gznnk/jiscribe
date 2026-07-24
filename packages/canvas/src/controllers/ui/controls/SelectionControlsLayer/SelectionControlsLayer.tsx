import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { useCanvasRegistries } from "../../../setup/CanvasRegistriesContext";

type SelectionControlsLayerProps = {
	selectedIds: string[];
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
> = ({ selectedIds, objects, zoom = 1, isTextEditing }) => {
	const registries = useCanvasRegistries();

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
					key={control.part}
					object={selectedObject}
					zoom={zoom}
					part={control.part}
				/>
			))}
		</>
	);
};

export const SelectionControlsLayer = memo(SelectionControlsLayerComponent);
