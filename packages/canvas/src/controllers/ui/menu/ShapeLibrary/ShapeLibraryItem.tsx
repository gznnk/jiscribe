import { memo } from "react";

import { ShapeLibraryButton } from "./ShapeLibraryStyled";
import type { ShapePreset } from "../../../../schemas/objects/types/ShapePreset";
import { EllipseIcon } from "../../icons/EllipseIcon";
import { MarkdownRectIcon } from "../../icons/MarkdownRectIcon";
import { PolygonIcon } from "../../icons/PolygonIcon";
import { PolylineIcon } from "../../icons/PolylineIcon";
import { RectIcon } from "../../icons/RectIcon";
import { StickyIcon } from "../../icons/StickyIcon";

type ShapeLibraryItemProps = {
	preset: ShapePreset;
	isActive?: boolean;
};

const ICON_SIZE = 24;

const getIcon = (presetId: string) => {
	switch (presetId) {
		case "rect":
			return <RectIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "rect-markdown":
			return <MarkdownRectIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "ellipse":
			return <EllipseIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "sticky":
			return <StickyIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "polyline":
			return <PolylineIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "polygon":
			return <PolygonIcon width={ICON_SIZE} height={ICON_SIZE} />;
		default:
			return null;
	}
};

const ShapeLibraryItemComponent: React.FC<ShapeLibraryItemProps> = ({
	preset,
	isActive = false,
}) => {
	return (
		<ShapeLibraryButton
			data-kind="menu-item"
			data-id={`menu-item:${preset.id}`}
			title={preset.label}
			isActive={isActive}
		>
			{getIcon(preset.id)}
		</ShapeLibraryButton>
	);
};

export const ShapeLibraryItem = memo(ShapeLibraryItemComponent);
