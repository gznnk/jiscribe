import React, { useCallback, useState } from "react";

import {
	CopyButton,
	ErrorCard,
	ErrorDetail,
	ErrorHeader,
	ErrorList,
	ErrorListItem,
	ErrorMessage,
	ErrorPath,
	ErrorScreenContainer,
	ErrorTitle,
} from "./CanvasErrorScreenStyled";
import type { SemanticDiagnostic } from "../../../../schemas/canvas/validators";

type CanvasErrorScreenProps = {
	diagnostics: SemanticDiagnostic[];
};

export const CanvasErrorScreen: React.FC<CanvasErrorScreenProps> = ({
	diagnostics,
}) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		const errorJson = JSON.stringify(
			diagnostics.map((d) => ({
				code: "VALIDATION_ERROR",
				path: d.path,
				message: d.message,
				id: d.id,
			})),
			null,
			2,
		);
		navigator.clipboard.writeText(errorJson).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [diagnostics]);

	return (
		<ErrorScreenContainer>
			<ErrorCard>
				<ErrorHeader>
					<ErrorTitle>
						<span role="img" aria-label="Error">
							⚠️
						</span>
						キャンバスデータの読み込みエラー
					</ErrorTitle>
					<CopyButton onClick={handleCopy}>
						{copied ? "✓ Copied!" : "📋 エラーをコピー (AI用)"}
					</CopyButton>
				</ErrorHeader>

				<ErrorMessage>
					JSONデータに問題が見つかりました。
					<br />
					エディタでファイルを直接修正するか、AIにエラーを渡して修正させてください。
				</ErrorMessage>

				<ErrorList>
					{diagnostics.map((diag, idx) => (
						<ErrorListItem key={idx}>
							<ErrorPath>{diag.path || "/"}</ErrorPath>
							<ErrorDetail>{diag.message}</ErrorDetail>
						</ErrorListItem>
					))}
				</ErrorList>
			</ErrorCard>
		</ErrorScreenContainer>
	);
};
