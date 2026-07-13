# 完了動画共有フォルダ

ここは、GitHub で共有するための**完成した動画だけ**を置くフォルダです。

- 動画を作成中の画像・構造・アニメーション・一時ファイルは `export/` に置きます。GitHub には保存しません。
- 完成後に `npm.cmd run codex:share -- <project-id>` を実行すると、`shared-videos/<project-id>/` に MP4、メタデータ、確認メモが準備されます。
- 次に `npm.cmd run codex:push-video -- <project-id>` を実行すると、この動画フォルダだけが Git LFS 管理で commit・push されます。
- メンバーは `review-request.md` に事実と意図だけを書きます。`leran_rule/` は編集しません。

オーナーは共有内容を確認した後、必要な場合だけ別途ルール化します。
