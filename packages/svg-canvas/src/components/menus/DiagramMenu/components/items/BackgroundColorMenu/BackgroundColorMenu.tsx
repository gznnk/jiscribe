import type React from "react";
import { memo } from "react";

import { useDiagramUpdateRecursively } from "../../../../../../hooks/useDiagramUpdateRecursively";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { isFillableState } from "../../../../../../utils/validation/isFillableState";
import { DiagramMenuPositioner } from "../../../DiagramMenuStyled";
import { getFirstNonGroupDiagram } from "../../../utils/getFirstNonGroupDiagram";
import { ColorPicker } from "../../common/ColorPicker";
import { ColorPreview } from "../../common/ColorPreview";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";

type BackgroundColorMenuProps = {
	isOpen: boolean;
	onToggle: () => void;
	selectedDiagrams: Diagram[];
};

/**
 * BackgroundColorMenu component.
 * Displays a filled circle icon with the current background color and opens a color picker.
 */
const BackgroundColorMenuComponent: React.FC<BackgroundColorMenuProps> = ({
	isOpen,
	onToggle,
	selectedDiagrams,
}) => {
	const applyDiagramUpdate = useDiagramUpdateRecursively();

	// Get the first non-Group diagram and check if it's fillable
	const firstDiagram = getFirstNonGroupDiagram(selectedDiagrams);
	const fillableDiagram =
		firstDiagram && isFillableState(firstDiagram) ? firstDiagram : null;

	const currentColor = fillableDiagram?.fill || "transparent";

	const handleColorChange = (color: string) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { fill: color },
			skipHistory: true,
		});
	};

	const handleColorChangeCommit = (color: string) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { fill: color },
		});
	};

	return (
		<DiagramMenuPositioner>
			<DiagramMenuButton isActive={isOpen} onClick={onToggle}>
				<ColorPreview color={currentColor} title="Background Color" />
			</DiagramMenuButton>
			{isOpen && (
				<ColorPicker
					color={currentColor}
					onColorChange={handleColorChange}
					onColorChangeCommit={handleColorChangeCommit}
				/>
			)}
		</DiagramMenuPositioner>
	);
};

export const BackgroundColorMenu = memo(BackgroundColorMenuComponent);
