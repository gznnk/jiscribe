import { SvgCanvas2 } from "@workspace/svg-canvas-2";
import { useEffect } from "react";
import "./App.css";

export function App() {
	useEffect(() => {
		document.title = `SvgCanvas2 Demo [${__GIT_BRANCH__}]`;
	}, []);

	return (
		<div className="app">
			<SvgCanvas2 />
		</div>
	);
}
