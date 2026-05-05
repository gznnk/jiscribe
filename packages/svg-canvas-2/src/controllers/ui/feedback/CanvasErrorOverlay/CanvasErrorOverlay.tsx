import React, { useCallback, useState } from "react";
import type { CanvasValidationError } from "../../../../schemas/canvas/validators";
import {
	ErrorOverlayContainer,
	ErrorCard,
	ErrorHeader,
	ErrorTitle,
	ErrorMessage,
	CopyButton,
	ErrorList,
	ErrorListItem,
	ErrorPath,
	ErrorDetail,
} from "./CanvasErrorOverlayStyled";

type CanvasErrorOverlayProps = {
	error: CanvasValidationError;
};

export const CanvasErrorOverlay: React.FC<CanvasErrorOverlayProps> = ({ error }) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		const errorJson = JSON.stringify(
			error.specifics.map(err => ({
				code: "SEMANTIC_ERROR",
				path: err.path,
				message: err.message,
                id: err.id
			})),
			null,
			2
		);
		navigator.clipboard.writeText(errorJson).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [error]);

	return (
		<ErrorOverlayContainer>
			<ErrorCard>
				<ErrorHeader>
					<ErrorTitle>
						<span role="img" aria-label="Error">⚠️</span>
						キャンバスデータの読み込みエラー
					</ErrorTitle>
					<CopyButton onClick={handleCopy}>
						{copied ? "✓ Copied!" : "📋 エラーをコピー (AI用)"}
					</CopyButton>
				</ErrorHeader>

				<ErrorMessage>
					JSONデータに意味的な問題（IDの重複や無効な参照など）が見つかりました。<br/>
					エディタでファイルを直接修正するか、AIにエラーを渡して修正させてください。
				</ErrorMessage>

				<ErrorList>
					{error.specifics.map((diag, idx) => (
						<ErrorListItem key={idx}>
							<ErrorPath>{diag.path}</ErrorPath>
							<ErrorDetail>{diag.message}</ErrorDetail>
						</ErrorListItem>
					))}
				</ErrorList>
			</ErrorCard>
		</ErrorOverlayContainer>
	);
};
