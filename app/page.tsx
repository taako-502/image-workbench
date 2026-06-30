"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const OUTPUT_SIZES = ["1K", "2K", "4K"] as const;

type OutputSize = (typeof OUTPUT_SIZES)[number];
type WorkMode = "generate" | "edit";

type EditResponse = {
  image?: {
    dataUrl: string;
    downloadBaseName?: string;
    downloadMimeType?: string;
    mimeType: string;
  };
  error?: string;
};

type LocalSourceImage = {
  name: string;
  status: "unknown" | "available" | "missing";
  url: string;
};

function getImageExtension(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function getTimestampSlug(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function removeImageExtension(value: string) {
  return value.replace(/\.(jpe?g|png|webp)$/i, "");
}

function getFileNameSlug(value: string, fallback: string) {
  const slug = removeImageExtension(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug || fallback;
}

function getDownloadFileName({
  baseName,
  mimeType,
}: {
  baseName: string;
  mimeType: string;
}) {
  return `${getFileNameSlug(baseName, "image-workbench")}-${getTimestampSlug()}.${getImageExtension(mimeType)}`;
}

function revokeBlobUrl(url: string) {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not prepare image download."));
    image.src = dataUrl;
  });
}

async function convertImageDataUrl(dataUrl: string, mimeType: string) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare image download.");
  }

  context.drawImage(image, 0, 0);

  return new Promise<string>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not prepare image download."));
        return;
      }

      resolve(URL.createObjectURL(blob));
    }, mimeType);
  });
}

function validateFile(file: File | null) {
  if (!file) {
    return "Choose a PNG, JPEG, or WEBP image.";
  }

  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return "Use a PNG, JPEG, or WEBP image.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "Use an image smaller than 10MB.";
  }

  return "";
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<OutputSize>("1K");
  const [mode, setMode] = useState<WorkMode>("edit");
  const [sourcePreview, setSourcePreview] = useState("");
  const [localSourceImage, setLocalSourceImage] = useState<LocalSourceImage>({
    name: "",
    status: "unknown",
    url: "",
  });
  const [outputImage, setOutputImage] = useState("");
  const [outputDownloadUrl, setOutputDownloadUrl] = useState("");
  const [outputFileName, setOutputFileName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sourcePreviewRef = useRef("");
  const outputDownloadUrlRef = useRef("");

  const fileDetails = useMemo(() => {
    if (!file) {
      return "";
    }

    const megabytes = file.size / (1024 * 1024);
    return `${file.name} · ${megabytes.toFixed(2)}MB`;
  }, [file]);

  const sourceDetails = useMemo(() => {
    if (fileDetails) {
      return fileDetails;
    }

    if (localSourceImage.status === "available") {
      return `Using local-images/${localSourceImage.name}`;
    }

    return "";
  }, [fileDetails, localSourceImage.name, localSourceImage.status]);

  useEffect(() => {
    let isMounted = true;

    async function loadLocalSourceImage() {
      try {
        const response = await fetch("/api/image/source", {
          cache: "no-store",
          method: "HEAD",
        });

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setLocalSourceImage({ name: "", status: "missing", url: "" });
          return;
        }

        setLocalSourceImage({
          name: response.headers.get("x-image-workbench-source") || "source image",
          status: "available",
          url: `/api/image/source?t=${Date.now()}`,
        });
      } catch {
        if (isMounted) {
          setLocalSourceImage({ name: "", status: "missing", url: "" });
        }
      }
    }

    loadLocalSourceImage();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sourcePreviewRef.current) {
        URL.revokeObjectURL(sourcePreviewRef.current);
      }

      revokeBlobUrl(outputDownloadUrlRef.current);
    };
  }, []);

  function clearOutput() {
    setOutputImage("");
    setOutputFileName("");
    setOutputDownloadUrl("");
    revokeBlobUrl(outputDownloadUrlRef.current);
    outputDownloadUrlRef.current = "";
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    const fileError = validateFile(nextFile);

    if (sourcePreviewRef.current) {
      URL.revokeObjectURL(sourcePreviewRef.current);
      sourcePreviewRef.current = "";
    }

    if (!fileError && nextFile) {
      const objectUrl = URL.createObjectURL(nextFile);
      sourcePreviewRef.current = objectUrl;
      setSourcePreview(objectUrl);
    } else {
      setSourcePreview("");
    }

    setFile(fileError ? null : nextFile);
    clearOutput();
    setError(fileError);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "edit" && file) {
      const fileError = validateFile(file);
      if (fileError) {
        setError(fileError);
        return;
      }
    }

    if (mode === "edit" && !file && localSourceImage.status === "missing") {
      setError("Choose an image or add one to local-images/.");
      return;
    }

    if (mode === "generate" && !prompt.trim()) {
      setError("Describe the image you want Gemini to create.");
      return;
    }

    setIsLoading(true);
    setError("");
    clearOutput();

    try {
      const response =
        mode === "edit"
          ? await (() => {
              const formData = new FormData();
              if (file) {
                formData.append("image", file);
              }
              formData.append("prompt", prompt.trim());
              formData.append("size", size);

              return fetch("/api/image/edit", {
                method: "POST",
                body: formData,
              });
            })()
          : await fetch("/api/image/generate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: prompt.trim(),
                size,
              }),
            });
      const payload = (await response.json()) as EditResponse;

      if (!response.ok || !payload.image?.dataUrl) {
        throw new Error(payload.error || "Image editing failed.");
      }

      const downloadMimeType =
        payload.image.downloadMimeType || payload.image.mimeType;
      const downloadUrl =
        downloadMimeType === payload.image.mimeType
          ? payload.image.dataUrl
          : await convertImageDataUrl(payload.image.dataUrl, downloadMimeType);

      revokeBlobUrl(outputDownloadUrlRef.current);
      outputDownloadUrlRef.current = downloadUrl;
      setOutputImage(payload.image.dataUrl);
      setOutputDownloadUrl(downloadUrl);
      setOutputFileName(
        getDownloadFileName({
          baseName: payload.image.downloadBaseName || "image-workbench",
          mimeType: downloadMimeType,
        }),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Image editing failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="workspace">
        <div className="intro">
          <p className="eyebrow">Nano Banana Pro</p>
          <h1>Image Workbench</h1>
          <p>
            Create an image from text, or edit a source image when your Gemini
            project has image input quota.
          </p>
        </div>

        <form className="control-panel" onSubmit={handleSubmit}>
          <div className="mode-tabs" aria-label="Mode">
            <button
              type="button"
              className={mode === "generate" ? "mode-tab active" : "mode-tab"}
              onClick={() => {
                setMode("generate");
                setError("");
                clearOutput();
              }}
            >
              Text to image
            </button>
            <button
              type="button"
              className={mode === "edit" ? "mode-tab active" : "mode-tab"}
              onClick={() => {
                setMode("edit");
                setError("");
                clearOutput();
              }}
            >
              Edit image
            </button>
          </div>

          <div className={mode === "edit" ? "field" : "field hidden-field"}>
            <label htmlFor="source-image">Source image</label>
            <input
              id="source-image"
              name="image"
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
            />
            <span className="hint">
              PNG, JPEG, or WEBP. Max 10MB. Falls back to local-images/.
            </span>
            {sourceDetails ? (
              <span className="file-details">{sourceDetails}</span>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="prompt">
              {mode === "generate" ? "Image prompt" : "Additional prompt"}
            </label>
            <textarea
              id="prompt"
              name="prompt"
              rows={7}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={
                mode === "generate"
                  ? "Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation."
                  : "Optional when GEMINI_COMMON_PROMPT is set. Example: Use a blue background."
              }
            />
          </div>

          <div className="field">
            <label htmlFor="size">Output size</label>
            <select
              id="size"
              name="size"
              value={size}
              onChange={(event) => setSize(event.target.value as OutputSize)}
            >
              {OUTPUT_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading
              ? mode === "generate"
                ? "Generating image..."
                : "Editing image..."
              : mode === "generate"
                ? "Generate image"
                : "Generate edit"}
          </button>
        </form>
      </section>

      <section className="preview-grid" aria-label="Image previews">
        <article className="preview-panel">
          <div className="panel-heading">
            <h2>Source</h2>
          </div>
          <div className="image-frame">
            {mode === "generate" ? (
              <span>Text prompt</span>
            ) : sourcePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sourcePreview} alt="Uploaded source preview" />
            ) : localSourceImage.status === "available" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={localSourceImage.url} alt="Local source preview" />
            ) : (
              <span>No image selected</span>
            )}
          </div>
        </article>

        <article className="preview-panel">
          <div className="panel-heading">
            <h2>Output</h2>
            {outputDownloadUrl ? (
              <a
                className="download-link"
                href={outputDownloadUrl}
                download={outputFileName}
              >
                Download
              </a>
            ) : null}
          </div>
          <div className="image-frame output-frame">
            {isLoading ? <span>Generating...</span> : null}
            {!isLoading && outputImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={outputImage} alt="Generated edited output preview" />
            ) : null}
            {!isLoading && !outputImage ? <span>No output yet</span> : null}
          </div>
        </article>
      </section>
    </main>
  );
}
