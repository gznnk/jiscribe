import { memo } from "react";

import { ShapeLibraryButton } from "./ShapeLibraryStyled";
import { useCanvasLocale } from "../../../messages/CanvasLocaleContext";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { resolveLocalizedLabel } from "../../../messages/resolveLocaleMessages";
import type { ShapePreset } from "../../objects/ShapePreset";

type ShapeLibraryItemProps = {
	preset: ShapePreset;
	isActive?: boolean;
};

const ICON_SIZE = 24;

const ShapeLibraryItemComponent: React.FC<ShapeLibraryItemProps> = ({
	preset,
	isActive = false,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const Icon = preset.icon;
	return (
		<ShapeLibraryButton
			data-kind="menu"
			data-id="shape-library"
			data-part={`item:${preset.id}`}
			title={
				messages.shapePresetLabels[preset.id] ??
				resolveLocalizedLabel(preset.label, locale)
			}
			isActive={isActive}
		>
			{Icon ? <Icon width={ICON_SIZE} height={ICON_SIZE} /> : null}
		</ShapeLibraryButton>
	);
};

export const ShapeLibraryItem = memo(ShapeLibraryItemComponent);
