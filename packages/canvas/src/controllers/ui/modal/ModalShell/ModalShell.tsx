import { useEffect } from "react";

import {
	Backdrop,
	CloseButton,
	Header,
	Panel,
	Title,
} from "./ModalShellStyled";

type ModalShellProps = {
	title: string;
	/** aria-label of the close (×) button */
	closeLabel: string;
	onClose: () => void;
	/** data-testid of the panel; the close button gets `${testId}:close` */
	testId: string;
	/** Panel width in px (capped at the canvas width) */
	panelWidth: number;
	/** Fixed panel height in px; omit to follow the content */
	panelHeight?: number;
	children: React.ReactNode;
};

/**
 * Shared modal shell: backdrop (click to close), header with title and close
 * button, and Escape-to-close. The body is passed as children.
 */
export const ModalShell: React.FC<ModalShellProps> = ({
	title,
	closeLabel,
	onClose,
	testId,
	panelWidth,
	panelHeight,
	children,
}) => {
	useEffect(() => {
		// capture 段で登録する: モーダルは Canvas コンテナ内にあり、bubble 段
		// では useKeyboardShortcuts が先に Escape を DeselectAllCommand として
		// 消費してしまう（stopPropagation され document まで届かない）。
		// stopPropagation で選択解除も抑止する（Escape はモーダルを閉じるだけ）。
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				event.stopPropagation();
				onClose();
			}
		};
		document.addEventListener("keydown", handleKeyDown, true);
		return () => document.removeEventListener("keydown", handleKeyDown, true);
	}, [onClose]);

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
			<Panel
				data-testid={testId}
				panelWidth={panelWidth}
				panelHeight={panelHeight}
			>
				<Header>
					<Title>{title}</Title>
					<CloseButton
						type="button"
						aria-label={closeLabel}
						data-testid={`${testId}:close`}
						onClick={onClose}
					>
						×
					</CloseButton>
				</Header>
				{children}
			</Panel>
		</Backdrop>
	);
};
