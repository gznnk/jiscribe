import type React from "react";
import { memo } from "react";

import { FontSizeMenuWrapper } from "./FontSizeMenuStyled";
import { useDiagramUpdateRecursively } from "../../../../../../hooks/useDiagramUpdateRecursively";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { isTextableState } from "../../../../../../utils/validation/isTextableState";
import { FontSize } from "../../../../../icons/FontSize";
import {
	DEFAULT_FONT_SIZE,
	MAX_FONT_SIZE,
	MIN_FONT_SIZE,
} from "../../../DiagramMenuConstants";
import { DiagramMenuPositioner } from "../../../DiagramMenuStyled";
import { getFirstNonGroupDiagram } from "../../../utils/getFirstNonGroupDiagram";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";
import { DiagramMenuControl } from "../../common/DiagramMenuControl";
import { MenuSlider } from "../../common/MenuSlider";

type FontSizeMenuProps = {
	isOpen: boolean;
	onToggle: () => void;
	selectedDiagrams: Diagram[];
};

/**
 * FontSizeMenu component.
 * Displays a font size icon and opens a slider control.
 */
const FontSizeMenuComponent: React.FC<FontSizeMenuProps> = ({
	isOpen,
	onToggle,
	selectedDiagrams,
}) => {
	const applyDiagramUpdate = useDiagramUpdateRecursively();

	// Get the first non-Group diagram and check if it's textable
	const firstDiagram = getFirstNonGroupDiagram(selectedDiagrams);
	const fontSize = isTextableState(firstDiagram)
		? firstDiagram.fontSize
		: DEFAULT_FONT_SIZE;

	const handleFontSizeChange = (size: number) => {
		// Real-time update (no history saving)
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { fontSize: size },
			skipHistory: true,
		});
	};

	const handleFontSizeCommit = (size: number) => {
		// Save history on commit
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { fontSize: size },
		});
	};

	return (
		<DiagramMenuPositioner>
			<DiagramMenuButton isActive={isOpen} onClick={onToggle}>
				<FontSize title="Font Size" />
			</DiagramMenuButton>
			{isOpen && (
				<DiagramMenuControl>
					<FontSizeMenuWrapper>
						<MenuSlider
							label="Font Size"
							value={fontSize}
							min={MIN_FONT_SIZE}
							max={MAX_FONT_SIZE}
							onChange={handleFontSizeChange}
							onChangeCommit={handleFontSizeCommit}
						/>
					</FontSizeMenuWrapper>
				</DiagramMenuControl>
			)}
		</DiagramMenuPositioner>
	);
};

export const FontSizeMenu = memo(FontSizeMenuComponent);
