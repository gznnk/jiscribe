import { Fragment, useMemo } from "react";

import {
	Body,
	CategoryTitle,
	KeyCap,
	KeyGroup,
	RowLabel,
} from "./ShortcutHelpStyled";
import type { CommandRegistry } from "../../../commands/CommandRegistry";
import type { Command } from "../../../commands/CommandTypes";
import {
	formatShortcutTokens,
	getPlatformShortcuts,
} from "../../../commands/CommandUtils";
import {
	getCommandLabel,
	type CanvasMessages,
	type CanvasMessageStrings,
} from "../../../messages/CanvasMessages";
import { useCanvasMessages } from "../../../messages/CanvasMessagesContext";
import { useCanvasRegistries } from "../../../setup/CanvasRegistriesContext";
import { ModalShell } from "../ModalShell";

/** Display order of categories */
const CATEGORY_ORDER: NonNullable<Command["category"]>[] = [
	"edit",
	"selection",
	"arrange",
	"view",
];

/** Message key of each category heading */
const CATEGORY_MESSAGE_KEYS: Record<string, keyof CanvasMessageStrings> = {
	edit: "shortcutHelpCategoryEdit",
	selection: "shortcutHelpCategorySelection",
	arrange: "shortcutHelpCategoryArrange",
	view: "shortcutHelpCategoryView",
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
const buildGroups = (
	messages: CanvasMessages,
	commandRegistry: CommandRegistry,
): CategoryGroup[] => {
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
				label: getCommandLabel(messages, command),
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
	const messages = useCanvasMessages();
	const { command: commandRegistry } = useCanvasRegistries();
	const groups = useMemo(
		() => buildGroups(messages, commandRegistry),
		[messages, commandRegistry],
	);

	return (
		<ModalShell
			title={messages.shortcutHelpTitle}
			closeLabel={messages.shortcutHelpClose}
			onClose={onClose}
			testId="shortcut-help"
			panelWidth={400}
			// Fix the height so the size does not change with the number of rows
			panelHeight={560}
		>
			{/* native-wheel: when scrollable, natively scroll itself rather than the canvas */}
			<Body data-gesture="native-wheel">
				{groups.map((group) => (
					<Fragment key={group.category}>
						<CategoryTitle>
							{CATEGORY_MESSAGE_KEYS[group.category]
								? messages[CATEGORY_MESSAGE_KEYS[group.category]]
								: group.category}
						</CategoryTitle>
						{group.entries.map((entry) => (
							<Fragment key={entry.id}>
								<RowLabel data-testid={`shortcut-help:${entry.id}`}>
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
		</ModalShell>
	);
};
