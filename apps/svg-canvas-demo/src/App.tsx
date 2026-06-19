import { Canvas } from "@workspace/svg-canvas-2";
import type { CanvasDoc } from "@workspace/svg-canvas-2";
import { useEffect } from "react";
import "./App.css";

const initialDoc: CanvasDoc = {
	version: 1,
	root: [],
	connectors: [],
};

export function App() {
	useEffect(() => {
		document.title = `svg-canvas-2 Demo [${__GIT_BRANCH__}]`;
	}, []);

	return (
		<div className="app">
			<Canvas canvasDoc={initialDoc} />
		</div>
	);
}
