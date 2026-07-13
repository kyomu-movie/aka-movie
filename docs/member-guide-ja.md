# aka-movie メンバー向けセットアップ・利用手順書

この手順書は、初めて参加するメンバーが GitHub への参加から動画の共有プルリクエスト作成までを完了するためのものです。動画は Codex のローカル機能で作成し、OpenAI API キーや Web アプリの設定は使いません。

> [!IMPORTANT]
> このリポジトリでは、メンバーは `leran_rule/` を作成・編集・承認しません。改善点は共有動画の `review-request.md` に事実と意図だけを記録し、ルール化はオーナーが手動で行います。

## Codex に頼めること・自動ではないこと

| 作業 | 動画作成スキルだけで自動実行されるか | Codex に頼んだ場合 |
| --- | --- | --- |
| clone・初回セットアップ | いいえ | 実行できます。GitHub ログインや実行許可は本人が承認します。 |
| 個人ブランチの作成 | はい。project ID と同じ `video/<project-id>` を作成して切り替えます。 | 作成後にブランチ名を確認するだけです。 |
| 画像・構造・アニメーションの作成 | はい。ただし各確認で `OK` が必要です。 | 構図の希望は台本の次に書いて渡します。 |
| 共有用 MP4 の準備 | いいえ | `codex:share` の実行を頼めば実行できます。 |
| commit・push・PR 作成 | いいえ | 明示して頼めば実行できます。ログインと最終確認は本人が行います。 |

## 1. このプロジェクトでできること

- 日本語の台本から、図解を段階的に表示する MP4 動画を作成します。
- 作成途中の画像、構造、アニメーションを確認し、それぞれ問題なければ `OK` と返します。
- 完成した動画だけを GitHub に共有します。作業途中の画像、台本、元の出力は公開しません。

| 役割 | 担当すること | 担当しないこと |
| --- | --- | --- |
| メンバー | 動画作成、共有用 MP4 の準備、個人ブランチでの PR 作成、レビュー待ちメモの記入 | `leran_rule/` の変更、ルールの候補化・承認・昇格 |
| オーナー | メンバー招待、PR 確認、ルールの手動承認と更新 | メンバーにルール更新を委任すること |

## 2. 事前準備

次を用意してください。

1. オーナーから届く GitHub の招待を受け入れます。権限は **Write** を想定しています。
2. Windows に Git for Windows、Git LFS、Node.js の LTS 版、Codex デスクトップアプリを導入します。
3. ターミナルを開き、次のコマンドが動くことを確認します。

```powershell
git --version
git lfs version
node --version
npm --version
```

> [!NOTE]
> GitHub の ruleset 設定やメンバー招待はオーナーが行います。メンバーは設定を変更する必要はありません。

## 3. 初回セットアップ

PowerShell で次を順番に実行します。

```powershell
git lfs install
git clone https://github.com/kyomu-movie/aka-movie.git
cd aka-movie
npm.cmd install
npm.cmd run codex:install-skill
```

最後のコマンドが完了したら、Codex を完全に再起動します。再起動後、このリポジトリを Codex で開きます。

### 個人ブランチは自動で作られる

動画ごとに個人ブランチを作り、`main` には直接 push しません。

`$movie-create` は project ID を作ると同時に、同じ名前の `video/<project-id>` ブランチを作成して切り替えます。たとえば project ID が `260712_01` なら、ブランチは `video/260712_01` です。

```powershell
git branch --show-current
```

表示された名前が `video/<project-id>` なら、そのまま動画を作成します。違う名前なら作業を止め、オーナーへ共有してください。

## 4. Codex で動画を作る

Codex のチャットで、`$movie-create` を指定して台本を渡します。例:

```text
$movie-create を使って、次の台本から動画を作成してください。

台本:
（ここに台本を貼り付けます）

構図・デザインの希望:
（例: 左から右へ流れる構図。赤い矢印を使う。）
```

構図の希望がない場合は、`構図・デザインの希望` の行を削除します。動画作成は次の流れです。

```mermaid
flowchart LR
  A[台本を渡す] --> B[画像を確認]
  B -->|修正| A
  B -->|OK| C[構造・アニメーションを確認]
  C -->|修正| B
  C -->|OK| D[MP4 を描画]
  D --> E[共有用 MP4 を準備]
  E --> F[個人ブランチから PR]
  F --> G[オーナーが確認]
```

1. Codex が `export/<project-id>/` に作業フォルダを作成します。
2. **画像**が表示されたら、構図、文字、色、矢印を確認します。問題なければ明確に `OK` と返し、修正が必要なら内容を具体的に伝えます。
3. 次に **構造**（タイトル、関係線、ノード、注釈の内容と順番）を確認します。
4. 続けて **アニメーション**（表示順、動く方向、タイミング）を確認します。構造とアニメーションが問題なければ `OK` と返します。
5. 描画後に、1920×1080、30fps、無音の H.264 MP4 が作成されます。

> [!CAUTION]
> `OK` はその段階の内容を確定する合図です。迷う場合は `OK` を返さず、修正内容を伝えてください。

## 5. 共有用 MP4 を準備する

描画が完了したら、動画の project ID を指定して共有用ファイルを作ります。

この処理は描画完了後に自動では実行されません。Codex に「project ID は `<project-id>` です。共有用 MP4 を準備してください。まだ commit と push はしないでください」と頼むか、次を実行します。

```powershell
npm.cmd run codex:share -- 260712_01
```

このコマンドは、`export/260712_01/260712_01.mp4` を次の「完了動画共有フォルダ」へコピーします。

```text
shared-videos/260712_01/
├── 260712_01.mp4
├── metadata.json
└── review-request.md
```

- `export/` はローカル専用です。Git に追加しません。
- `shared-videos/` の MP4 は Git LFS で管理されます。
- `metadata.json` は共有時点のファイル情報です。通常は編集しません。

### レビュー待ちメモを書く

`shared-videos/<project-id>/review-request.md` を開き、必要な場合だけ次を記入します。

- 何を変更したか、または何に気付いたか
- なぜ将来の動画でも重要かもしれないか

ここに書くのはレビュー待ちメモであり、ルールではありません。`leran_rule/` のファイルを作成・編集・移動しないでください。

## 6. GitHub に共有する

共有用フォルダだけをコミットし、個人ブランチへ push します。

完成動画の共有は、次のコマンド1つで行えます。`shared-videos/<project-id>/` だけを commit・push し、ほかのファイルや `leran_rule/` は公開しません。

```powershell
npm.cmd run codex:push-video -- 260712_01
```

GitHub でリポジトリを開き、**Compare & pull request** を選びます。PR には次を記載します。

- 作成した動画の目的
- project ID
- `review-request.md` を確認してほしい場合は、その旨

`main` へのマージは ruleset とレビューの手順に従います。push が拒否されたときに、force push や `main` への直接 push を行わないでください。

## 7. ルールの扱い

次のフォルダはオーナー専用です。

```text
leran_rule/approved/
leran_rule/candidates/
leran_rule/successes/
```

メンバーは、動画の共有とレビュー待ちメモまでを担当します。オーナーが共有動画を確認し、必要と判断した内容だけを手動で候補または承認済みルールへ反映します。

## 8. 困ったとき

| 状況 | 確認・対処 |
| --- | --- |
| `git lfs` が見つからない | Git LFS をインストールし、PowerShell を開き直して `git lfs install` を実行します。 |
| `npm.cmd` または `node` が見つからない | Node.js の LTS 版を導入し、PowerShell を開き直します。 |
| `$movie-create` が表示されない | `npm.cmd run codex:install-skill` が成功したことを確認し、Codex を完全に再起動します。 |
| `codex:share` が MP4 を見つけられない | 動画の描画が完了していること、project ID が `260712_01` のような形式であることを確認します。 |
| push が拒否された | `main` ではなく個人ブランチにいることを確認します。force push はせず、表示されたエラーをオーナーへ共有します。 |
| ルールを変えたくなった | `leran_rule/` は編集せず、共有動画の `review-request.md` に事実と意図だけを記入します。 |

## 9. 完了チェックリスト

- [ ] GitHub の招待を受け入れ、`video/<project-id>` の自動作成を確認した
- [ ] Git LFS、Node.js、Codex を準備した
- [ ] `$movie-create` で画像・構造・アニメーションを確認し、必要な段階で `OK` を返した
- [ ] `npm.cmd run codex:share -- <project-id>` を実行した
- [ ] `npm.cmd run codex:push-video -- <project-id>` を実行した
- [ ] `review-request.md` に必要な事実と意図だけを記入した
- [ ] 個人ブランチから PR を作成した
- [ ] `leran_rule/` を変更していない

## 関連資料

- [GitHub 公開・保護設定](../GITHUB_SETUP.md) — オーナー向け
- [共有学習データの説明](../leran_rule/README.md) — ルールの扱い
