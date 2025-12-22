import type React from "react";
import { memo } from "react";

import {
	BorderStyleMenuWrapper,
	BorderStyleSection,
} from "./BorderStyleMenuStyled";
import { useDiagramUpdateRecursively } from "../../../../../../hooks/useDiagramUpdateRecursively";
import type { StrokeDashType } from "../../../../../../types/core/StrokeDashType";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { isCornerRoundableState } from "../../../../../../utils/validation/isCornerRoundableState";
import { isStrokableState } from "../../../../../../utils/validation/isStrokableState";
import { DashedCircle } from "../../../../../icons/DashedCircle";
import { DashedLine } from "../../../../../icons/DashedLine";
import { DottedLine } from "../../../../../icons/DottedLine";
import { SolidLine } from "../../../../../icons/SolidLine";
import {
	DEFAULT_BORDER_RADIUS,
	DEFAULT_BORDER_WIDTH,
	MAX_BORDER_RADIUS,
	MAX_BORDER_WIDTH,
	MIN_BORDER_RADIUS,
	MIN_BORDER_WIDTH,
} from "../../../DiagramMenuConstants";
import { DiagramMenuPositioner } from "../../../DiagramMenuStyled";
import { getFirstNonGroupDiagram } from "../../../utils/getFirstNonGroupDiagram";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";
import { DiagramMenuControl } from "../../common/DiagramMenuControl";
import { MenuSlider } from "../../common/MenuSlider";

type BorderStyleMenuProps = {
	isOpen: boolean;
	onToggle: () => void;
	selectedDiagrams: Diagram[];
	/** Whether to show corner radius control */
	showRadius?: boolean;
};

const BorderStyleMenuComponent: React.FC<BorderStyleMenuProps> = ({
	isOpen,
	onToggle,
	selectedDiagrams,
	showRadius = true,
}) => {
	const applyDiagramUpdate = useDiagramUpdateRecursively();

	// Get the first non-Group diagram
	const firstDiagram = getFirstNonGroupDiagram(selectedDiagrams);

	// Type-safe extraction of properties using type guards
	const strokeWidth = isStrokableState(firstDiagram)
		? firstDiagram.strokeWidth
		: DEFAULT_BORDER_WIDTH;
	const strokeDashType = isStrokableState(firstDiagram)
		? firstDiagram.strokeDashType
		: undefined;
	const cornerRadius = isCornerRoundableState(firstDiagram)
		? firstDiagram.cornerRadius
		: DEFAULT_BORDER_RADIUS;

	const handleStrokeWidthChange = (width: number) => {
		// Real-time update (no history saving)
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { strokeWidth: width },
			skipHistory: true,
		});
	};

	const handleStrokeWidthCommit = (width: number) => {
		// Save history on commit
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { strokeWidth: width },
		});
	};

	const handleStrokeDashChange = (dashType: StrokeDashType) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { strokeDashType: dashType },
		});
	};

	const handleCornerRadiusChange = (radius: number) => {
		// Real-time update (no history saving)
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { cornerRadius: radius },
			skipHistory: true,
		});
	};

	const handleCornerRadiusCommit = (radius: number) => {
		// Save history on commit
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { cornerRadius: radius },
		});
	};

	return (
		<DiagramMenuPositioner>
			<DiagramMenuButton isActive={isOpen} onClick={onToggle}>
				<DashedCircle title="Border Style" />
			</DiagramMenuButton>
			{isOpen && (
				<DiagramMenuControl>
					<BorderStyleMenuWrapper>
						{/* Stroke Dash Type */}
						<BorderStyleSection>
							<DiagramMenuButton
								isActive={strokeDashType === "solid"}
								onClick={() => handleStrokeDashChange("solid")}
							>
								<SolidLine title="Solid line" />
							</DiagramMenuButton>
							<DiagramMenuButton
								isActive={strokeDashType === "dashed"}
								onClick={() => handleStrokeDashChange("dashed")}
							>
								<DashedLine title="Dashed line" />
							</DiagramMenuButton>
							<DiagramMenuButton
								isActive={strokeDashType === "dotted"}
								onClick={() => handleStrokeDashChange("dotted")}
							>
								<DottedLine title="Dotted line" />
							</DiagramMenuButton>
						</BorderStyleSection>

						{/* Stroke Width */}
						<MenuSlider
							label="Border Width"
							value={strokeWidth}
							min={MIN_BORDER_WIDTH}
							max={MAX_BORDER_WIDTH}
							onChange={handleStrokeWidthChange}
							onChangeCommit={handleStrokeWidthCommit}
						/>

						{/* Corner Radius */}
						{showRadius && (
							<MenuSlider
								label="Corner Radius"
								value={cornerRadius}
								min={MIN_BORDER_RADIUS}
								max={MAX_BORDER_RADIUS}
								onChange={handleCornerRadiusChange}
								onChangeCommit={handleCornerRadiusCommit}
							/>
						)}
					</BorderStyleMenuWrapper>
				</DiagramMenuControl>
			)}
		</DiagramMenuPositioner>
	);
};

export const BorderStyleMenu = memo(BorderStyleMenuComponent);
