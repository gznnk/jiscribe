import { ChatUI } from "@workspace/llm-chat-ui";
import { memo, useCallback, useState } from "react";

import {
	AiChatContainer,
	AiChatToggleButton,
	AiChatContent,
} from "./AiChatPanelStyled";
import { useAiChat } from "./hooks/useAiChat";

/**
 * AiChatPanel component that provides a toggleable AI chat interface for the SVG canvas.
 * This component is self-contained and manages its own state internally.
 *
 * Features include:
 * - Toggle button to show/hide the chat panel
 * - Integration with the ChatUI component from llm-chat-ui feature
 * - Integration with llm-client for AI responses
 * - Fixed position on the canvas viewport
 * - Internal state management for messages and loading state
 *
 * @returns React component
 */
const AiChatPanelComponent = () => {
	// Panel visibility state
	const [isOpen, setIsOpen] = useState(false);

	// AI chat functionality from custom hook
	const { messages, isLoading, sendMessage } = useAiChat();

	// Toggle chat panel visibility
	const handleToggle = useCallback(() => {
		setIsOpen((prev) => !prev);
	}, []);

	return (
		<AiChatContainer isOpen={isOpen}>
			<AiChatToggleButton
				isOpen={isOpen}
				onClick={handleToggle}
				title="Toggle AI Chat"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				>
					<title>AI Chat</title>
					<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
					<circle cx="9" cy="10" r="1" fill="currentColor" />
					<circle cx="12" cy="10" r="1" fill="currentColor" />
					<circle cx="15" cy="10" r="1" fill="currentColor" />
				</svg>
				{isOpen && <span>AI Chat</span>}
			</AiChatToggleButton>
			<AiChatContent isOpen={isOpen}>
				<ChatUI
					height="100%"
					width="100%"
					messages={messages}
					onSendMessage={sendMessage}
					isLoading={isLoading}
				/>
			</AiChatContent>
		</AiChatContainer>
	);
};

export const AiChatPanel = memo(AiChatPanelComponent);
