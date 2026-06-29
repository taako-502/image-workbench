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

type EditResponse = {
  image?: {
    dataUrl: string;
    mimeType: string;
  };
  error?: string;
};

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
  const [sourcePreview, setSourcePreview] = useState("");
  const [outputImage, setOutputImage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sourcePreviewRef = useRef("");

  const fileDetails = useMemo(() => {
    if (!file) {
      return "";
    }

    const megabytes = file.size / (1024 * 1024);
    return `${file.name} · ${megabytes.toFixed(2)}MB`;
  }, [file]);

  useEffect(() => {
    return () => {
      if (sourcePreviewRef.current) {
        URL.revokeObjectURL(sourcePreviewRef.current);
      }
    };
  }, []);

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
    setOutputImage("");
    setError(fileError);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    if (!file) {
      setError("Choose a PNG, JPEG, or WEBP image.");
      return;
    }

    setIsLoading(true);
    setError("");
    setOutputImage("");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("prompt", prompt.trim());
    formData.append("size", size);

    try {
      const response = await fetch("/api/image/edit", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as EditResponse;

      if (!response.ok || !payload.image?.dataUrl) {
        throw new Error(payload.error || "Image editing failed.");
      }

      setOutputImage(payload.image.dataUrl);
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
            Upload a source image, add an optional instruction, and generate a
            polished image without exposing your Gemini API key to the browser.
          </p>
        </div>

        <form className="control-panel" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="source-image">Source image</label>
            <input
              id="source-image"
              name="image"
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
            />
            <span className="hint">PNG, JPEG, or WEBP. Max 10MB.</span>
            {fileDetails ? <span className="file-details">{fileDetails}</span> : null}
          </div>

          <div className="field">
            <label htmlFor="prompt">Additional prompt</label>
            <textarea
              id="prompt"
              name="prompt"
              rows={7}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Optional when GEMINI_COMMON_PROMPT is set. Example: Use a blue background."
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
            {isLoading ? "Editing image..." : "Generate edit"}
          </button>
        </form>
      </section>

      <section className="preview-grid" aria-label="Image previews">
        <article className="preview-panel">
          <div className="panel-heading">
            <h2>Source</h2>
          </div>
          <div className="image-frame">
            {sourcePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sourcePreview} alt="Uploaded source preview" />
            ) : (
              <span>No image selected</span>
            )}
          </div>
        </article>

        <article className="preview-panel">
          <div className="panel-heading">
            <h2>Output</h2>
            {outputImage ? (
              <a
                className="download-link"
                href={outputImage}
                download={`image-workbench-${size.toLowerCase()}.jpg`}
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
