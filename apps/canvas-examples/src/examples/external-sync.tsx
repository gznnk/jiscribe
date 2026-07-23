import { Canvas, parseCanvasText } from "@workspace/canvas";
import type { CanvasDoc } from "@workspace/canvas";
import { useCallback, useRef, useState } from "react";

const initialSourceText = JSON.stringify(
	{
		version: 1,
		root: [
			{
				id: "hello",
				type: "sticky",
				x: 120,
				y: 120,
				width: 180,
				height: 120,
				text: "外から編集できる",
			},
		],
	},
	null,
	2,
);

const parseOrThrow = (sourceText: string): CanvasDoc => {
	const result = parseCanvasText(sourceText);
	if (result.kind !== "ok") {
		throw new Error(`invalid doc: ${result.kind}`);
	}
	return result.doc;
};

/**
 * 外部同期の例: ホスト（エディタ・AI・ストレージ）が doc の正本を持ち、
 * doc の差し替えでキャンバスへ push する。逆方向は onCommit で受ける。
 * 実ホストで保存の折り返しを外部変更と誤認しないための saveNonce / syncNonce の
 * 契約は packages/canvas/docs/07-external-sync.md を参照（この例では折り返しが
 * 無いので省略している）。
 */
export function ExternalSyncExample() {
	const [pushedDoc, setPushedDoc] = useState<CanvasDoc>(() =>
		parseOrThrow(initialSourceText),
	);
	const [sourceText, setSourceText] = useState(initialSourceText);
	const [status, setStatus] = useState("初期 doc を表示中");
	const addedCountRef = useRef(0);

	// キャンバス側の編集はテキストへミラーするだけで、doc は差し替えない
	// （差し替えは「外部からの変更」を表すこの例の押し込み操作に限る）
	const handleCommit = useCallback((committedDoc: CanvasDoc) => {
		setSourceText(JSON.stringify(committedDoc, null, 2));
		setStatus("キャンバスの編集を JSON へミラーした");
	}, []);

	const handleApply = useCallback(() => {
		const result = parseCanvasText(sourceText);
		if (result.kind !== "ok") {
			setStatus(`適用失敗: ${result.kind}`);
			return;
		}
		setPushedDoc(result.doc);
		setStatus("JSON をキャンバスへ push した");
	}, [sourceText]);

	// 「外部エージェント（AI 等）による編集」を模す: JSON を機械的に書き換えて push
	const handleAgentEdit = useCallback(() => {
		const result = parseCanvasText(sourceText);
		if (result.kind !== "ok") {
			setStatus(`適用失敗: ${result.kind}`);
			return;
		}
		addedCountRef.current += 1;
		const count = addedCountRef.current;
		const agentDocResult = parseCanvasText(
			JSON.stringify({
				...result.doc,
				root: [
					...result.doc.root,
					{
						id: `agent-rect-${count}`,
						type: "rect",
						x: 150 + count * 60,
						y: 260 + count * 40,
						width: 140,
						height: 80,
						text: `agent #${count}`,
					},
				],
			}),
		);
		if (agentDocResult.kind !== "ok") {
			setStatus(`適用失敗: ${agentDocResult.kind}`);
			return;
		}
		setPushedDoc(agentDocResult.doc);
		setSourceText(JSON.stringify(agentDocResult.doc, null, 2));
		setStatus(`外部エージェントが rect を追加して push した（#${count}）`);
	}, [sourceText]);

	return (
		<div style={{ display: "flex", width: "100%", height: "100%" }}>
			<div style={{ flex: 1, minWidth: 0 }}>
				<Canvas doc={pushedDoc} onCommit={handleCommit} />
			</div>
			<div
				style={{
					flex: "0 0 320px",
					display: "flex",
					flexDirection: "column",
					gap: 8,
					padding: 12,
					boxSizing: "border-box",
					borderLeft: "1px solid #333",
					background: "#1e1e22",
					color: "#d4d4d8",
					fontSize: "0.8rem",
				}}
			>
				<span>{status}</span>
				<textarea
					value={sourceText}
					onChange={(event) => setSourceText(event.target.value)}
					spellCheck={false}
					style={{
						flex: 1,
						resize: "none",
						fontFamily: "ui-monospace, monospace",
						fontSize: "0.7rem",
						background: "#141416",
						color: "#d4d4d8",
						border: "1px solid #333",
						borderRadius: 4,
						padding: 8,
					}}
				/>
				<button
					type="button"
					onClick={handleApply}
					style={{ padding: "6px 10px", cursor: "pointer" }}
				>
					JSON をキャンバスへ push
				</button>
				<button
					type="button"
					onClick={handleAgentEdit}
					style={{ padding: "6px 10px", cursor: "pointer" }}
				>
					外部エージェントの編集を模す（rect 追加）
				</button>
			</div>
		</div>
	);
}
