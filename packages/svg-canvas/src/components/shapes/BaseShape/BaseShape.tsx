import type React from "react";
import { memo, useMemo } from "react";

import type { BaseShapeProps } from "../../../types/props/shapes/BaseShapeProps";
import { Textable } from "../../core/Textable";
import { ConnectPoints } from "../ConnectPoints";

/**
 * BaseShape component that wraps common interactive functionality
 * Provides Textable and ConnectPoints
 */
const BaseShapeComponent: React.FC<BaseShapeProps> = ({
	id,
	x,
	y,
	width,
	height,
	rotation,
	scaleX,
	scaleY,
	isSelected,
	connectPoints,
	showConnectPoints = false,
	connectEnabled = true,
	text,
	textType,
	fontColor,
	fontSize,
	fontFamily,
	fontWeight,
	textAlign,
	verticalAlign,
	isTextEditing,
	isTextEditEnabled = true,
	isDragging = false,
	isTransforming = false,
	transform,
	onConnect,
	onPreviewConnectLine,
	children,
}: BaseShapeProps) => {
	// Suppress ConnectPoint re-rendering by memoization
	// If separated by key and passed as individual props, each ConnectPoint side
	// performs comparison processing for each key which is inefficient, so detect Shape differences collectively here
	const ownerFrame = useMemo(
		() => ({
			x,
			y,
			width,
			height,
			rotation,
			scaleX,
			scaleY,
		}),
		[x, y, width, height, rotation, scaleX, scaleY],
	);

	return (
		<>
			{children}
			{isTextEditEnabled && (
				<Textable
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					transform={transform}
					text={text}
					textType={textType}
					fontColor={fontColor}
					fontSize={fontSize}
					fontFamily={fontFamily}
					fontWeight={fontWeight}
					textAlign={textAlign}
					verticalAlign={verticalAlign}
					isTextEditing={isTextEditing}
				/>
			)}
			{connectPoints && (
				<ConnectPoints
					ownerId={id}
					ownerFrame={ownerFrame}
					connectPoints={connectPoints}
					showConnectPoints={showConnectPoints}
					shouldRender={!isDragging && !isTransforming && !isSelected}
					connectEnabled={connectEnabled}
					onConnect={onConnect}
					onPreviewConnectLine={onPreviewConnectLine}
				/>
			)}
		</>
	);
};

export const BaseShape = memo(BaseShapeComponent);
