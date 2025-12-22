import type React from "react";
import { memo } from "react";

import { useDiagramUpdateRecursively } from "../../../../../../hooks/useDiagramUpdateRecursively";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { isTextableState } from "../../../../../../utils/validation/isTextableState";
import { FontColor } from "../../../../../icons/FontColor";
import { DiagramMenuPositioner } from "../../../DiagramMenuStyled";
import { getFirstNonGroupDiagram } from "../../../utils/getFirstNonGroupDiagram";
import { ColorPicker } from "../../common/ColorPicker";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";

type FontColorMenuProps = {
	isOpen: boolean;
	onToggle: () => void;
	selectedDiagrams: Diagram[];
};

/**
 * FontColorMenu component.
 * Displays a font color icon and opens a color picker.
 */
const FontColorMenuComponent: React.FC<FontColorMenuProps> = ({
	isOpen,
	onToggle,
	selectedDiagrams,
}) => {
	const applyDiagramUpdate = useDiagramUpdateRecursively();

	// Get the first non-Group diagram and check if it's textable
	const firstDiagram = getFirstNonGroupDiagram(selectedDiagrams);
	const textableDiagram =
		firstDiagram && isTextableState(firstDiagram) ? firstDiagram : null;

	const currentColor = textableDiagram?.fontColor || "transparent";

	const handleColorChange = (color: string) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { fontColor: color },
			skipHistory: true,
		});
	};

	const handleColorChangeCommit = (color: string) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { fontColor: color },
		});
	};

	return (
		<DiagramMenuPositioner>
			<DiagramMenuButton isActive={isOpen} onClick={onToggle}>
				<FontColor title="Font Color" />
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

export const FontColorMenu = memo(FontColorMenuComponent);
