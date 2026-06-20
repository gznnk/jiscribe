import type { CanvasDoc } from "../../../../schemas/canvas/CanvasDoc";
import type { CanvasControllerState } from "../../../CanvasTypes";
import { createInitialControllerState } from "../../../reducer/createInitialControllerState";

/**
 * commands 結合テスト用の CanvasControllerState を構築する。
 *
 * production と同じ createInitialControllerState を土台にするため初期値が prod とドリフトしない。
 * テスト固有の差分（選択・rootIds の並びなど）は overrides で渡す。
 */
export const createCommandState = (
	doc: CanvasDoc,
	overrides?: Partial<CanvasControllerState>,
): CanvasControllerState => ({
	...createInitialControllerState(doc),
	...overrides,
});
