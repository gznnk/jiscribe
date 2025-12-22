import type React from "react";
import { memo, useEffect, useMemo, useRef, useState } from "react";

import { InputDefaultData } from "../../../constants/data/elements/InputDefaultData";
import { useClick } from "../../../hooks/useClick";
import { useDrag } from "../../../hooks/useDrag";
import { useExecutionChain } from "../../../hooks/useExecutionChain";
import { useHover } from "../../../hooks/useHover";
import { useSelect } from "../../../hooks/useSelect";
import { useText } from "../../../hooks/useText";
import type { InputProps } from "../../../types/props/elements/InputProps";
import { mergeProps } from "../../../utils/core/mergeProps";
import { isPlainTextPayload } from "../../../utils/execution/isPlainTextPayload";
import { degreesToRadians } from "../../../utils/math/common/degreesToRadians";
import { negativeToZero } from "../../../utils/math/common/negativeToZero";
import { convertStrokeDashTypeToArray } from "../../../utils/shapes/common/convertStrokeDashTypeToArray";
import { createSvgTransform } from "../../../utils/shapes/common/createSvgTransform";
import { Textable } from "../../core/Textable";
import { ConnectPoints } from "../../shapes/ConnectPoints";

/**
 * Input component - a simple text shape with textable feature only
 */
const InputComponent: React.FC<InputProps> = ({
	id,
	x,
	y,
	width,
	height,
	scaleX,
	scaleY,
	rotation,
	fill = InputDefaultData.fill,
	stroke = InputDefaultData.stroke,
	strokeWidth = InputDefaultData.strokeWidth,
	strokeDashType = InputDefaultData.strokeDashType,
	cornerRadius = InputDefaultData.cornerRadius,
	text,
	textType,
	fontColor = InputDefaultData.fontColor,
	fontSize = InputDefaultData.fontSize,
	fontFamily = InputDefaultData.fontFamily,
	fontWeight = InputDefaultData.fontWeight,
	textAlign = InputDefaultData.textAlign,
	verticalAlign = InputDefaultData.verticalAlign,
	isTextEditing,
	isTextEditEnabled = true,
	isSelected,
	isAncestorSelected = false,
	isDragging = false,
	connectPoints = [],
	showConnectPoints = false,
	connectEnabled = true,
	connectType = "both",
	isTransforming = false,
	onDrag,
	onDragOver,
	onDragLeave,
	onClick,
	onSelect,
	onConnect,
	onPreviewConnectLine,
	onTextChange,
	onHoverChange,
}) => {
	// Internal text state
	const [internalText, setInternalText] = useState(text);

	// Sync internal state with props when text prop changes
	useEffect(() => {
		setInternalText(text);
	}, [text]);

	// Reference to the SVG element to be transformed
	const svgRef = useRef<SVGRectElement>({} as SVGRectElement);

	// To avoid frequent handler generation, hold referenced values in useRef
	const refBusVal = {
		// Properties
		id,
		isSelected,
		isTextEditEnabled,
		onDrag,
		onTextChange,
	};
	const refBus = useRef(refBusVal);
	refBus.current = refBusVal;

	// Generate properties for text editing with coordinate transformation
	const { onDoubleClick } = useText({
		id,
		isSelected,
		isTextEditEnabled,
		onTextChange,
		attributes: {
			x,
			y,
			width,
			height,
			scaleX,
			scaleY,
			rotation,
			text,
			textType,
			fontColor,
			fontSize,
			fontFamily,
			fontWeight,
			textAlign,
			verticalAlign,
		},
	});

	// Generate properties for dragging
	const dragProps = useDrag({
		id,
		type: "Input",
		x,
		y,
		ref: svgRef,
		onDrag,
		onDragOver,
		onDragLeave,
	});

	// Generate properties for clicking
	const clickProps = useClick({
		id,
		x,
		y,
		isSelected,
		isAncestorSelected,
		ref: svgRef,
		onClick,
	});

	// Generate properties for selection
	const selectProps = useSelect({
		id,
		onSelect,
	});

	// Generate properties for hovering
	const hoverProps = useHover({
		id,
		onHoverChange,
	});

	// Handle execution chain propagation to update text
	useExecutionChain({
		id,
		onPropagation: (e) => {
			if (!isPlainTextPayload(e.payload)) return;
			const textData = e.payload.data;
			if (textData === "") return;
			setInternalText(textData);

			if (e.eventPhase === "Ended") {
				// Update the diagram state with the new text
				onTextChange?.({
					id,
					eventId: e.eventId,
					eventPhase: e.eventPhase,
					text: textData,
				});
			}
		},
	});

	// Compose props for the SVG element
	const composedProps = mergeProps(
		dragProps,
		clickProps,
		selectProps,
		hoverProps,
	);

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

	// Generate rect transform attribute
	const transform = createSvgTransform(
		scaleX,
		scaleY,
		degreesToRadians(rotation),
		x,
		y,
	);

	return (
		<>
			{/* Background rectangle for interaction and styling */}
			<rect
				id={id}
				x={-width / 2}
				y={-height / 2}
				width={negativeToZero(width)}
				height={negativeToZero(height)}
				rx={cornerRadius}
				ry={cornerRadius}
				fill={fill}
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeDasharray={convertStrokeDashTypeToArray(
					strokeDashType,
					strokeWidth,
				)}
				tabIndex={0}
				cursor="move"
				transform={transform}
				ref={svgRef}
				onDoubleClick={onDoubleClick}
				{...composedProps}
			/>
			{/* Text content */}
			{isTextEditEnabled && (
				<Textable
					x={-width / 2}
					y={-height / 2}
					width={width}
					height={height}
					transform={transform}
					text={internalText}
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
			<ConnectPoints
				ownerId={id}
				ownerFrame={ownerFrame}
				connectPoints={connectPoints}
				showConnectPoints={showConnectPoints}
				shouldRender={!isDragging && !isTransforming && !isSelected}
				connectEnabled={connectEnabled}
				connectType={connectType}
				onConnect={onConnect}
				onPreviewConnectLine={onPreviewConnectLine}
			/>
		</>
	);
};

export const Input = memo(InputComponent);
