---
type: README
title: image-workbench
description: Gemini による画像編集向けの最小構成 Next.js UI。
timestamp: 2026-06-30
---

# Overview

`image-workbench` は、Nano Banana Pro を使った画像編集向けの最小構成 Next.js App Router UI です。

このアプリは `GEMINI_API_KEY` をサーバー側に保持します。ブラウザからのリクエストは `POST /api/image/edit` に multipart form data を送信し、そのルートが `@google/genai` を呼び出します。

# Schema

## Environment

```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_IMAGE_MODEL=gemini-3-pro-image-preview
GEMINI_IMAGE_ASPECT_RATIO=480x360
GEMINI_COMMON_PROMPT=optional_text_sent_before_every_edit_prompt
GEMINI_OUTPUT_IMAGE_EXTENSION=png
```

`GEMINI_IMAGE_MODEL` は任意です。未設定の場合は Nano Banana Pro のモデル ID である `gemini-3-pro-image-preview` を使います。Quota 回避や検証目的で別モデルを使う場合だけ、`.env.local` またはデプロイ環境で上書きします。

`GEMINI_IMAGE_ASPECT_RATIO` は任意です。未設定の場合は `480x360` と同じ `4:3` を Gemini へ送信します。アイコン向けは `square` または `1:1`、OGP 画像向けは `ogp` または `1200x630` を指定できます。寸法表記は比率へ変換して送信するため、実際の出力ピクセル数は Gemini の `image_size` に依存します。

`GEMINI_COMMON_PROMPT` は任意です。設定すると、API ルートは毎回、ブラウザから送信された編集プロンプトより前にこの値を Gemini へ送信します。共通の編集ルール、望ましいトーン、固定の出力制約、UI に毎回入力したくない共通指示に使います。この値が設定されている場合、画面の追加プロンプトは空欄のまま送信できます。

`GEMINI_OUTPUT_IMAGE_EXTENSION` は任意です。生成結果をダウンロードするときの拡張子を指定します。`jpg`、`png`、`webp` を指定できます。未設定または未対応の値の場合は `jpg` として扱います。Gemini が返した画像 MIME type と異なる場合、ブラウザ上で指定形式へ変換してからダウンロードします。

## Local Source Images

編集モードでは、画面で画像をアップロードしなかった場合に、リポジトリルートの `local-images/` にある画像を入力画像として使います。

対応形式は PNG、JPEG、WEBP です。最大サイズはアップロード時と同じ 10MB です。

ファイル選択の優先順位は次の通りです。

- `source.jpg`、`source.jpeg`、`source.png`、`source.webp`
- `default.jpg`、`default.jpeg`、`default.png`、`default.webp`
- `input.jpg`、`input.jpeg`、`input.png`、`input.webp`
- 上記がない場合は、`local-images/` 内の対応画像ファイル名を昇順に並べた最初のファイル

`local-images/` は `.gitignore` に含めています。検証用や私物の画像を置いても Git には追加されません。

## Billing

このアプリは Gemini Developer API を使用するため、利用料金は ChatGPT のサブスクリプションではなく Google AI Studio 経由で請求されます。

本番利用やより高いレート制限が必要な場合:

- Gemini Developer API の料金ページを確認します: https://ai.google.dev/gemini-api/docs/pricing?hl=ja
- 料金ページから、API キーに対応する Google AI Studio プロジェクトを有料アカウントへアップグレードします。
- アップグレード後も、`.env.local` またはデプロイ環境に `GEMINI_API_KEY` を設定した状態にします。

料金ページには、無料、有料、エンタープライズの各ティアが説明されています。有料ティアは、より高いレート制限、高度な機能へのアクセス、プロダクト改善に利用されないコンテンツを必要とする本番アプリ向けです。

## API

`POST /api/image/edit`

`multipart/form-data` で次の項目を送信します。

- `image`: PNG、JPEG、または WEBP ファイル。最大 10MB
- `prompt`: 追加の編集指示。`GEMINI_COMMON_PROMPT` が未設定の場合は必須
- `size`: `1K`、`2K`、または `4K`

API ルートはサーバー側で Gemini Interactions API を呼び出し、JPEG data URL を返します。`size` は Gemini の `generation_config.image_config.image_size`、`GEMINI_IMAGE_ASPECT_RATIO` は `generation_config.image_config.aspect_ratio` として送信します。

`GEMINI_COMMON_PROMPT` が設定されている場合、ルートは次の順序で 2 つのテキスト入力を Gemini へ送信します。

- `GEMINI_COMMON_PROMPT`
- `prompt`。空欄の場合は送信しません。

`POST /api/image/generate`

JSON で次の項目を送信します。

- `prompt`: 画像生成指示。`GEMINI_COMMON_PROMPT` が未設定の場合は必須
- `size`: `1K`、`2K`、または `4K`

このルートは画像入力なしの text-to-image 用です。画像入力付きの編集 quota がない Project でも、text-to-image の quota がある場合は利用できます。

# Examples

## Local Development

```bash
yarn install
cp .env.example .env.local
yarn dev
```

http://localhost:3000 を開きます。

## API Diagnostics

画像入力付きの API 呼び出しを確認します。

```bash
yarn test:image-input /path/to/image.jpg
```

UI から使う場合は、`local-images/source.jpg` などを置いてから編集モードでファイル選択を空のまま実行します。

text-to-image の API 呼び出しを確認し、返却画像を `tmp/gemini-text-to-image-output.jpg` に保存します。

```bash
yarn test:text-to-image "Create a picture of my cat eating a nano-banana"
```

# Citations

- Gemini Developer API 料金ページ、2026-06-29 参照: https://ai.google.dev/gemini-api/docs/pricing?hl=ja
