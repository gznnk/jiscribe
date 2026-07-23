import { memo } from "react";

import { StencilLibraryButton } from "./StencilLibraryStyled";
import { useCanvasLocale } from "../../../messages/CanvasLocaleContext";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { resolveLocalizedLabel } from "../../../messages/resolveLocaleMessages";
import type { StencilPreset } from "../../objects/StencilPreset";

type StencilLibraryItemProps = {
	preset: StencilPreset;
	isActive?: boolean;
};

const ICON_SIZE = 24;

const StencilLibraryItemComponent: React.FC<StencilLibraryItemProps> = ({
	preset,
	isActive = false,
}) => {
	const messages = useCanvasMessages();
	const locale = useCanvasLocale();
	const Icon = preset.icon;
	return (
		<StencilLibraryButton
			data-kind="menu"
			data-id="stencil-library"
			data-part={`item:${preset.id}`}
			title={
				messages.stencilPresetLabels[preset.id] ??
				resolveLocalizedLabel(preset.label, locale)
			}
			isActive={isActive}
		>
			{Icon ? <Icon width={ICON_SIZE} height={ICON_SIZE} /> : null}
		</StencilLibraryButton>
	);
};

export const StencilLibraryItem = memo(StencilLibraryItemComponent);
