import { memo, useCallback, useEffect, useState } from "react";

import {
	ColorGrid,
	ColorInputRow,
	ColorPickerContainer,
	ColorSwatch,
	ColorTextInput,
} from "./ColorPickerGridStyled";
import { PRESET_COLORS } from "../../ObjectMenuConstants";

type ColorPickerGridProps = {
	/** 現在選択中の色 */
	currentColor: string;
	/** プロパティ名 (例: "fill", "stroke") */
	property: string;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/**
 * カラーピッカーグリッド。
 * プリセットカラーのスウォッチ（4×7 グリッド）と CSS カラーテキスト入力を表示する。
 * 各スウォッチは data-kind="object-menu" を持ち、ジェスチャーシステム経由でプロパティ更新を行う。
 * テキスト入力は onChange でリアルタイムプレビュー（commit: false）、
 * onBlur / Enter でコミット（commit: true）する。
 */
const ColorPickerGridComponent: React.FC<ColorPickerGridProps> = ({
	currentColor,
	property,
	onPropertyUpdate,
}) => {
	const [inputValue, setInputValue] = useState(currentColor);
	const [isValid, setIsValid] = useState(true);

	// プリセットクリックなど外部からの色変更に追従する
	useEffect(() => {
		setInputValue(currentColor);
		setIsValid(true);
	}, [currentColor]);

	const handleTextChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = e.target.value;
			setInputValue(val);
			const valid = CSS.supports("color", val);
			setIsValid(valid);
			if (valid) {
				onPropertyUpdate(property, val, false);
			}
		},
		[property, onPropertyUpdate],
	);

	const commit = useCallback(() => {
		if (isValid && inputValue !== currentColor) {
			onPropertyUpdate(property, inputValue, true);
		}
	}, [isValid, inputValue, currentColor, property, onPropertyUpdate]);

	const handleBlur = useCallback(() => {
		commit();
	}, [commit]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") commit();
		},
		[commit],
	);

	// テキスト入力の pointerdown をキャンバスのジェスチャーシステムに伝播させない
	const stopPropagation = useCallback((e: React.PointerEvent) => {
		e.stopPropagation();
	}, []);

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
			<ColorInputRow>
				<ColorTextInput
					isValid={isValid}
					value={inputValue}
					onChange={handleTextChange}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					onPointerDown={stopPropagation}
					maxLength={32}
					placeholder="CSS color"
					spellCheck={false}
				/>
			</ColorInputRow>
		</ColorPickerContainer>
	);
};

export const ColorPickerGrid = memo(ColorPickerGridComponent);
