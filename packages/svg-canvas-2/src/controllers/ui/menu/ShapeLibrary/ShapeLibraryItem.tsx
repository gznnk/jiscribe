import { memo } from "react";

import type { ObjectType } from "../../../../schemas/objects/types/ObjectType";
import { EllipseIcon } from "../../icons/EllipseIcon";
import { RectIcon } from "../../icons/RectIcon";
import { StickyIcon } from "../../icons/StickyIcon";

type ShapeLibraryItemProps = {
	type: ObjectType;
	label: string;
	isActive?: boolean;
};

const ICON_SIZE = 20;

const getIcon = (type: ObjectType) => {
	switch (type) {
		case "rect":
			return <RectIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "ellipse":
			return <EllipseIcon width={ICON_SIZE} height={ICON_SIZE} />;
		case "sticky":
			return <StickyIcon width={ICON_SIZE} height={ICON_SIZE} />;
		default:
			return null;
	}
};

const ShapeLibraryItemComponent: React.FC<ShapeLibraryItemProps> = ({
	type,
	label,
	isActive = false,
}) => {
	return (
		<div
			data-kind="menu-item"
			data-id={`menu-item:${type}`}
			style={{
				display: "flex",
				alignItems: "center",
				gap: 8,
				padding: "6px 10px",
				cursor: isActive ? "crosshair" : "grab",
				borderRadius: 6,
				userSelect: "none",
				pointerEvents: "auto",
				backgroundColor: isActive ? "#eff6ff" : undefined,
				outline: isActive ? "1.5px solid #3b82f6" : undefined,
				color: isActive ? "#1d4ed8" : undefined,
			}}
		>
			{getIcon(type)}
			<span style={{ fontSize: 13, color: isActive ? "#1d4ed8" : "#374151" }}>
				{label}
			</span>
		</div>
	);
};

export const ShapeLibraryItem = memo(ShapeLibraryItemComponent);
