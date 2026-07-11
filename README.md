# Script Motion Studio

## GitHub 共有運用

- 生成物のうち共有する MP4 は `npm.cmd run codex:share -- <project-id>` で `shared-videos/` に準備し、Git LFS でプッシュします。
- メンバーは `leran_rule/` を編集せず、動画ごとの `review-request.md` に事実と意図だけを残します。
- ルールの候補化・承認・main への反映は、リポジトリ所有者が手動で行います。

公開後に必要な GitHub の権限・保護設定は [GITHUB_SETUP.md](GITHUB_SETUP.md) を参照してください。

台本から図解を生成し、確認・修正を経て1920×1080の無音ステップアニメーションmp4を書き出します。標準運用は、APIを使わないCodexローカル＋GitHub共有です。

## 推奨: Codexローカル＋GitHub共有

1. このフォルダをプライベートGitHubリポジトリとしてメンバー全員が取得します。
2. 各PCで `npm.cmd run codex:install-skill` を実行し、Codexを再起動します。
3. Codexでこのリポジトリを開き、`$movie-create` と台本を送ります。
4. 修正は `leran_rule/candidates/`、承認済みの共有ルールは `leran_rule/approved/` に保存します。
5. 共有する変更だけを確認してGitHubへコミットします。動画・生成画像は `export/` に残り、Gitへは追加しません。

Codexの画像生成機能が使えない場合だけ、図解画像をチャットに添付または指定場所へ保存してから、構造化・動画書き出しを続けます。

## API版Webアプリ（任意）

1. `.env.example` を `.env.local` にコピーし、`OPENAI_API_KEY` を設定します。
2. `npm.cmd run dev` を実行します。
3. ブラウザで `http://localhost:3000` を開きます。

## API版の操作

1. 台本を入力して「図解画像を生成」を押します。
2. 図解が良ければチャットに `OK` と入力し、修正したい場合は修正指示を入力します。
3. 構造とアニメーションを確認し、必要なら表示順・動き・秒数を編集します。
4. `OK — mp4を書き出す` を押します。完成動画は保存または成功例として登録できます。

## フォルダ

- `reference/`: 生成時に毎回4×4のスタイルシートとして利用する参考画像。現在の16枚をそのまま使えます。
- `export/yymmdd_xx/`: mp4と構造JSON、生成画像を案件単位で出力します。
- `skill/<name>/SKILL.md`: 任意の生成・構造・動画演出指示を追加できます。`skill/style-base/SKILL.md` は基本ルールです。
- `leran_rule/`: 修正から作るルールと成功例のメタデータです。表記は要件に合わせています。
- `data/workflows.db`: ローカル案件履歴用SQLiteデータベースです。

## 共同学習

共有ルールの運用方法は [leran_rule/README.md](leran_rule/README.md) を参照してください。全員が最新のGitHub状態を取得してからCodexを使うことで、承認済みの学習内容が全員へ反映されます。
