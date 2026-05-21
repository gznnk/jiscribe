import { memo, useCallback, useEffect, useRef } from "react";

import {
	ColorGrid,
	ColorPickerContainer,
	ColorSwatch,
	NativeColorInput,
	NativeColorPickerButton,
	NativeColorPickerRow,
	NativeColorPreview,
} from "./ColorPickerGridStyled";
import { PRESET_COLORS } from "../../ObjectMenuConstants";

type ColorPickerGridProps = {
	/** 現在選択中の色 */
	currentColor: string;
	/** プロパティ名 (例: "fill", "stroke") */
	property: string;
	onPropertyUpdate: (property: string, value: string, commit: boolean) => void;
};

/** CSS カラー文字列を input[type="color"] が受け付ける #rrggbb 形式に変換する */
const toHexColorValue = (color: string): string => {
	if (/^#[0-9a-fA-F]{6}$/.test(color)) return color.toLowerCase();
	if (/^#[0-9a-fA-F]{3}$/.test(color)) {
		const r = color[1], g = color[2], b = color[3];
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}
	return "#000000";
};

/**
 * カラーピッカーグリッド。
 * プリセットカラーのスウォッチ（4×7 グリッド）と、ブラウザ標準カラーピッカーを表示する。
 * 各スウォッチは data-kind="object-menu" を持ち、ジェスチャーシステム経由でプロパティ更新を行う。
 * カスタムカラーボタンはブラウザ標準の color picker を開き、onChange でリアルタイムプレビュー、
 * ネイティブ change イベント（picker 確定時）でコミットする。
 */
const ColorPickerGridComponent: React.FC<ColorPickerGridProps> = ({
	currentColor,
	property,
	onPropertyUpdate,
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleNativeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onPropertyUpdate(property, e.target.value, false);
		},
		[property, onPropertyUpdate],
	);

	// ネイティブ change イベント（picker を閉じた/確定したときのみ発火）でコミット
	useEffect(() => {
		const input = inputRef.current;
		if (!input) return;
		const handleCommit = () => {
			onPropertyUpdate(property, input.value, true);
		};
		input.addEventListener("change", handleCommit);
		return () => input.removeEventListener("change", handleCommit);
	}, [property, onPropertyUpdate]);

	const handleButtonClick = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const stopPropagation = useCallback((e: React.PointerEvent) => {
		e.stopPropagation();
	}, []);

	const hexValue = toHexColorValue(currentColor);
	const isCustomColor = !PRESET_COLORS.some(
		(p) => p.value.toLowerCase() === currentColor.toLowerCase(),
	);

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
			<NativeColorPickerRow>
				<NativeColorPickerButton
					type="button"
					isCustom={isCustomColor}
					onClick={handleButtonClick}
					onPointerDown={stopPropagation}
					title="カスタムカラーを選択"
				>
					<NativeColorPreview previewColor={hexValue} />
					{isCustomColor ? `Custom ${hexValue}` : "Custom..."}
				</NativeColorPickerButton>
				<NativeColorInput
					ref={inputRef}
					type="color"
					value={hexValue}
					onChange={handleNativeChange}
				/>
			</NativeColorPickerRow>
		</ColorPickerContainer>
	);
};

export const ColorPickerGrid = memo(ColorPickerGridComponent);
