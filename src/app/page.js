"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_SOURCES,
  learningPackToMarkdown,
  sampleLearningPack,
  validateSources,
} from "@/lib/bookmoth";
import { buildCollageSvg } from "@/lib/collage-template";
import { APP_VERSION, VERSION_SOURCES, compareVersions } from "@/lib/app-version";

const outputTabs = [
  ["guide", "Study guide"],
  ["trail", "Lantern trail"],
  ["report", "Report"],
  ["practice", "Practice"],
  ["collage", "Collage"],
  ["sources", "Source check"],
];

const learningLanguages = [
  "English",
  "Spanish",
  "Simplified Chinese",
  "Traditional Chinese",
  "French",
  "German",
  "Japanese",
  "Korean",
  "Arabic",
  "Portuguese",
  "Hindi",
  "Vietnamese",
];

function MothMark({ compact = false }) {
  return (
    <span className={compact ? "moth-mark compact" : "moth-mark"} aria-hidden="true">
      <NextImage
        className="moth-mark-image"
        src="/bookmoth-brand-figure.png"
        alt=""
        width={1024}
        height={1024}
        sizes={compact ? "54px" : "280px"}
      />
    </span>
  );
}

function VersionChecker({ status, onCheck, onReload }) {
  const label = status.state === "checking"
    ? "Checking for updates…"
    : status.state === "update"
      ? `Update available · v${status.latest}`
      : status.state === "offline"
        ? "Update check unavailable"
        : status.state === "current"
          ? "Up to date"
          : "Check for updates";
  return (
    <div className="version-checker" role="status" aria-live="polite">
      <span>Bookmoth v{APP_VERSION}</span>
      <span className="version-checker-dot" aria-hidden="true">·</span>
      <span>{label}</span>
      {status.state === "update"
        ? <button type="button" onClick={onReload}>Reload to update</button>
        : <button type="button" onClick={onCheck} disabled={status.state === "checking"}>{status.state === "current" ? "Check again" : "Check now"}</button>}
    </div>
  );
}

function HowToDialog({ onClose, onStart, researchAvailable }) {
  const closeButton = useRef(null);
  const dialog = useRef(null);

  useEffect(() => {
    closeButton.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const focusable = [...(dialog.current?.querySelectorAll("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])") || [])]
        .filter((element) => !element.disabled && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("dialog-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("dialog-open");
    };
  }, [onClose]);

  return (
    <div className="howto-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialog} className="howto-dialog" role="dialog" aria-modal="true" aria-labelledby="howto-title">
        <div className="howto-header">
          <div><p>Bookmoth field guide</p><h2 id="howto-title">From clear images to a checked learning pack.</h2></div>
          <button ref={closeButton} className="dialog-close" type="button" onClick={onClose} aria-label="Close how-to guide">×</button>
        </div>

        <ol className="howto-steps">
          <li><b>1</b><div><h3>Add clear source images</h3><p>Upload one to eight screenshots or photos. Fill the frame, avoid glare, and keep every word readable.</p></div></li>
          <li><b>2</b><div><h3>Describe the lesson and your goal</h3><p>Tell Bookmoth the topic and what you need to understand, remember, compare, or practice. These details guide the teaching without replacing the source.</p></div></li>
          <li><b>3</b><div><h3>Choose language and evidence settings</h3><p>Select the output language; request a full translation when needed. {researchAvailable === true ? "If you enable global research, Bookmoth can add independent sources for corroboration." : researchAvailable === false ? "Live web research is not available on this connection, so Bookmoth will use your uploaded material." : "Live web research depends on your connected AI provider; free OpenRouter and local Ollama use uploaded material only."}</p></div></li>
          <li><b>4</b><div><h3>Create, then check the evidence first</h3><p>Open Source check before studying. Review the transcription, translation, and uncertainty labels beside the original material. {researchAvailable === true ? "Research links appear when global research is enabled." : researchAvailable === false ? "Live research links are not available on this connection." : "Research links appear only when the connected provider supports and completes a search."}</p></div></li>
          <li><b>5</b><div><h3>Study in the format that fits</h3><p>Use the detailed guide, Lantern trail, report, practice set, or visual board. Export Markdown or JSON when you want to keep the result.</p></div></li>
        </ol>

        <div className="howto-notes">
          <article><span>Better input</span><p>Use close, straight, well-lit images that show the full question, heading, labels, and instructions.</p></article>
          <article><span>Honest limits</span><p>When text or support is unclear, Bookmoth may limit a lesson and show uncertainty. Its checks do not prove that the original source is correct; verify important claims there.</p></article>
        </div>

        <div className="howto-actions">
          <button className="button" type="button" onClick={onClose}>Keep reading</button>
          <button className="button primary" type="button" onClick={onStart}>Start a learning pack</button>
        </div>
      </section>
    </div>
  );
}

function SourcePills({ ids }) {
  return (
    <span className="source-pills" aria-label={`Sources ${ids.join(", ") || "not assigned"}`}>
      {ids.length ? ids.map((id) => <b key={id}>{id}</b>) : <b className="warning-pill">Check</b>}
    </span>
  );
}

function DeepLessonCard({ lesson, index }) {
  const checked = lesson.verification === "source-checked";
  return (
    <article className="deep-lesson">
      <header className="deep-lesson-header">
        <span className="lesson-number">{String(index + 1).padStart(2, "0")}</span>
        <div>
          <p className="lesson-kicker">Detailed lesson</p>
          <h5>{lesson.term}</h5>
        </div>
        <span className={`verification-badge ${checked ? "checked" : "review"}`}>
          {checked ? "Source checked" : "Needs review"}
        </span>
        <SourcePills ids={lesson.sourceIds} />
      </header>

      <p className="learning-objective"><b>Learning objective</b>{lesson.learningObjective}</p>

      <section className="direct-answer">
        <p>Direct answer</p>
        <strong>{lesson.directAnswer}</strong>
      </section>

      <section className="lesson-section">
        <h6>Understand the idea</h6>
        <p>{lesson.explanation}</p>
      </section>

      <section className="lesson-section">
        <h6>Step by step</h6>
        <ol className="lesson-steps">
          {lesson.steps.map((step, stepIndex) => (
            <li key={`${step.title}-${stepIndex}`}>
              <span>{stepIndex + 1}</span>
              <div><b>{step.title}</b><p>{step.explanation}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <div className="lesson-application-grid">
        <section>
          <h6>Why it matters</h6>
          <p>{lesson.whyItMatters}</p>
        </section>
        <section>
          <h6>Use it in context</h6>
          <p>{lesson.example}</p>
        </section>
      </div>

      <section className="lesson-section">
        <h6>Common mistakes</h6>
        <div className="mistake-list">
          {lesson.commonMistakes.map((item, mistakeIndex) => (
            <article key={`${item.mistake}-${mistakeIndex}`}>
              <p><b>Mistake</b>{item.mistake}</p>
              <p><b>Correction</b>{item.correction}</p>
            </article>
          ))}
        </div>
      </section>

      <details className="lesson-check">
        <summary>Check your understanding</summary>
        <p className="check-question">{lesson.check.question}</p>
        <p><b>Hint:</b> {lesson.check.hint}</p>
        <p><b>Answer:</b> {lesson.check.answer}</p>
      </details>

      <details className="evidence-drawer">
        <summary>See the exact supporting evidence</summary>
        {lesson.evidenceQuotes.map((quote, quoteIndex) => <blockquote key={`${quote}-${quoteIndex}`}>{quote}</blockquote>)}
      </details>
    </article>
  );
}

function downloadText(filename, content, type = "text/markdown") {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      name: file.name,
      type: file.type,
      size: file.size,
      dataUrl: reader.result,
    });
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [sources, setSources] = useState([]);
  const [context, setContext] = useState("");
  const [goal, setGoal] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("English");
  const [translateFullSource, setTranslateFullSource] = useState(false);
  const [researchMode, setResearchMode] = useState(true);
  const [studyUseAccepted, setStudyUseAccepted] = useState(false);
  const [pack, setPack] = useState(null);
  const [activeTab, setActiveTab] = useState("guide");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [checkingProvider, setCheckingProvider] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [howToOpen, setHowToOpen] = useState(false);
  const [sessionNumber, setSessionNumber] = useState(1);
  const [versionStatus, setVersionStatus] = useState({ state: "idle", latest: APP_VERSION });
  const fileInput = useRef(null);
  const cameraInput = useRef(null);

  async function checkForUpdates() {
    setVersionStatus({ state: "checking", latest: APP_VERSION });
    for (const source of VERSION_SOURCES) {
      try {
        const response = await fetch(`${source}?bookmoth=${encodeURIComponent(APP_VERSION)}`, { cache: "no-store" });
        if (!response.ok) continue;
        const manifest = await response.json();
        if (!manifest?.version) continue;
        const comparison = compareVersions(manifest.version, APP_VERSION);
        setVersionStatus({
          state: comparison > 0 ? "update" : "current",
          latest: String(manifest.version),
          notes: manifest.notes || "",
          updateUrl: manifest.updateUrl || "",
        });
        return;
      } catch {
        // Try the next canonical source before reporting the check as unavailable.
      }
    }
    setVersionStatus({ state: "offline", latest: APP_VERSION });
  }

  useEffect(() => {
    checkForUpdates();
  }, []);

  const totalSize = useMemo(
    () => sources.reduce((sum, source) => sum + source.size, 0),
    [sources],
  );

  useEffect(() => {
    let active = true;
    const savedKey = globalThis.sessionStorage.getItem("bookmoth-openrouter-key") || "";
    setOpenRouterKey(savedKey);
    fetch("/api/create", {
      headers: savedKey ? { "x-bookmoth-openrouter-key": savedKey } : {},
    })
      .then((response) => response.json())
      .then((data) => { if (active) setProviderStatus(data); })
      .catch(() => {
        if (active) setProviderStatus({ ready: false, local: true, model: "Local AI", detail: "Bookmoth could not check the AI provider." });
      });
    return () => { active = false; };
  }, []);

  async function checkOpenRouterKey(candidate = openRouterKey) {
    const key = candidate.trim();
    setCheckingProvider(true);
    setMessage("");
    try {
      if (key) globalThis.sessionStorage.setItem("bookmoth-openrouter-key", key);
      else globalThis.sessionStorage.removeItem("bookmoth-openrouter-key");
      const response = await fetch("/api/create", {
        headers: key ? { "x-bookmoth-openrouter-key": key } : {},
      });
      const data = await response.json();
      setProviderStatus(data);
      if (key && !data.ready) setMessage(data.detail || "OpenRouter could not verify this key.");
    } catch {
      setMessage("Bookmoth could not check OpenRouter. Try again in a moment.");
    } finally {
      setCheckingProvider(false);
    }
  }

  function disconnectOpenRouter() {
    setOpenRouterKey("");
    globalThis.sessionStorage.removeItem("bookmoth-openrouter-key");
    checkOpenRouterKey("");
  }

  async function addFiles(fileList) {
    setMessage("");
    const files = Array.from(fileList || []);
    const rejected = files.find((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type));
    if (rejected) {
      setMessage(`${rejected.name} is not a supported image. Use PNG, JPG, or WebP.`);
      return;
    }
    if (sources.length + files.length > MAX_SOURCES) {
      setMessage(`A learning pack can contain up to ${MAX_SOURCES} images.`);
      return;
    }
    try {
      const read = await Promise.all(files.map(readFile));
      const next = [...sources, ...read];
      const error = validateSources(next);
      if (error) return setMessage(error);
      setSources(next);
      setPack(null);
      setExportMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createPack() {
    setMessage("");
    const sourceError = validateSources(sources);
    if (sourceError) return setMessage(sourceError);
    if (!studyUseAccepted) return setMessage("Confirm the study-use statement before creating a pack.");
    setBusy(true);
    try {
      const response = await fetch("/api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(openRouterKey.trim() ? { "x-bookmoth-openrouter-key": openRouterKey.trim() } : {}),
        },
        body: JSON.stringify({
          sources,
          context,
          goal,
          referenceUrl,
          outputLanguage,
          translateFullSource,
          researchMode: researchMode && providerStatus?.researchAvailable === true,
          studyUseAccepted,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bookmoth could not create a learning pack.");
      setPack(data.pack);
      setExportMessage("");
      if (data.provider) {
        setProviderStatus({
          ready: true,
          local: data.provider.local,
          provider: data.provider.name,
          model: data.provider.extractionModel || data.provider.model,
          teachingModel: data.provider.teachingModel,
          fallbackModels: data.provider.fallbackModels || [],
          fallbackUsed: data.provider.fallbackUsed,
          researchAvailable: data.provider.researchAvailable,
          userKeyRequired: data.provider.userKeyRequired,
          translationAvailable: true,
          detail: data.provider.local
            ? "Learning pack created on this PC."
            : data.provider.fallbackUsed
              ? "A model fallback completed the learning pack after the first route failed. The account-wide free quota still applies."
              : "Learning pack created. OpenRouter's returned model IDs show which routes handled image reading and teaching.",
        });
      }
      setActiveTab("guide");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  function loadSample() {
    setSources([
      {
        id: "sample-source",
        name: "manual-exposure-guide.png",
        type: "image/png",
        size: 0,
        dataUrl: "/sample-notes.png",
        displayOnly: true,
      },
    ]);
    setContext("Photography fundamentals");
    setGoal("Understand how aperture, shutter speed, and ISO change a photo");
    setReferenceUrl("");
    setOutputLanguage("English");
    setTranslateFullSource(false);
    setResearchMode(true);
    setStudyUseAccepted(true);
    setPack(sampleLearningPack());
    setExportMessage("");
    setActiveTab("guide");
    setMessage("Sample pack loaded. Add your own screenshots when you are ready.");
  }

  function resetWorkspace() {
    setSources([]);
    setContext("");
    setGoal("");
    setReferenceUrl("");
    setOutputLanguage("English");
    setTranslateFullSource(false);
    setResearchMode(true);
    setStudyUseAccepted(false);
    setPack(null);
    setExportMessage("");
    setActiveTab("guide");
    setSessionNumber((current) => current + 1);
    setMessage("New Bookmoth session started. This clears the current workspace; it does not reset model-provider usage limits.");
  }

  function exportMarkdown() {
    if (!pack) return;
    downloadText(`${pack.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`, learningPackToMarkdown(pack));
    setExportMessage("Markdown export ready. Check your downloads folder.");
  }

  function exportJson() {
    if (!pack) return;
    downloadText("bookmoth-learning-pack.json", JSON.stringify(pack, null, 2), "application/json");
    setExportMessage("JSON export ready. Check your downloads folder.");
  }

  async function exportCollage() {
    if (!pack || !sources.length) return;
    setExporting(true);
    setExportMessage("Rendering the 1600 × 1100 study board…");
    try {
      const embeddedSources = await Promise.all(sources.slice(0, 4).map(async (source) => {
        if (source.dataUrl.startsWith("data:")) return source;
        const response = await fetch(source.dataUrl);
        if (!response.ok) throw new Error("Bookmoth could not read one source image for the export.");
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        return { ...source, dataUrl };
      }));
      const svg = buildCollageSvg(pack.collage, embeddedSources);
      const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      try {
        const image = await new Promise((resolve, reject) => {
          const rendered = new Image();
          rendered.onload = () => resolve(rendered);
          rendered.onerror = () => reject(new Error("Bookmoth could not render the visual study board."));
          rendered.src = svgUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = 1600;
        canvas.height = 1100;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Bookmoth could not prepare the PNG canvas.");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Bookmoth could not encode the visual study board.")), "image/png");
        });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = "bookmoth-visual-study-board.png";
        anchor.click();
        URL.revokeObjectURL(href);
        setExportMessage("PNG export ready at 1600 × 1100. Check your downloads folder.");
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    } catch (error) {
      setExportMessage(error.message || "Bookmoth could not export the visual study board.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main id="top">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Bookmoth home">
          <MothMark compact />
          <span><strong>Bookmoth</strong><small>open learning studio</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#workspace">Create</a>
          <button type="button" onClick={() => setHowToOpen(true)} aria-haspopup="dialog">How to use</button>
          <a href="#open-source">Open source</a>
        </nav>
        <div className="header-actions"><button className="header-help" type="button" onClick={() => setHowToOpen(true)} aria-haspopup="dialog">How to use</button><a className="header-link" href="https://github.com/Helios56722/bookmoth" target="_blank" rel="noreferrer">GitHub ↗</a></div>
      </header>

      {howToOpen && <HowToDialog onClose={() => setHowToOpen(false)} onStart={() => { setHowToOpen(false); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); }} researchAvailable={providerStatus ? providerStatus.researchAvailable === true : null} />}

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Learning from images, with source checks</p>
          <h1>Catch what matters.<br /><em>Learn it your way.</em></h1>
          <p className="lede">Turn screenshots of notes, lessons, tutorials, and permitted coursework into a study guide, a report, practice material, or a visual collage.</p>
          <div className="hero-actions">
            <a className="button primary" href="#workspace">Build a learning pack</a>
            <button className="button ghost" type="button" onClick={() => setHowToOpen(true)}>How to use Bookmoth</button>
            <button className="button ghost" type="button" onClick={loadSample}>Explore a sample</button>
          </div>
          <ul className="trust-row" aria-label="Product principles">
            <li>Source-linked</li><li>Open source</li><li>Mobile-minded</li><li>Honest about uncertainty</li>
          </ul>
        </div>
        <div className="hero-figure" aria-label="Bookmoth brand figure concept">
          <span className="orbit orbit-one" /><span className="orbit orbit-two" />
          <NextImage className="brand-figure-image" src="/bookmoth-brand-figure.png" alt="A dark-plum and orange moth resting on an open book" width={1024} height={1024} priority />
          <div className="figure-note"><b>Meet the Bookmoth</b><span>Generated locally in ComfyUI, then selected for its clear silhouette.</span></div>
        </div>
      </section>

      <section className="workspace" id="workspace">
        <div className="section-heading">
          <div><p className="eyebrow"><span /> Your desk</p><h2>Make one clear learning pack.</h2></div>
          <div className="session-actions">
            <span className="session-label">Session {sessionNumber}</span>
            <button className="text-button" type="button" onClick={resetWorkspace} disabled={busy}>Start new session</button>
          </div>
        </div>

        <ol className="quick-start" aria-label="Quick-start sequence">
          <li><b>1</b><span><strong>Add</strong><small>Clear screenshots or photos</small></span></li>
          <li><b>2</b><span><strong>Focus</strong><small>Topic, goal, and language</small></span></li>
          <li><b>3</b><span><strong>Check</strong><small>Original text and evidence</small></span></li>
          <li><b>4</b><span><strong>Study</strong><small>Guide, practice, or export</small></span></li>
        </ol>

        <div className="workspace-grid">
          <aside className="source-panel">
            <div className="step-label"><b>01</b><span>Add clear source images</span></div>
            <button
              className={`drop-zone ${dragging ? "dragging" : ""}`}
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
            >
              <span className="drop-icon">+</span>
              <strong>Choose screenshots or drag them here</strong>
              <small>PNG, JPG, or WebP · up to 8 images · 18 MB total</small>
            </button>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event) => addFiles(event.target.files)} />
            <button className="button full" type="button" onClick={() => cameraInput.current?.click()}>Use this device&apos;s camera</button>
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(event) => addFiles(event.target.files)} />

            <div className="capture-guide" aria-label="Photo checklist">
              <b>Before you add a photo</b>
              <ul>
                <li>Fill the frame with the page or question.</li>
                <li>Keep the words sharp, straight, and free of glare.</li>
                <li>Crop out menus, tabs, and unrelated notes when possible.</li>
              </ul>
            </div>

            <div className="source-list" aria-live="polite">
              {sources.length === 0 && <p className="empty-copy">Each image will receive a source ID so you can trace the finished material back to it.</p>}
              {sources.map((source, index) => (
                <article className="source-card" key={source.id}>
                  <NextImage src={source.dataUrl} alt="" width={54} height={54} unoptimized />
                  <div><b>S{index + 1}</b><span>{source.name}</span><small>{source.displayOnly ? "Sample" : `${Math.max(1, Math.round(source.size / 1024))} KB`}</small></div>
                  <button type="button" aria-label={`Remove ${source.name}`} onClick={() => { setSources(sources.filter((item) => item.id !== source.id)); setPack(null); }}>×</button>
                </article>
              ))}
            </div>
            {sources.length > 0 && !sources[0]?.displayOnly && <p className="file-total">{sources.length}/{MAX_SOURCES} sources · {(totalSize / 1024 / 1024).toFixed(1)} MB</p>}

            <label>Topic or context<textarea value={context} onChange={(event) => setContext(event.target.value)} placeholder="Example: beginner woodworking notes about safe joinery" /></label>
            <label>What do you want to learn?<textarea value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Example: understand the steps and remember the tool names" /></label>
            <p className="field-guidance">Topic and goal are optional. Name the task, such as “solve this equation,” “analyze the grammar,” “explain this process,” or “build a timeline,” to help Bookmoth choose the right teaching method.</p>
            <label>Original link <span>(optional)</span><input type="url" value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://…" /></label>

            <fieldset className="evidence-controls">
              <legend>Language and evidence</legend>
              <label>Learning pack language
                <select value={outputLanguage} onChange={(event) => setOutputLanguage(event.target.value)}>
                  {learningLanguages.map((language) => <option value={language} key={language}>{language}</option>)}
                </select>
              </label>
              <label className="control-check">
                <input type="checkbox" checked={translateFullSource} onChange={(event) => setTranslateFullSource(event.target.checked)} />
                <span><b>Translate every extracted source in full</b><small>Preserves the original text beside a complete machine translation.</small></span>
              </label>
              <label className={`control-check ${providerStatus?.researchAvailable ? "" : "disabled"}`}>
                <input type="checkbox" checked={researchMode && providerStatus?.researchAvailable === true} disabled={!providerStatus?.researchAvailable} onChange={(event) => setResearchMode(event.target.checked)} />
                <span><b>Cross-check with global sources</b><small>{providerStatus?.researchAvailable ? "Searches primary and original-language sources across relevant regions." : providerStatus?.provider === "openrouter" ? "The free OpenRouter route stays grounded in your uploads; it does not include live web research." : "Available with a research-enabled cloud provider; local Ollama stays upload-only."}</small></span>
              </label>
              <p>{providerStatus?.researchAvailable ? "When live research is available, Bookmoth ranks sources by authority and proximity to the claim." : "This connection is upload-only, so Bookmoth will not fetch outside sources."} Chinese-origin material keeps its original-language context, and every subject receives the same source-language treatment.</p>
            </fieldset>

            <label className="integrity-check">
              <input type="checkbox" checked={studyUseAccepted} onChange={(event) => setStudyUseAccepted(event.target.checked)} />
              <span>I have permission to use these materials. I am studying, not answering an active or proctored assessment.</span>
            </label>

            {providerStatus?.provider === "openrouter" && providerStatus?.userKeyRequired && (
              <div className="openrouter-setup">
                <div>
                  <b>{providerStatus.ready ? "OpenRouter connected" : "Connect free OpenRouter AI"}</b>
                  <small>Your key stays in this browser tab. Bookmoth forwards it for analysis and does not save it in the project database.</small>
                </div>
                <ol>
                  <li><a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">Create or copy an OpenRouter API key</a>.</li>
                  <li>Paste it below and check the connection.</li>
                </ol>
                <label>OpenRouter key
                  <input type="password" autoComplete="off" value={openRouterKey} onChange={(event) => setOpenRouterKey(event.target.value)} placeholder="sk-or-v1-…" />
                </label>
                <div className="provider-actions">
                  <button className="button" type="button" disabled={checkingProvider || !openRouterKey.trim()} onClick={() => checkOpenRouterKey()}>{checkingProvider ? "Checking…" : "Check connection"}</button>
                  {providerStatus.ready && <button className="text-button" type="button" onClick={disconnectOpenRouter}>Disconnect</button>}
                </div>
                <p>Bookmoth checks the live catalog for free image and structured-output models, then sends an ordered fallback list. If a model or provider fails, OpenRouter can try the next compatible option. This cannot bypass an account-wide free quota; each learner needs their own OpenRouter key. Uploaded screenshots pass through OpenRouter and the model provider. Use local Ollama for private, on-device analysis.</p>
              </div>
            )}

            <div className={`provider-status ${providerStatus?.ready ? "ready" : providerStatus ? "blocked" : "checking"}`} role="status">
              <span aria-hidden="true" />
              <div>
                <b>{providerStatus ? `${providerStatus.local ? "Local" : "Cloud"} AI · ${providerStatus.model}${providerStatus.teachingModel && providerStatus.teachingModel !== providerStatus.model ? ` + ${providerStatus.teachingModel}` : ""}` : "Checking AI provider…"}</b>
                <small>{providerStatus?.detail || "Confirming the model before images are submitted."}</small>
                {providerStatus?.provider === "openrouter" && providerStatus.fallbackModels?.length > 0 && (
                  <small>Fallback order: {providerStatus.fallbackModels.join(" → ")}</small>
                )}
              </div>
            </div>

            <button className="button primary full" type="button" disabled={busy || sources[0]?.displayOnly || providerStatus?.ready === false} onClick={createPack}>
              {busy ? (providerStatus?.researchAvailable && researchMode ? "Reading, researching, and checking…" : "Reading and checking lessons…") : "Create learning pack"}
            </button>
            {sources[0]?.displayOnly && <button className="button full" type="button" onClick={() => fileInput.current?.click()}>Replace sample with my images</button>}
            {message && <p className="status-message" role="status">{message}</p>}
            <p className="privacy-note">{providerStatus?.local
              ? "Local mode keeps image analysis on this PC through Ollama. Images are not uploaded to a cloud model."
              : providerStatus?.provider === "openrouter"
                ? "Images stay in this browser until you create a pack. Then they are sent through OpenRouter to the selected model provider."
                : "Images stay in this browser until you create a pack. Then they are sent to the configured AI provider."}</p>
          </aside>

          <section className="output-panel" aria-live="polite">
            <div className="step-label"><b>02</b><span>Review and shape the result</span></div>
            {!pack ? (
              <div className="waiting-state">
                <MothMark compact />
                <h3>Your learning pack will land here.</h3>
        <p>You will get multiple ways to work with the same source material, with source IDs that help you trace supporting claims.</p>
                <div className="output-preview-grid">
                  {outputTabs.slice(0, 4).map(([key, label]) => <span key={key}><b>{label}</b><small>Ready after analysis</small></span>)}
                </div>
              </div>
            ) : (
              <>
                <div className="pack-heading">
                    <div><p>Learning pack</p><h3>{pack.title}</h3><span>{pack.overview}</span></div>
                    <div className="export-actions"><button type="button" onClick={exportMarkdown}>Markdown ↓</button><button type="button" onClick={exportJson}>JSON ↓</button></div>
                  </div>
                  <div className="verification-ledger" aria-label="Verification summary">
                    <div><span>Lesson evidence</span><b>{pack.evidenceReview.status === "source-checked" ? "Source-checked" : "Limited"}</b></div>
                    <div><span>Pack integrity</span><b>{pack.consistencyReview?.status === "passed" ? "Checks agree" : "Review needed"}</b></div>
                    <div><span>Subject method</span><b>{pack.subjectProfile?.label || "General learning"}</b></div>
                    <div><span>Global research</span><b>{pack.researchProfile?.performed ? `${pack.researchProfile.sourceCount} linked sources` : "Not performed"}</b></div>
                    <div><span>Output language</span><b>{pack.languageProfile?.outputLanguage || "English"}</b></div>
                    <div><span>Full translation</span><b>{pack.languageProfile?.fullSourceTranslation ? "Included" : "Not requested"}</b></div>
                  </div>
                  <p className="verification-note">These checks confirm source links and pack structure. They do not independently prove every fact.</p>
                <div className="tab-list" role="tablist" aria-label="Learning pack views">
                  {outputTabs.map(([key, label]) => <button key={key} role="tab" aria-selected={activeTab === key} type="button" onClick={() => setActiveTab(key)}>{label}</button>)}
                </div>

                <div className="tab-content">
                  {activeTab === "guide" && <div className="content-stack deep-guide"><section className={`subject-route ${["verified", "source-checked"].includes(pack.subjectProfile?.answerVerification?.status) ? "verified" : "review"}`}><div><p>Subject route</p><h4>{pack.subjectProfile?.label || "General learning"} <span>·</span> {pack.subjectProfile?.taskType || "Concept review"}</h4></div><strong>{pack.subjectProfile?.responseMode || "Evidence-guided explanation"}</strong><p>{pack.subjectProfile?.guidance}</p><aside><b>{pack.subjectProfile?.answerVerification?.status === "verified" ? "Answer independently checked" : pack.subjectProfile?.answerVerification?.status === "source-checked" ? "Explanation source checked" : "Manual review recommended"}</b><span>{pack.subjectProfile?.answerVerification?.note}</span>{pack.subjectProfile?.answerVerification?.expectedAnswer && <code>{pack.subjectProfile.answerVerification.expectedAnswer}</code>}</aside></section><section className={`evidence-review ${pack.evidenceReview.status}`}><div><span aria-hidden="true">{pack.evidenceReview.status === "source-checked" ? "✓" : "!"}</span><div><p>Evidence review</p><h4>{pack.evidenceReview.status === "source-checked" ? "Every displayed lesson passed the source gate." : "Bookmoth removed or limited unsupported teaching."}</h4></div></div><p>{pack.evidenceReview.note}</p><small>{pack.evidenceReview.acceptedLessons} accepted · {pack.evidenceReview.rejectedLessons} removed</small></section><div className="guide-introduction"><p className="eyebrow"><span /> Layered teaching</p><h4>Learn the idea, then prove you understand it.</h4><p>{pack.depthSummary}</p></div>{pack.deepLessons.length ? pack.deepLessons.map((lesson, index) => <DeepLessonCard lesson={lesson} index={index} key={`${lesson.term}-${index}`} />) : pack.concepts.map((item, index) => <article className="learning-card" key={`${item.term}-${index}`}><div><span>{String(index + 1).padStart(2, "0")}</span><h5>{item.term}</h5><SourcePills ids={item.sourceIds} /></div><p>{item.explanation}</p></article>)}<h4>Review plan</h4><ol className="review-list">{pack.reviewPlan.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></div>}
                  {activeTab === "trail" && <div className="content-stack trail-view"><div className="trail-intro"><div><p className="eyebrow"><span /> Evidence map</p><h4>Follow the ideas. Notice the dark.</h4></div><p>Glow points are supported ideas. Threads show source-backed connections. Blind spots stay visible when the screenshots cannot finish the explanation.</p></div><div className="glow-grid">{pack.trailMap.glowPoints.map((point, index) => <article className="glow-point" key={`${point.id}-${index}`}><div><b>{point.id}</b><SourcePills ids={point.sourceIds} /></div><h5>{point.label}</h5><p>{point.whyItMatters}</p></article>)}</div><h4>Threads</h4><div className="thread-list">{pack.trailMap.threads.map((thread, index) => <article key={`${thread.fromId}-${thread.toId}-${index}`}><b>{thread.fromId}</b><span aria-hidden="true">→</span><b>{thread.toId}</b><p>{thread.relationship}</p></article>)}</div><h4>Blind spots</h4><div className="blind-list">{pack.trailMap.blindSpots.length ? pack.trailMap.blindSpots.map((spot, index) => <article key={`${spot.question}-${index}`}><div><span aria-hidden="true">?</span><h5>{spot.question}</h5><SourcePills ids={spot.sourceIds} /></div><p>{spot.reason}</p></article>) : <p className="helper-copy">No source gap was identified. Verify the full pack before relying on it.</p>}</div><h4>Recall loop</h4><ol className="review-list">{pack.trailMap.recallLoop.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></div>}
                  {activeTab === "report" && <div className="content-stack"><h4>Structured report</h4>{pack.reportSections.map((item, index) => <article className="report-section" key={`${item.heading}-${index}`}><div><h5>{item.heading}</h5><SourcePills ids={item.sourceIds} /></div><p>{item.body}</p></article>)}</div>}
                  {activeTab === "practice" && <div className="content-stack"><h4>Flashcards</h4><div className="flashcard-grid">{pack.flashcards.map((item, index) => <details key={`${item.front}-${index}`}><summary>{item.front}</summary><p>{item.back}</p><SourcePills ids={item.sourceIds} /></details>)}</div><h4>Practice questions</h4>{pack.practice.map((item, index) => <details className="practice-item" key={`${item.question}-${index}`}><summary><span>{index + 1}</span>{item.question}</summary><p><b>Hint:</b> {item.hint}</p><p><b>Answer:</b> {item.answer}</p><SourcePills ids={item.sourceIds} /></details>)}</div>}
                  {activeTab === "collage" && <div className="content-stack"><div className="collage-heading"><div><h4>{pack.collage.title}</h4><p>{pack.collage.caption}</p><p className="collage-clarity">Source-grounded board. It arranges your uploaded images and checked notes; it does not create replacement artwork.</p>{exportMessage && <p className="export-status" role="status" aria-live="polite">{exportMessage}</p>}</div><button type="button" onClick={exportCollage} disabled={exporting}>{exporting ? "Rendering…" : "Download PNG ↓"}</button></div>{pack.collage.variant === "science-calculation" && <section className="calculation-rail" aria-label="Verified calculations"><div className="calculation-rail-heading"><div><p>Checked equations</p><h5>Formula · substitute · verify</h5></div><span>Source checked</span></div><div className="calculation-rail-grid">{pack.collage.calculationCards.map((item, index) => <article key={`${item.label}-${index}`}><SourcePills ids={item.sourceIds} /><h6>{item.label}</h6><strong>{item.formula}</strong><p>{item.substitution}</p><b>{item.answer}</b></article>)}</div></section>}<div className="collage-board"><section className="collage-sources" aria-label="Source material"><p>Source material · {sources.length} {sources.length === 1 ? "item" : "items"}</p><div className="collage-grid">{sources.map((source, index) => <figure key={source.id}><NextImage src={source.dataUrl} alt={`Source S${index + 1}: ${source.name}`} width={800} height={600} unoptimized /><figcaption><b>S{index + 1}</b><span>{source.name}</span></figcaption></figure>)}</div></section><aside className="collage-review"><h5>Quick review</h5><p>Explain each point in your own words, then check it against the source.</p><ul className="callout-list">{pack.collage.callouts.map((item, index) => <li key={`${item.text}-${index}`}><SourcePills ids={item.sourceIds} /><span>{item.text}</span></li>)}</ul></aside></div></div>}
                  {activeTab === "sources" && <div className="content-stack source-check-view"><h4>Source, translation, and research check</h4><p className="helper-copy">Low confidence and unclear text are review prompts. Machine translation and web corroboration improve coverage, but neither replaces the original source or qualified review.</p><section className={`research-summary ${pack.researchProfile?.performed ? "performed" : "source-only"}`}><div><span aria-hidden="true">{pack.researchProfile?.performed ? "✓" : "i"}</span><div><b>{pack.researchProfile?.performed ? "Global corroboration completed" : "Source-only pack"}</b><p>{pack.researchProfile?.note}</p></div></div>{pack.researchSources?.length > 0 && <div className="research-source-list">{pack.researchSources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{source.id}</span><div><b>{source.title}</b><small>{source.publisher} · {source.language}</small></div><em>Open ↗</em></a>)}</div>}</section><section className={`consistency-summary ${pack.consistencyReview?.status === "passed" ? "passed" : "needs-review"}`}><span aria-hidden="true">{pack.consistencyReview?.status === "passed" ? "✓" : "!"}</span><div><b>{pack.consistencyReview?.status === "passed" ? "Internal consistency checks passed" : "Consistency review needed"}</b><p>{pack.consistencyReview?.note}</p>{pack.consistencyReview?.invalidSourceIds?.length > 0 && <small>Unknown source IDs: {pack.consistencyReview.invalidSourceIds.join(", ")}</small>}</div></section>{pack.sources.map((source, index) => <article className="source-extract" key={`${source.sourceId}-${index}`}><div><div><h5>{source.sourceId} · {source.sourceTitle}</h5><small>{source.sourceType === "web-research" ? "Corroboration evidence" : `Detected language: ${source.detectedLanguage}`}</small></div><span className={`confidence ${source.confidence}`}>{source.confidence} confidence</span></div><section><b>Original extracted text</b><p>{source.extractedText}</p></section>{source.translatedText && <section className="translation-block"><div><b>Full {source.translationLanguage} translation</b><span className={`confidence ${source.translationConfidence}`}>{source.translationConfidence} confidence</span></div><p>{source.translatedText}</p><small>Machine translation: verify names, formulas, quotations, and technical terms against the original.</small></section>}{source.unclearText.length > 0 && <div className="unclear"><b>Unclear in the image</b>{source.unclearText.map((item, itemIndex) => <span key={`${item}-${itemIndex}`}>{item}</span>)}</div>}</article>)}{pack.cautions.length > 0 && <div className="caution-box"><b>Check before relying on this</b>{pack.cautions.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</div>}</div>}
                </div>
              </>
            )}
          </section>
        </div>
      </section>

      <section className="explain-section" id="how-it-works">
        <div className="section-heading"><div><p className="eyebrow"><span /> Built for real learning</p><h2>A useful loop, not an answer machine.</h2></div></div>
        <div className="explain-grid">
          <article><b>01</b><h3>Gather</h3><p>Capture the lesson, notes, diagram, or tutorial you are allowed to use. Add the original link when it helps you find the source again.</p></article>
          <article><b>02</b><h3>Ground</h3><p>Bookmoth extracts readable material, labels uncertainty, and ties each explanation back to a source ID.</p></article>
          <article><b>03</b><h3>Transform</h3><p>Move between a study guide, report, practice set, and image collage without starting over.</p></article>
          <article><b>04</b><h3>Verify</h3><p>Check the source panel before you trust a detail. The app makes verification visible instead of hiding it.</p></article>
        </div>
      </section>

      <section className="open-section" id="open-source">
        <div><p className="eyebrow"><span /> Open by design</p><h2>Built in public, ready to travel.</h2><p>Bookmoth begins as an installable responsive web app. Its learning-pack format, exports, and provider boundary are designed so a future mobile client can use the same core.</p></div>
        <ul><li><b>MIT licensed</b><span>Study, improve, or self-host it.</span></li><li><b>Portable exports</b><span>Keep Markdown, JSON, and collage files.</span></li><li><b>Provider boundary</b><span>Replace the AI service without rebuilding the interface.</span></li><li><b>Mobile roadmap</b><span>Camera capture, share sheet, and offline review come next.</span></li></ul>
      </section>

      <footer><a className="brand" href="#top"><MothMark compact /><span><strong>Bookmoth</strong><small>follow the light of a useful idea</small></span></a><p>Open-source learning software. Verify AI output against your sources.</p><VersionChecker status={versionStatus} onCheck={checkForUpdates} onReload={() => globalThis.location.reload()} /></footer>
    </main>
  );
}
