import type React from "react";
import { memo } from "react";

import { LineStyleMenuWrapper, LineStyleSection } from "./LineStyleMenuStyled";
import { useDiagramUpdateRecursively } from "../../../../../../hooks/useDiagramUpdateRecursively";
import type { PathType } from "../../../../../../types/core/PathType";
import type { StrokeDashType } from "../../../../../../types/core/StrokeDashType";
import type { Diagram } from "../../../../../../types/state/core/Diagram";
import { CurvePathIcon } from "../../../../../icons/CurvePathIcon";
import { DashedLine } from "../../../../../icons/DashedLine";
import { DottedLine } from "../../../../../icons/DottedLine";
import { LineStyle as LineStyleIcon } from "../../../../../icons/LineStyle";
import { PolylinePathIcon } from "../../../../../icons/PolylinePathIcon";
import { RoundedPathIcon } from "../../../../../icons/RoundedPathIcon";
import { SolidLine } from "../../../../../icons/SolidLine";
import { StraightPathIcon } from "../../../../../icons/StraightPathIcon";
import {
	DEFAULT_STROKE_WIDTH,
	MAX_STROKE_WIDTH,
	MIN_STROKE_WIDTH,
} from "../../../DiagramMenuConstants";
import { DiagramMenuPositioner } from "../../../DiagramMenuStyled";
import { getFirstNonGroupDiagram } from "../../../utils/getFirstNonGroupDiagram";
import { DiagramMenuButton } from "../../common/DiagramMenuButton/DiagramMenuButton";
import { DiagramMenuControl } from "../../common/DiagramMenuControl";
import { MenuSlider } from "../../common/MenuSlider";

type LineStyleMenuProps = {
	isOpen: boolean;
	onToggle: () => void;
	selectedDiagrams: Diagram[];
};

const LineStyleMenuComponent: React.FC<LineStyleMenuProps> = ({
	isOpen,
	onToggle,
	selectedDiagrams,
}) => {
	const applyDiagramUpdate = useDiagramUpdateRecursively();

	// Get the first non-Group diagram
	const firstDiagram = getFirstNonGroupDiagram(selectedDiagrams);

	// Get stroke width, path type, and stroke dash type from the first diagram
	// If the property doesn't exist, it will be undefined
	const strokeWidth =
		(firstDiagram as { strokeWidth?: number } | undefined)?.strokeWidth ??
		DEFAULT_STROKE_WIDTH;
	const pathType = (firstDiagram as { pathType?: PathType } | undefined)
		?.pathType;
	const strokeDashType = (
		firstDiagram as { strokeDashType?: StrokeDashType } | undefined
	)?.strokeDashType;

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

	const handlePathTypeChange = (type: PathType) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { pathType: type },
		});
	};

	const handleStrokeDashChange = (dashType: StrokeDashType) => {
		applyDiagramUpdate({
			items: selectedDiagrams,
			data: { strokeDashType: dashType },
		});
	};

	return (
		<DiagramMenuPositioner>
			<DiagramMenuButton isActive={isOpen} onClick={onToggle}>
				<LineStyleIcon title="Line Style" />
			</DiagramMenuButton>
			{isOpen && (
				<DiagramMenuControl>
					<LineStyleMenuWrapper>
						<MenuSlider
							label="Line Width"
							value={strokeWidth}
							min={MIN_STROKE_WIDTH}
							max={MAX_STROKE_WIDTH}
							onChange={handleStrokeWidthChange}
							onChangeCommit={handleStrokeWidthCommit}
						/>
						{/* Path Type */}
						<LineStyleSection>
							<DiagramMenuButton
								isActive={pathType === "Straight"}
								onClick={() => handlePathTypeChange("Straight")}
							>
								<StraightPathIcon title="Straight path" />
							</DiagramMenuButton>
							<DiagramMenuButton
								isActive={pathType === "Polyline"}
								onClick={() => handlePathTypeChange("Polyline")}
							>
								<PolylinePathIcon title="Polyline path" />
							</DiagramMenuButton>
							<DiagramMenuButton
								isActive={pathType === "Rounded"}
								onClick={() => handlePathTypeChange("Rounded")}
							>
								<RoundedPathIcon title="Rounded path" />
							</DiagramMenuButton>
							<DiagramMenuButton
								isActive={pathType === "Curve"}
								onClick={() => handlePathTypeChange("Curve")}
							>
								<CurvePathIcon title="Curve path" />
							</DiagramMenuButton>
						</LineStyleSection>

						{/* Stroke Dash Type */}
						<LineStyleSection>
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
						</LineStyleSection>
					</LineStyleMenuWrapper>
				</DiagramMenuControl>
			)}
		</DiagramMenuPositioner>
	);
};

export const LineStyleMenu = memo(LineStyleMenuComponent);
