# AGENTS.md

## 言語について

基本言語は日本語とする。

## ドキュメント作成ルール（全体）

- README、設計メモ、運用手順、仕様補足などのドキュメントを作成・更新する場合は、GoogleCloudPlatform の GitHub Organization（https://github.com/GoogleCloudPlatform/knowledge-catalog）の公開リポジトリにあるドキュメント構成・説明粒度・見出し設計を参考にする。
- ドキュメント本文は、原則として OKF 記法で書く。
- OKF 記法を使う場合は、Markdown ファイルの先頭に YAML frontmatter を置き、少なくとも `type` を必須フィールドとして定義する。
- OKF の frontmatter では、必要に応じて `title`、`description`、`resource`、`tags`、`timestamp` を使い、本文は `# Overview`、`# Schema`、`# Examples`、`# Citations` などの構造化された見出しで整理する。
- 公式ドキュメント、外部 API 仕様、サービス仕様など、時間とともに変わり得る外部情報は、参照時点のスナップショットとしてドキュメントに残してよい。
- ソースコードを読めば分かる実装詳細、DB カラム定義、関数・型の説明、ルーティング一覧などは、原則としてドキュメントへ重複記載しない。ソースコードとドキュメントの差分が開く原因になるため、必要な場合はコードへの参照リンクに留める。

## GitHub レビュー対応ルール（全体）

- Codex が PR を作成する場合、PR タイトル・本文は日本語で書くこと。
- Copilot などの GitHub レビュー指摘を修正した場合は、該当スレッドに修正内容を返信すること。
- Codex から GitHub レビュースレッドへ返信する場合は、本文の先頭に `[via Codex]` を付けること。
- レビュースレッドの resolve は行わないこと。
- ユーザーから明示的に許可・依頼されていない限り、Codex は `git commit` を実行してはならない。
- ユーザーから明示的に許可・依頼されていない限り、Codex は `git push` を実行してはならない。
- レビュー修正や CI 修正の作業後も、commit / push が必要な場合は必ず事前にユーザーへ確認すること。

