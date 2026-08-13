import { Canvas } from "@jiscribe/canvas";
import type { CanvasDoc } from "@jiscribe/canvas";
import { createCanvasParser } from "@jiscribe/canvas/doc";
import { useCallback, useRef, useState } from "react";

// This example ships no plugin, so the default parser (every built-in type) is enough.
const canvasParser = createCanvasParser();

const initialSourceText = JSON.stringify(
	{
		version: 1,
		root: [
			{
				id: "hello",
				// Use a core shape (sticky now ships from a plugin, and this example
				// should not drag plugin wiring into an external-sync demo).
				type: "rect",
				x: 120,
				y: 120,
				width: 180,
				height: 120,
				text: "Editable from outside",
			},
		],
	},
	null,
	2,
);

const parseOrThrow = (sourceText: string): CanvasDoc => {
	const result = canvasParser.parse(sourceText);
	if (result.kind !== "ok") {
		throw new Error(`invalid doc: ${result.kind}`);
	}
	return result.doc;
};

/**
 * External sync example: the host (an editor, an AI, storage) owns the canonical doc
 * and pushes it to the canvas by replacing the doc. The other direction arrives via
 * onCommit.
 * For the saveNonce / syncNonce contract that keeps a real host from mistaking its own
 * save echo for an external change, see packages/canvas/docs/07-external-sync.md (this
 * example has no echo, so it leaves them out).
 */
export function ExternalSyncExample() {
	const [pushedDoc, setPushedDoc] = useState<CanvasDoc>(() =>
		parseOrThrow(initialSourceText),
	);
	const [sourceText, setSourceText] = useState(initialSourceText);
	const [status, setStatus] = useState("Showing the initial doc");
	const addedCountRef = useRef(0);

	// Edits made on the canvas are only mirrored into the text; the doc is not replaced
	// (replacement is reserved for this example's push action, which stands for an
	// external change)
	const handleCommit = useCallback((committedDoc: CanvasDoc) => {
		setSourceText(JSON.stringify(committedDoc, null, 2));
		setStatus("Mirrored the canvas edit into JSON");
	}, []);

	const handleApply = useCallback(() => {
		const result = canvasParser.parse(sourceText);
		if (result.kind !== "ok") {
			setStatus(`Failed to apply: ${result.kind}`);
			return;
		}
		setPushedDoc(result.doc);
		setStatus("Pushed the JSON to the canvas");
	}, [sourceText]);

	// Simulate "an edit by an external agent (an AI, say)": rewrite the JSON mechanically and push
	const handleAgentEdit = useCallback(() => {
		const result = canvasParser.parse(sourceText);
		if (result.kind !== "ok") {
			setStatus(`Failed to apply: ${result.kind}`);
			return;
		}
		addedCountRef.current += 1;
		const count = addedCountRef.current;
		const agentDocResult = canvasParser.parse(
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
			setStatus(`Failed to apply: ${agentDocResult.kind}`);
			return;
		}
		setPushedDoc(agentDocResult.doc);
		setSourceText(JSON.stringify(agentDocResult.doc, null, 2));
		setStatus(`An external agent added a rect and pushed it (#${count})`);
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
					Push the JSON to the canvas
				</button>
				<button
					type="button"
					onClick={handleAgentEdit}
					style={{ padding: "6px 10px", cursor: "pointer" }}
				>
					Simulate an external agent edit (add a rect)
				</button>
			</div>
		</div>
	);
}
