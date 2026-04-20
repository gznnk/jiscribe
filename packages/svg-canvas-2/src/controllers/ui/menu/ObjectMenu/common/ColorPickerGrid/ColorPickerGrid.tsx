import { memo } from "react";

import {
	ColorGrid,
	ColorPickerContainer,
	ColorSwatch,
} from "./ColorPickerGridStyled";
import { PRESET_COLORS } from "../../ObjectMenuConstants";

type ColorPickerGridProps = {
	/** 現在選択中の色 */
	currentColor: string;
	/** プロパティ名 (例: "fill", "stroke") */
	property: string;
};

/**
 * カラーピッカーグリッド。
 * プリセットカラーのスウォッチを 4×7 グリッドで表示する。
 * 各スウォッチは data-kind="object-menu" を持ち、ジェスチャーシステム経由でプロパティ更新を行う。
 */
const ColorPickerGridComponent: React.FC<ColorPickerGridProps> = ({
	currentColor,
	property,
}) => {
	return (
		<ColorPickerContainer>
			<ColorGrid>
				{PRESET_COLORS.map((preset) => (
					<ColorSwatch
						key={preset.value}
						swatchColor={preset.value}
						selected={preset.value.toLowerCase() === currentColor.toLowerCase()}
						data-kind="object-menu"
						data-id={`object-menu:set:${property}:${preset.value}`}
						title={preset.name}
					/>
				))}
			</ColorGrid>
		</ColorPickerContainer>
	);
};

export const ColorPickerGrid = memo(ColorPickerGridComponent);
