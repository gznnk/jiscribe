import { useState } from "react";

import {
	CancelButton,
	CheckboxOption,
	FieldGrid,
	FieldLabel,
	Footer,
	Form,
	MarginInput,
	RadioGroup,
	RadioOption,
	SubmitButton,
} from "./ExportDialogStyled";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { ModalShell } from "../ModalShell";

/** Image formats offered by the export dialog. */
export type ExportImageFormat = "png" | "svg";

/**
 * What part of the drawing the export dialog exports: `"all"` is the whole
 * drawing, `"selection"` the selected objects alone — with their descendants and
 * attached connectors, as Copy takes them — framed by their extent with the
 * margin around it. Nothing else inside that extent is drawn.
 */
export type ExportScope = "all" | "selection";

/**
 * Upper bound of the margin input (world px). Keeps a typo (e.g. an extra
 * digit) from ballooning the fit-to-content output size.
 */
const MAX_EXPORT_MARGIN = 500;

/**
 * Keys the number input would accept but the margin must not contain:
 * sign characters (no negative margins) and exponent/decimal notation
 * (the margin is a plain non-negative integer).
 */
const BLOCKED_MARGIN_KEYS = ["-", "+", "e", "E", "."];

/** What the user confirmed in the export dialog. */
export type ExportSubmitValues = {
	/** What part of the drawing to export (see {@link ExportScope}) */
	scope: ExportScope;
	format: ExportImageFormat;
	/** Margin (world px) kept around the content */
	margin: number;
	/** Whether to embed the `.jis` source (re-editable file) */
	includeSource: boolean;
	/** Whether to skip the background fill (alpha-transparent image) */
	transparentBackground: boolean;
};

type ExportDialogProps = {
	/** Initial value of the margin input (the canvas-wide default margin) */
	defaultMargin: number;
	/**
	 * Whether anything is selected. When true the scope starts at "selection";
	 * otherwise it starts at "all" and "selection" is disabled.
	 */
	canExportSelection: boolean;
	onClose: () => void;
	onSubmit: (values: ExportSubmitValues) => void;
};

/**
 * Modal dialog for image export: pick the scope (whole drawing / selection),
 * the format (PNG / editable SVG), the margin kept around the content, and
 * whether to embed the source data, then confirm. Opened from the context
 * menu; closes on backdrop click, the close button, or Escape.
 */
export const ExportDialog: React.FC<ExportDialogProps> = ({
	defaultMargin,
	canExportSelection,
	onClose,
	onSubmit,
}) => {
	const messages = useCanvasMessages();
	// A right-click on a shape selects it before the menu opens, so a menu opened
	// on a shape starts at that shape; one on the background keeps the selection
	const [scope, setScope] = useState<ExportScope>(
		canExportSelection ? "selection" : "all",
	);
	const [format, setFormat] = useState<ExportImageFormat>("png");
	const [includeSource, setIncludeSource] = useState(true);
	const [transparentBackground, setTransparentBackground] = useState(false);
	// Kept as text so the field can be emptied while typing; validated below
	const [marginText, setMarginText] = useState(String(defaultMargin));

	const margin = Number(marginText);
	const isMarginValid =
		marginText.trim() !== "" && margin >= 0 && margin <= MAX_EXPORT_MARGIN;

	// Clamps every change (typing, paste, arrow keys) into 0..MAX as a whole
	// number; blocked keys never reach here, this catches the rest (paste, DnD)
	const handleMarginChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const raw = event.target.value;
		if (raw === "") {
			setMarginText("");
			return;
		}
		const parsed = Number(raw);
		if (!Number.isFinite(parsed)) {
			return;
		}
		const clamped = Math.min(
			Math.max(Math.trunc(parsed), 0),
			MAX_EXPORT_MARGIN,
		);
		setMarginText(String(clamped));
	};

	return (
		<ModalShell
			title={messages.exportDialogTitle}
			closeLabel={messages.exportDialogClose}
			onClose={onClose}
			testId="export-dialog"
			panelWidth={360}
		>
			<Form
				onSubmit={(event) => {
					event.preventDefault();
					if (isMarginValid) {
						onSubmit({
							scope,
							format,
							margin,
							includeSource,
							transparentBackground,
						});
					}
				}}
			>
				<FieldGrid>
					<FieldLabel>{messages.exportDialogScope}</FieldLabel>
					<RadioGroup role="radiogroup" aria-label={messages.exportDialogScope}>
						<RadioOption>
							<input
								type="radio"
								name="export-scope"
								value="all"
								checked={scope === "all"}
								data-testid="export-dialog:scope-all"
								onChange={() => setScope("all")}
							/>
							{messages.exportDialogScopeAll}
						</RadioOption>
						<RadioOption>
							<input
								type="radio"
								name="export-scope"
								value="selection"
								checked={scope === "selection"}
								disabled={!canExportSelection}
								data-testid="export-dialog:scope-selection"
								onChange={() => setScope("selection")}
							/>
							{messages.exportDialogScopeSelection}
						</RadioOption>
					</RadioGroup>
					<FieldLabel>{messages.exportDialogFormat}</FieldLabel>
					<RadioGroup
						role="radiogroup"
						aria-label={messages.exportDialogFormat}
					>
						<RadioOption>
							<input
								type="radio"
								name="export-format"
								value="png"
								checked={format === "png"}
								data-testid="export-dialog:format-png"
								onChange={() => setFormat("png")}
							/>
							{messages.exportDialogFormatPng}
						</RadioOption>
						<RadioOption>
							<input
								type="radio"
								name="export-format"
								value="svg"
								checked={format === "svg"}
								data-testid="export-dialog:format-svg"
								onChange={() => setFormat("svg")}
							/>
							{messages.exportDialogFormatSvg}
						</RadioOption>
					</RadioGroup>
					<FieldLabel>{messages.exportDialogMargin}</FieldLabel>
					<MarginInput
						type="number"
						min={0}
						max={MAX_EXPORT_MARGIN}
						step={1}
						value={marginText}
						aria-label={messages.exportDialogMargin}
						data-testid="export-dialog:margin"
						onChange={handleMarginChange}
						onKeyDown={(event) => {
							if (BLOCKED_MARGIN_KEYS.includes(event.key)) {
								event.preventDefault();
							}
						}}
					/>
					<CheckboxOption>
						<input
							type="checkbox"
							checked={includeSource}
							data-testid="export-dialog:include-source"
							onChange={(event) => setIncludeSource(event.target.checked)}
						/>
						{messages.exportDialogIncludeSource}
					</CheckboxOption>
					<CheckboxOption>
						<input
							type="checkbox"
							checked={transparentBackground}
							data-testid="export-dialog:transparent-background"
							onChange={(event) =>
								setTransparentBackground(event.target.checked)
							}
						/>
						{messages.exportDialogTransparentBackground}
					</CheckboxOption>
				</FieldGrid>
				<Footer>
					<CancelButton
						type="button"
						data-testid="export-dialog:cancel"
						onClick={onClose}
					>
						{messages.exportDialogCancel}
					</CancelButton>
					<SubmitButton
						type="submit"
						disabled={!isMarginValid}
						data-testid="export-dialog:submit"
					>
						{messages.exportDialogSubmit}
					</SubmitButton>
				</Footer>
			</Form>
		</ModalShell>
	);
};
