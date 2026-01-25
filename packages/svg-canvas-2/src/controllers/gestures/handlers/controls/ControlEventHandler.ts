import type {
	CanvasGesture,
	GestureHandler,
} from "../../../../registry/GestureHandlerRegistryTypes";
import type { CanvasState } from "../../../../states/canvas/CanvasState";

/**
 * コントロールストラテジは、特定のコントロールタイプを処理する GestureHandler。
 * 各ストラテジは自身が処理するコントロールタイプを controlType プロパティで公開する。
 *
 * 例: TransformControlHandler (controlType: "transform-control")
 *     PathControlHandler (controlType: "path-control")
 */
export type ControlStrategy = GestureHandler & {
	readonly controlType: string;
};

/**
 * すべてのコントロールレベルイベントのメインハンドラー。
 * コントロールストラテジを Map で管理し、Control ID から適切なストラテジにルーティングする。
 *
 * 使用例:
 * ```typescript
 * const handler = new ControlEventHandler([
 *   transformControlHandler,
 *   pathControlHandler,
 * ]);
 * ```
 */
export class ControlEventHandler implements GestureHandler {
	private strategies = new Map<string, ControlStrategy>();

	/**
	 * 指定されたストラテジで新しい ControlEventHandler を作成する。
	 *
	 * @param strategies - 登録するコントロールストラテジハンドラーの配列
	 *
	 * 各ストラテジは以下を満たす必要がある:
	 * 1. GestureHandler インターフェースを実装
	 * 2. 自身を識別するための controlType プロパティを持つ
	 */
	constructor(strategies: ControlStrategy[]) {
		// すべてのストラテジを登録
		for (const strategy of strategies) {
			this.strategies.set(strategy.controlType, strategy);
		}
	}

	supports(gesture: CanvasGesture): boolean {
		return gesture.targetKind === "control";
	}

	handle(state: CanvasState, gesture: CanvasGesture): CanvasState {
		// 各ストラテジを試して、最初に supports() が true を返したものを使用
		for (const strategy of this.strategies.values()) {
			if (strategy.supports(gesture)) {
				return strategy.handle(state, gesture);
			}
		}

		// どのストラテジも対応しない場合は状態をそのまま返す
		return state;
	}
}
