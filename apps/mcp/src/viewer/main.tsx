import React from "react";
import ReactDOM from "react-dom/client";
// The markdown shape's formula rendering needs katex's CSS
import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";
// Only the hljs-* token colours are borrowed. The theme's .hljs (background,
// default colour) does not apply, because the elements are not given that class
import "highlight.js/styles/github-dark.css";

import { App } from "./App";
import "./viewer.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
