import React from "react";
import ReactDOM from "react-dom/client";
import "@jiscribe/canvas/fonts.css";
import "katex/dist/katex.min.css";

import { ExamplesShell } from "./ExamplesShell";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<ExamplesShell />
	</React.StrictMode>,
);
