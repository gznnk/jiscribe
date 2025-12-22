import { memo, type ReactElement } from "react";

import { StyledCircle } from "./ProcessIndicatorStyled";
import type {
	ProcessItem,
	ProcessStatus,
} from "../../../types/core/ProcessItem";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { rotatePoint } from "../../../utils/math/points/rotatePoint";

type ProcessIndicatorProps = {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number;
	processes: ProcessItem[];
};

const getStatusColor = (status: ProcessStatus): string => {
	switch (status) {
		case "processing":
			return "#06b6d4";
		case "success":
			return "#3b82f6";
		case "failed":
			return "#ef4444";
		default:
			return "transparent";
	}
};

const calculatePositions = (
	centerX: number,
	centerY: number,
	width: number,
	height: number,
	rotation: number,
	count: number,
): Array<{ x: number; y: number }> => {
	if (count === 0) return [];

	const positions: Array<{ x: number; y: number }> = [];
	const radius = 8; // Icon radius
	const padding = 6; // Padding between node and icon
	const iconSpacing = radius * 2 + 4; // Spacing between icons

	// Calculate base position (left edge of bottom side)
	const baseX = centerX - width / 2 + iconSpacing / 2;
	const baseY = centerY + height / 2 + padding + radius;
	const baseRotated = rotatePoint(
		baseX,
		baseY,
		centerX,
		centerY,
		degreesToRadians(rotation),
	);

	// Set base position for all processes
	for (let i = 0; i < count; i++) {
		positions.push(baseRotated);
	}

	return positions;
};

const ProcessIndicatorComponent = ({
	x,
	y,
	width,
	height,
	rotation,
	processes,
}: ProcessIndicatorProps): ReactElement => {
	const positions = calculatePositions(
		x,
		y,
		width,
		height,
		rotation,
		processes.length,
	);
	const iconSpacing = 16 + 4; // radius * 2 + 4
	const maxCount = Math.floor((width - iconSpacing) / iconSpacing) + 1;

	return (
		<g>
			{processes.slice(0, maxCount).map((process, index) => {
				const position = positions[index];
				if (!position) return null;

				// Calculate X coordinate offset (used for translateX)
				const translateX = index * iconSpacing;

				return (
					<StyledCircle
						key={process.id}
						cx={position.x}
						cy={position.y}
						r={8}
						statusColor={getStatusColor(process.status)}
						isProcessing={process.status === "processing"}
						isDisappearing={process.status !== "processing"}
						translateX={translateX}
					/>
				);
			})}
		</g>
	);
};

export const ProcessIndicator = memo(ProcessIndicatorComponent);
