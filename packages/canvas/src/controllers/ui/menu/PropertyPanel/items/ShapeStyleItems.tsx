import { SHAPE_STYLE_FALLBACK } from "@jiscribe/doc/model/objects/utils/shapeStyleFallback";
import { memo } from "react";

import type { BuiltinItemProps } from "./BuiltinItemProps";
import { setPart } from "../../../../gestures/handlers/menu/utils/menuParts";
import { useCanvasMessages } from "../../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../../registries/CanvasRegistriesContext";
import { getEffectiveSelectedIds } from "../../../../utils/getEffectiveSelectedIds";
import { DashedLineIcon } from "../../../icons/DashedLineIcon";
import { DottedLineIcon } from "../../../icons/DottedLineIcon";
import { SolidLineIcon } from "../../../icons/SolidLineIcon";
import { PropertyColorField } from "../common/PropertyColorField";
import { PropertyNumberField } from "../common/PropertyNumberField";
import { PropertyRow } from "../common/PropertyRow";
import { PropertySegmentedControl } from "../common/PropertySegmentedControl";
import {
	MAX_OPACITY_PERCENT,
	MIN_OPACITY_PERCENT,
	toOpacityPercent,
	toOpacityValue,
} from "../utils/opacityPercent";
import {
	DEFAULT_CORNER_RADIUS,
	readSelectionCornerRadius,
} from "../utils/readSelectionCornerRadius";
import { readSelectionShapeStyle } from "../utils/readSelectionShapeStyle";
import {
	isMixedSelectionValue,
	selectionValueOr,
} from "../utils/SelectionValue";

const MIN_STROKE_WIDTH = 0;
const MAX_STROKE_WIDTH = 100;

/** The dash an unset stroke is drawn with, and so the one the row lights. */
const DEFAULT_STROKE_DASH_TYPE = "solid";

const MIN_CORNER_RADIUS = 0;
const MAX_CORNER_RADIUS = 999;

/** The face of the selected shape. */
const FillItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const { objectShapeStyleDefaults } = useCanvasRegistries();
	const { fill } = readSelectionShapeStyle(
		canvasState.selectedIds,
		canvasState.objects,
		objectShapeStyleDefaults,
		"fill",
	);

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<PropertyColorField
				value={selectionValueOr(fill, SHAPE_STYLE_FALLBACK.fill)}
				isMixed={isMixedSelectionValue(fill)}
				property="fill"
				role="surface"
				title={messages.menuBackgroundColor}
				onPropertyUpdate={onPropertyUpdate}
			/>
		</PropertyRow>
	);
};

export const FillItem = memo(FillItemComponent);

/** How opaque the face is drawn, stated in percent over the document's 0..1. */
const FillOpacityItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const { objectShapeStyleDefaults } = useCanvasRegistries();
	const { fillOpacity } = readSelectionShapeStyle(
		canvasState.selectedIds,
		canvasState.objects,
		objectShapeStyleDefaults,
		"fill",
	);

	return (
		<PropertyRow label={messages.propertyPanelRowOpacity}>
			<PropertyNumberField
				value={toOpacityPercent(
					selectionValueOr(fillOpacity, SHAPE_STYLE_FALLBACK.fillOpacity),
				)}
				isMixed={isMixedSelectionValue(fillOpacity)}
				min={MIN_OPACITY_PERCENT}
				max={MAX_OPACITY_PERCENT}
				unit="%"
				ariaLabel={messages.menuFillOpacity}
				testId="property-field:fillOpacity"
				onUpdate={(percent, commit, coalesceHistory) =>
					onPropertyUpdate(
						"fillOpacity",
						String(toOpacityValue(percent)),
						commit,
						coalesceHistory,
					)
				}
			/>
		</PropertyRow>
	);
};

export const FillOpacityItem = memo(FillOpacityItemComponent);

/** The stroke of the selected shape, or of the selected connector. */
const StrokeColorItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const { objectShapeStyleDefaults } = useCanvasRegistries();
	const { stroke } = readSelectionShapeStyle(
		getEffectiveSelectedIds(canvasState),
		canvasState.objects,
		objectShapeStyleDefaults,
		"stroke",
	);

	return (
		<PropertyRow label={messages.propertyPanelRowColor}>
			<PropertyColorField
				value={selectionValueOr(stroke, SHAPE_STYLE_FALLBACK.stroke)}
				isMixed={isMixedSelectionValue(stroke)}
				property="stroke"
				role="ink"
				title={messages.menuStrokeColor}
				onPropertyUpdate={onPropertyUpdate}
			/>
		</PropertyRow>
	);
};

export const StrokeColorItem = memo(StrokeColorItemComponent);

/** How thick the stroke is drawn. 0 draws none. */
const StrokeWidthItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const { objectShapeStyleDefaults } = useCanvasRegistries();
	const { strokeWidth } = readSelectionShapeStyle(
		getEffectiveSelectedIds(canvasState),
		canvasState.objects,
		objectShapeStyleDefaults,
		"stroke",
	);

	return (
		<PropertyRow label={messages.propertyPanelRowWidth}>
			<PropertyNumberField
				value={selectionValueOr(strokeWidth, SHAPE_STYLE_FALLBACK.strokeWidth)}
				isMixed={isMixedSelectionValue(strokeWidth)}
				min={MIN_STROKE_WIDTH}
				max={MAX_STROKE_WIDTH}
				ariaLabel={messages.menuBorderWidth}
				testId="property-field:strokeWidth"
				onUpdate={(value, commit, coalesceHistory) =>
					onPropertyUpdate(
						"strokeWidth",
						String(value),
						commit,
						coalesceHistory,
					)
				}
			/>
		</PropertyRow>
	);
};

export const StrokeWidthItem = memo(StrokeWidthItemComponent);

/** Solid, dashed or dotted. An unset value draws solid, so that is what reads active. */
const StrokeDashTypeItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
}) => {
	const messages = useCanvasMessages();
	const { objectShapeStyleDefaults } = useCanvasRegistries();
	const { strokeDashType } = readSelectionShapeStyle(
		getEffectiveSelectedIds(canvasState),
		canvasState.objects,
		objectShapeStyleDefaults,
		"stroke",
	);
	const dashType = selectionValueOr(strokeDashType, DEFAULT_STROKE_DASH_TYPE);

	return (
		<PropertyRow label={messages.propertyPanelRowType}>
			<PropertySegmentedControl
				isMixed={isMixedSelectionValue(strokeDashType)}
				options={[
					{
						id: "solid",
						part: setPart("strokeDashType", "solid"),
						title: messages.menuSolidLine,
						content: <SolidLineIcon title={messages.menuSolidLine} />,
						isActive: dashType === "solid",
					},
					{
						id: "dashed",
						part: setPart("strokeDashType", "dashed"),
						title: messages.menuDashedLine,
						content: <DashedLineIcon title={messages.menuDashedLine} />,
						isActive: dashType === "dashed",
					},
					{
						id: "dotted",
						part: setPart("strokeDashType", "dotted"),
						title: messages.menuDottedLine,
						content: <DottedLineIcon title={messages.menuDottedLine} />,
						isActive: dashType === "dotted",
					},
				]}
			/>
		</PropertyRow>
	);
};

export const StrokeDashTypeItem = memo(StrokeDashTypeItemComponent);

/** How opaque the stroke is drawn, stated in percent over the document's 0..1. */
const StrokeOpacityItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const { objectShapeStyleDefaults } = useCanvasRegistries();
	const { strokeOpacity } = readSelectionShapeStyle(
		getEffectiveSelectedIds(canvasState),
		canvasState.objects,
		objectShapeStyleDefaults,
		"stroke",
	);

	return (
		<PropertyRow label={messages.propertyPanelRowOpacity}>
			<PropertyNumberField
				value={toOpacityPercent(
					selectionValueOr(strokeOpacity, SHAPE_STYLE_FALLBACK.strokeOpacity),
				)}
				isMixed={isMixedSelectionValue(strokeOpacity)}
				min={MIN_OPACITY_PERCENT}
				max={MAX_OPACITY_PERCENT}
				unit="%"
				ariaLabel={messages.menuBorderOpacity}
				testId="property-field:strokeOpacity"
				onUpdate={(percent, commit, coalesceHistory) =>
					onPropertyUpdate(
						"strokeOpacity",
						String(toOpacityValue(percent)),
						commit,
						coalesceHistory,
					)
				}
			/>
		</PropertyRow>
	);
};

export const StrokeOpacityItem = memo(StrokeOpacityItemComponent);

/** How far the corners are rounded. */
const RadiusItemComponent: React.FC<BuiltinItemProps> = ({
	canvasState,
	onPropertyUpdate,
}) => {
	const messages = useCanvasMessages();
	const cornerRadius = readSelectionCornerRadius(
		canvasState.selectedIds,
		canvasState.objects,
	);

	return (
		<PropertyRow label={messages.propertyPanelRowRadius}>
			<PropertyNumberField
				value={selectionValueOr(cornerRadius, DEFAULT_CORNER_RADIUS)}
				isMixed={isMixedSelectionValue(cornerRadius)}
				min={MIN_CORNER_RADIUS}
				max={MAX_CORNER_RADIUS}
				ariaLabel={messages.menuCornerRadius}
				testId="property-field:rx"
				onUpdate={(value, commit, coalesceHistory) =>
					onPropertyUpdate("rx", String(value), commit, coalesceHistory)
				}
			/>
		</PropertyRow>
	);
};

export const RadiusItem = memo(RadiusItemComponent);
