# general-shapes 追加候補メモ

会員規則: 記法（flowchart / UML 等）に属さない、実物・人・場を表す汎用ピクトグラム。
装飾系は入れない。収載済みは actor / cloud と第1群の13図形（下記）。

flowchart-shapes に既にある db・document・multiDocument・storedData・display・delay
とは重複させない（円筒や書類はそちらの領分）。

## 第1群: システム構成・コード読解で頻出（実装済み）

2026-08-02 に 13 図形すべてを追加した。見た目の検討記録は
`scratch/2026-08-02-general-shapes-group1.html`。

- **server** — 2D ラック（仕切り＋ステータスランプ）。プロセス・ホスト・ノード。
  立方体は package に譲った
- **browserWindow / terminalWindow** — 枠は共有し、タイトルバーの中身だけ変える
  （信号3つ / プロンプト）。本文がまるごと空くのでテキストは中に入る
- **folder / file** — file は右上の角折れ。flowchart の document（下辺の波）
  および card（左上の角落とし）と字形が分かれる
- **package** — アイソメ立方体。ライブラリ、npm パッケージ、デプロイ単位
- **envelope / queue** — envelope は1通のメッセージ、queue はバッファ。
  用途が近いので description で棲み分けを明示してある
- **gear** — サービス、バッチ、デーモン
- **lock / shield** — lock は保護対象、shield は境界（テキストは上半分に入る）
- **smartphone / laptop** — クライアント種別の描き分け。テキストは画面の中

## 第2群: 汎用マーカー（中優先）

- **clock** — スケジューラ、定期実行（flowchart の delay は記法図形なので棲み分け可能）
- **lightning** — イベント、トリガー
- check / warning 類 — 図形より「アイコン機能」として持つ方が筋かもしれず保留

## 第3群: 入れない（装飾系、サンプルの実務密度方針と衝突）

- star、heart、リボン / バナー
- block arrow（太矢印）のみ実務利用があり境界線上
