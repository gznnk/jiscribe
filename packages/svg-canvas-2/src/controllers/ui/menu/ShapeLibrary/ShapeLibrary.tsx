import { memo } from "react";

import { ShapeLibraryItem } from "./ShapeLibraryItem";
import { ShapeLibraryContainer } from "./ShapeLibraryStyled";
import { SHAPE_PRESETS } from "./ShapePresets";

type ShapeLibraryProps = {
	activePresetId: string | null;
};

const ShapeLibraryComponent: React.FC<ShapeLibraryProps> = ({
	activePresetId,
}) => {
	return (
		<ShapeLibraryContainer>
			{SHAPE_PRESETS.map((preset) => (
				<ShapeLibraryItem
					key={preset.id}
					preset={preset}
					isActive={activePresetId === preset.id}
				/>
			))}
		</ShapeLibraryContainer>
	);
};

export const ShapeLibrary = memo(ShapeLibraryComponent);
