import { memo } from "react";

import type { ObjectState } from "../../../../states/objects/base/ObjectState";
import { useCanvasRegistries } from "../../../registries/CanvasRegistriesContext";
import type { ObjectPartSelection } from "../../../selection/ObjectPartSelection";

type SelectionControlsLayerProps = {
	selectedIds: string[];
	objects: Record<string, ObjectState>;
	zoom?: number;
	isTextEditing: boolean;
	/**
	 * Part selection already validated by resolveObjectPartSelection; a raw
	 * state.objectPartSelection must not be passed, as a stale one would draw a
	 * control as selected on a part the object no longer has. It always names the
	 * single selected object, so it reaches every control of that object as is.
	 */
	objectPartSelection: ObjectPartSelection | null;
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
> = ({
	selectedIds,
	objects,
	zoom = 1,
	isTextEditing,
	objectPartSelection,
}) => {
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
					selectedParts={objectPartSelection}
				/>
			))}
		</>
	);
};

export const SelectionControlsLayer = memo(SelectionControlsLayerComponent);
