# GitHub 公開・保護設定

公開先: `https://github.com/kyomu-movie/aka-movie`

## 一度だけ行う設定（リポジトリ所有者）

1. GitHub の **Settings → Rules → Rulesets** で、default branch を対象にした ruleset を作ります。
2. 次を必須にします。
   - Pull request を必須にする
   - 承認を 1 件以上必須にする
   - Code owner のレビューを必須にする
   - 新しいコミットが追加されたら古い承認を無効にする
   - force push と branch deletion を禁止する
3. ruleset の bypass はリポジトリ所有者だけにします。メンバーには **Write** 権限を付与し、管理者権限は付与しません。
4. メンバーを **Settings → Collaborators** から招待します。

`CODEOWNERS` により、`leran_rule/` の変更は `@kyomu-movie` のレビューなしに main へマージできません。メンバーは動画の PR を作れますが、ルール化の決定はオーナーだけが行います。

## 動画共有

各メンバーは Git LFS をインストールしてから clone します。完成 MP4 を確認して `OK` と返すと、Codex が共有用フォルダへの準備、個人ブランチへの push、ドラフト PR の作成を行います。GitHub のログインや実行許可だけは本人が承認します。

`review-request.md` には、改善点の事実や意図だけを残します。ルールの候補や承認済みルールはメンバーが編集しません。

オーナーがルールや成功事例を公開するときは、先に `npm.cmd run codex:publish-learning` で対象一覧を確認します。内容を承認したときだけ `npm.cmd run codex:publish-learning -- --confirm` を実行します。`leran_rule/candidates/` は公開対象ではありません。
