# aka-movie

日本語の台本から、確認を挟みながら図解ステップアニメーション MP4 を作成するプロジェクトです。標準運用では Codex のローカル機能を使い、OpenAI API キーや Web アプリの設定は使いません。

## メンバーの方へ

まずは [これだけやればOK 最短手順](docs/member-quickstart-ja.md) を実行してください。説明が必要な場合は、[メンバー向けセットアップ・利用手順書](docs/member-guide-ja.md) を参照してください。

- 作業途中の画像や MP4 は `export/` に保存され、Git には追加しません。
- 共有する完成 MP4 だけを `shared-videos/` に準備し、Git LFS で管理します。
- メンバーは `leran_rule/` を変更しません。改善点は動画ごとの `review-request.md` に記録し、オーナーが手動で判断します。

## オーナーの方へ

メンバーの招待、`main` の ruleset、CODEOWNERS を使った保護設定は [GitHub 公開・保護設定](GITHUB_SETUP.md) を参照してください。

## 主要フォルダ

- `reference/` — 図解のスタイル参照
- `export/` — ローカル生成物（Git 非追跡）
- `shared-videos/` — 意図して共有する MP4、メタデータ、レビュー待ちメモ
- `leran_rule/approved/` — オーナー承認済みの共有ルール
- `skill/movie-create/` — Codex で使う動画作成スキル
