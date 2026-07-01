import { Fragment, useMemo } from "react";

import {
	Backdrop,
	Body,
	CategoryTitle,
	CloseButton,
	Header,
	KeyCap,
	KeyGroup,
	Panel,
	RowLabel,
	Title,
} from "./ShortcutHelpStyled";
import { commandRegistry } from "../../../commands/CommandRegistry";
import type { Command } from "../../../commands/CommandTypes";
import {
	formatShortcutTokens,
	getPlatformShortcuts,
} from "../../../commands/CommandUtils";

/** Display order of categories */
const CATEGORY_ORDER: NonNullable<Command["category"]>[] = [
	"edit",
	"selection",
	"arrange",
	"view",
];

/** Display headings of categories */
const CATEGORY_LABELS: Record<string, string> = {
	edit: "Edit",
	selection: "Selection",
	arrange: "Arrange",
	view: "View",
};

type ShortcutEntry = {
	id: string;
	label: string;
	tokens: string[];
};

type CategoryGroup = {
	category: string;
	entries: ShortcutEntry[];
};

/**
 * Pulls shortcut-bearing commands from the commandRegistry and groups them by
 * category order.
 */
const buildGroups = (): CategoryGroup[] => {
	const allCommands = commandRegistry.getAll();

	return CATEGORY_ORDER.map((category) => {
		const entries: ShortcutEntry[] = [];

		for (const command of allCommands) {
			if (command.category !== category || command.shortcuts === undefined) {
				continue;
			}
			// Show the first platform-specific shortcut as the representative
			const binding = getPlatformShortcuts(command.shortcuts)[0];
			if (binding === undefined) {
				continue;
			}
			entries.push({
				id: command.id,
				label: command.label,
				tokens: formatShortcutTokens(binding),
			});
		}

		return { category, entries };
	}).filter((group) => group.entries.length > 0);
};

type ShortcutHelpModalProps = {
	onClose: () => void;
};

/**
 * Modal that lists keyboard shortcuts grouped by command category.
 * Closes on backdrop click or the close button.
 */
export const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({
	onClose,
}) => {
	const groups = useMemo(() => buildGroups(), []);

	return (
		<Backdrop
			data-gesture="none"
			onPointerDown={(event) => {
				// Close only when clicking outside the panel (the backdrop)
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<Panel data-id="shortcut-help">
				<Header>
					<Title>Keyboard Shortcuts</Title>
					<CloseButton
						type="button"
						aria-label="Close"
						data-id="shortcut-help:close"
						onClick={onClose}
					>
						×
					</CloseButton>
				</Header>
				{/* native-wheel: when scrollable, natively scroll itself rather than the canvas */}
				<Body data-gesture="native-wheel">
					{groups.map((group) => (
						<Fragment key={group.category}>
							<CategoryTitle>
								{CATEGORY_LABELS[group.category] ?? group.category}
							</CategoryTitle>
							{group.entries.map((entry) => (
								<Fragment key={entry.id}>
									<RowLabel data-id={`shortcut-help:${entry.id}`}>
										{entry.label}
									</RowLabel>
									<KeyGroup>
										{entry.tokens.map((token, index) => (
											<KeyCap key={`${entry.id}-${index}`}>{token}</KeyCap>
										))}
									</KeyGroup>
								</Fragment>
							))}
						</Fragment>
					))}
				</Body>
			</Panel>
		</Backdrop>
	);
};
