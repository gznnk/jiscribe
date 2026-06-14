import type { Point } from "@workspace/geometry";

import type { CanvasControllerState } from "../../CanvasTypes";
import { updateAffectedGroupBounds } from "../../ui/utils/updateAffectedGroupBounds";
import { moveSelection } from "../../utils/moveSelection";
import type { Command } from "../CommandTypes";

/** 通常移動量（キャンバス座標 px） */
const NUDGE_STEP = 1;
/** Shift 併用時の移動量（キャンバス座標 px） */
const NUDGE_STEP_LARGE = 10;

/** 連続ナッジの集約キーの接頭辞（選択対象が変われば別操作とみなす） */
const MOVE_COALESCE_PREFIX = "move";

export type NudgeDirection = "up" | "down" | "left" | "right";

const ARROW_CODE: Record<NudgeDirection, string> = {
	up: "ArrowUp",
	down: "ArrowDown",
	left: "ArrowLeft",
	right: "ArrowRight",
};

/** 方向と移動量から単位移動ベクトルを生成する（画面座標系: 下が +y） */
const calcNudgeDelta = (direction: NudgeDirection, step: number): Point => {
	switch (direction) {
		case "up":
			return { x: 0, y: -step };
		case "down":
			return { x: 0, y: step };
		case "left":
			return { x: -step, y: 0 };
		case "right":
			return { x: step, y: 0 };
	}
};

/**
 * 矢印キーによる選択図形の移動（ナッジ）コマンドを生成するファクトリ。
 * 方向 × 通常/Shift（大きく移動）の組み合わせごとに 1 コマンドを作る。
 */
const createMoveCommand = (
	direction: NudgeDirection,
	step: number,
): Command => {
	const isLarge = step === NUDGE_STEP_LARGE;
	return {
		id: `move-${direction}${isLarge ? "-large" : ""}`,
		label: "移動",
		category: "arrange",
		shortcuts: {
			default: [{ code: ARROW_CODE[direction], shift: isLarge }],
		},
		// テキスト編集中はキャレット移動を優先するため無効化する
		canExecute: (state: CanvasControllerState) =>
			state.selectedIds.length > 0 && state.textEditState === null,
		execute: (state: CanvasControllerState) => {
			const { objects, multiSelectGroup } = moveSelection({
				selectedIds: state.selectedIds,
				srcObjects: state.objects,
				srcMultiSelectGroup: state.multiSelectGroup,
				delta: calcNudgeDelta(direction, step),
			});
			// ナッジは確定操作なので、毎回 親グループの境界も再計算してコミットする
			const moved = updateAffectedGroupBounds(
				{ ...state, objects, multiSelectGroup },
				state.selectedIds,
			);
			// 同じ選択への連続ナッジ（キーリピートを含む）を 1 つの undo にまとめる。
			// 選択 ID をキーに含めるため、対象が変われば自動的に別エントリになる。
			// pending は commit と同時にのみ立てる（履歴層が消費して null に戻す）。
			return {
				...moved,
				commitVersion: state.commitVersion + 1,
				historyCoalesce: {
					...state.historyCoalesce,
					pending: `${MOVE_COALESCE_PREFIX}:${state.selectedIds.join(",")}`,
				},
			};
		},
	};
};

const NUDGE_DIRECTIONS: NudgeDirection[] = ["up", "down", "left", "right"];

/** 上下左右 × 通常/Shift の 8 つの移動コマンド */
export const moveCommands: Command[] = NUDGE_DIRECTIONS.flatMap((direction) => [
	createMoveCommand(direction, NUDGE_STEP),
	createMoveCommand(direction, NUDGE_STEP_LARGE),
]);
