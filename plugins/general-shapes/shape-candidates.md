# general-shapes 追加候補メモ

会員規則: 記法（flowchart / UML 等）に属さない、実物・人・場を表す汎用ピクトグラム。
装飾系は入れない。既存図形は cloud / actor。

flowchart-shapes に既にある db・document・multiDocument・storedData・display・delay
とは重複させない（円筒や書類はそちらの領分）。

## 第1群: システム構成・コード読解で頻出（優先度高）

- **server** — 3D 箱 / ラック。プロセス・ホスト・ノード
- **browser-window / terminal-window** — 画面と CLI。「この UI がこのコードを叩く」の表現に効く
- **folder / file** — コードベースの構造。file は flowchart の document（角折れ）と字形を変える
- **package** — 箱・成果物。ライブラリ、npm パッケージ、デプロイ単位
- **envelope / queue** — メッセージ、ジョブキュー、イベント
- **gear** — サービス、バッチ、デーモン
- **lock / shield** — 認証、セキュリティ境界
- **device**（smartphone / laptop）— クライアント種別の描き分け

## 第2群: 汎用マーカー（中優先）

- **clock** — スケジューラ、定期実行（flowchart の delay は記法図形なので棲み分け可能）
- **lightning** — イベント、トリガー
- check / warning 類 — 図形より「アイコン機能」として持つ方が筋かもしれず保留

## 第3群: 入れない（装飾系、サンプルの実務密度方針と衝突）

- star、heart、リボン / バナー
- block arrow（太矢印）のみ実務利用があり境界線上
