import { Canvas } from "@workspace/canvas";
import type { CanvasDoc } from "@workspace/canvas";
import { useEffect } from "react";
import "./App.css";

const initialDoc: CanvasDoc = {
	version: 1,
	root: [],
	connectors: [],
};

export function App() {
	useEffect(() => {
		document.title = `Canvas Demo [${__GIT_BRANCH__}]`;
	}, []);

	return (
		<div className="app">
			<Canvas canvasDoc={initialDoc} />
		</div>
	);
}
