import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
	AutoButton,
	ColorGrid,
	ColorInputRow,
	ColorPickerContainer,
	ColorSwatch,
	ColorTextInput,
} from "./ColorPickerGridStyled";
import {
	AUTO_COLOR,
	isAutoColor,
} from "../../../../../../schemas/objects/utils/autoColor";
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
	// レンダー後に useEffect から最新の inputValue を参照するためのref
	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;
	// ユーザーが有効な編集をしてまだコミットしていない状態かどうか
	const pendingCommit = useRef(false);

	// currentColor がユーザーの入力と異なる場合のみ外部変更（プリセット等）として扱い入力欄をリセットする。
	// commit:false のプレビューも currentColor を更新するが、その場合は inputValue と一致するためスキップする。
	useEffect(() => {
		if (currentColor !== inputValueRef.current) {
			setInputValue(currentColor);
			setIsValid(true);
			pendingCommit.current = false;
		}
	}, [currentColor]);

	const handleTextChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const val = e.target.value;
			setInputValue(val);
			// "auto"（テーマ追従）は CSS.supports では無効判定になるため明示的に許容する。
			const valid = isAutoColor(val) || CSS.supports("color", val);
			setIsValid(valid);
			if (valid) {
				pendingCommit.current = true;
				onPropertyUpdate(property, val, false);
			}
		},
		[property, onPropertyUpdate],
	);

	const commit = useCallback(() => {
		if (isValid && pendingCommit.current) {
			onPropertyUpdate(property, inputValue, true);
			pendingCommit.current = false;
		}
	}, [isValid, inputValue, property, onPropertyUpdate]);

	const handleBlur = useCallback(() => {
		commit();
	}, [commit]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				commit();
			}
		},
		[commit],
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
			<ColorInputRow>
				<AutoButton
					type="button"
					selected={isAutoColor(currentColor)}
					data-kind="object-menu"
					data-id={`object-menu:set:${property}:${AUTO_COLOR}`}
					title="Auto (follows theme)"
				>
					Auto
				</AutoButton>
				<ColorTextInput
					isValid={isValid}
					value={inputValue}
					onChange={handleTextChange}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					data-gesture="none"
					maxLength={32}
					placeholder="CSS color"
					spellCheck={false}
				/>
			</ColorInputRow>
		</ColorPickerContainer>
	);
};

export const ColorPickerGrid = memo(ColorPickerGridComponent);
