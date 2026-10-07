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

const outputTabs = [
  ["guide", "Study guide"],
  ["trail", "Lantern trail"],
  ["report", "Report"],
  ["practice", "Practice"],
  ["collage", "Collage"],
  ["sources", "Source check"],
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

function SourcePills({ ids }) {
  return (
    <span className="source-pills" aria-label={`Sources ${ids.join(", ") || "not assigned"}`}>
      {ids.length ? ids.map((id) => <b key={id}>{id}</b>) : <b className="warning-pill">Check</b>}
    </span>
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
  const [studyUseAccepted, setStudyUseAccepted] = useState(false);
  const [pack, setPack] = useState(null);
  const [activeTab, setActiveTab] = useState("guide");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);
  const fileInput = useRef(null);
  const cameraInput = useRef(null);

  const totalSize = useMemo(
    () => sources.reduce((sum, source) => sum + source.size, 0),
    [sources],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/create")
      .then((response) => response.json())
      .then((data) => { if (active) setProviderStatus(data); })
      .catch(() => {
        if (active) setProviderStatus({ ready: false, local: true, model: "Local AI", detail: "Bookmoth could not check the AI provider." });
      });
    return () => { active = false; };
  }, []);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources, context, goal, referenceUrl, studyUseAccepted }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bookmoth could not create a learning pack.");
      setPack(data.pack);
      if (data.provider) {
        setProviderStatus({
          ready: true,
          local: data.provider.local,
          provider: data.provider.name,
          model: data.provider.model,
          detail: data.provider.local ? "Learning pack created on this PC." : "Learning pack created with the configured cloud provider.",
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
        name: "photosynthesis-study-map.svg",
        type: "image/svg+xml",
        size: 0,
        dataUrl: "/sample-notes.svg",
        displayOnly: true,
      },
    ]);
    setContext("Intro biology notes");
    setGoal("Explain the process and remember the inputs and outputs");
    setReferenceUrl("");
    setStudyUseAccepted(true);
    setPack(sampleLearningPack());
    setActiveTab("guide");
    setMessage("Sample pack loaded. Add your own screenshots when you are ready.");
  }

  function resetWorkspace() {
    setSources([]);
    setContext("");
    setGoal("");
    setReferenceUrl("");
    setStudyUseAccepted(false);
    setPack(null);
    setMessage("");
  }

  function exportMarkdown() {
    if (pack) downloadText(`${pack.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`, learningPackToMarkdown(pack));
  }

  function exportJson() {
    if (pack) downloadText("bookmoth-learning-pack.json", JSON.stringify(pack, null, 2), "application/json");
  }

  async function exportCollage() {
    if (!pack || !sources.length) return;
    const embeddedSources = await Promise.all(sources.slice(0, 4).map(async (source) => {
      if (source.dataUrl.startsWith("data:")) return source;
      const response = await fetch(source.dataUrl);
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
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = "bookmoth-visual-study-board.png";
      anchor.click();
    }, "image/png");
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
          <a href="#how-it-works">How it works</a>
          <a href="#open-source">Open source</a>
        </nav>
        <a className="header-link" href="https://github.com/Helios56722/bookmoth" target="_blank" rel="noreferrer">GitHub ↗</a>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Learning from images, with source checks</p>
          <h1>Catch what matters.<br /><em>Learn it your way.</em></h1>
          <p className="lede">Turn screenshots of notes, lessons, tutorials, and permitted coursework into a study guide, a report, practice material, or a visual collage.</p>
          <div className="hero-actions">
            <a className="button primary" href="#workspace">Build a learning pack</a>
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
          <button className="text-button" type="button" onClick={resetWorkspace}>Clear workspace</button>
        </div>

        <div className="workspace-grid">
          <aside className="source-panel">
            <div className="step-label"><b>01</b><span>Add what you are learning</span></div>
            <button
              className={`drop-zone ${dragging ? "dragging" : ""}`}
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
            >
              <span className="drop-icon">+</span>
              <strong>Drop screenshots here</strong>
              <small>PNG, JPG, or WebP · up to 8 images · 18 MB total</small>
            </button>
            <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event) => addFiles(event.target.files)} />
            <button className="button full" type="button" onClick={() => cameraInput.current?.click()}>Take a photo on this device</button>
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
            <label>Original link <span>(optional)</span><input type="url" value={referenceUrl} onChange={(event) => setReferenceUrl(event.target.value)} placeholder="https://…" /></label>

            <label className="integrity-check">
              <input type="checkbox" checked={studyUseAccepted} onChange={(event) => setStudyUseAccepted(event.target.checked)} />
              <span>I have permission to use these materials. I am studying, not answering an active or proctored assessment.</span>
            </label>

            <div className={`provider-status ${providerStatus?.ready ? "ready" : providerStatus ? "blocked" : "checking"}`} role="status">
              <span aria-hidden="true" />
              <div>
                <b>{providerStatus ? `${providerStatus.local ? "Local" : "Cloud"} AI · ${providerStatus.model}` : "Checking AI provider…"}</b>
                <small>{providerStatus?.detail || "Confirming the model before images are submitted."}</small>
              </div>
            </div>

            <button className="button primary full" type="button" disabled={busy || sources[0]?.displayOnly || providerStatus?.ready === false} onClick={createPack}>
              {busy ? "Reading your sources…" : "Create learning pack"}
            </button>
            {sources[0]?.displayOnly && <button className="button full" type="button" onClick={() => fileInput.current?.click()}>Replace sample with my images</button>}
            {message && <p className="status-message" role="status">{message}</p>}
            <p className="privacy-note">{providerStatus?.local
              ? "Local mode keeps image analysis on this PC through Ollama. Images are not uploaded to OpenAI."
              : "Images stay in this browser until you create a pack. Then they are sent to the configured AI provider."}</p>
          </aside>

          <section className="output-panel" aria-live="polite">
            <div className="step-label"><b>02</b><span>Review and shape the result</span></div>
            {!pack ? (
              <div className="waiting-state">
                <MothMark compact />
                <h3>Your learning pack will land here.</h3>
                <p>You will get multiple ways to work with the same source material. Every useful claim stays connected to an image ID.</p>
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
                <div className="tab-list" role="tablist" aria-label="Learning pack views">
                  {outputTabs.map(([key, label]) => <button key={key} role="tab" aria-selected={activeTab === key} type="button" onClick={() => setActiveTab(key)}>{label}</button>)}
                </div>

                <div className="tab-content">
                  {activeTab === "guide" && <div className="content-stack"><h4>Core ideas</h4>{pack.concepts.map((item, index) => <article className="learning-card" key={`${item.term}-${index}`}><div><span>{String(index + 1).padStart(2, "0")}</span><h5>{item.term}</h5><SourcePills ids={item.sourceIds} /></div><p>{item.explanation}</p></article>)}<h4>Review plan</h4><ol className="review-list">{pack.reviewPlan.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></div>}
                  {activeTab === "trail" && <div className="content-stack trail-view"><div className="trail-intro"><div><p className="eyebrow"><span /> Evidence map</p><h4>Follow the ideas. Notice the dark.</h4></div><p>Glow points are supported ideas. Threads show source-backed connections. Blind spots stay visible when the screenshots cannot finish the explanation.</p></div><div className="glow-grid">{pack.trailMap.glowPoints.map((point, index) => <article className="glow-point" key={`${point.id}-${index}`}><div><b>{point.id}</b><SourcePills ids={point.sourceIds} /></div><h5>{point.label}</h5><p>{point.whyItMatters}</p></article>)}</div><h4>Threads</h4><div className="thread-list">{pack.trailMap.threads.map((thread, index) => <article key={`${thread.fromId}-${thread.toId}-${index}`}><b>{thread.fromId}</b><span aria-hidden="true">→</span><b>{thread.toId}</b><p>{thread.relationship}</p></article>)}</div><h4>Blind spots</h4><div className="blind-list">{pack.trailMap.blindSpots.length ? pack.trailMap.blindSpots.map((spot, index) => <article key={`${spot.question}-${index}`}><div><span aria-hidden="true">?</span><h5>{spot.question}</h5><SourcePills ids={spot.sourceIds} /></div><p>{spot.reason}</p></article>) : <p className="helper-copy">No source gap was identified. Verify the full pack before relying on it.</p>}</div><h4>Recall loop</h4><ol className="review-list">{pack.trailMap.recallLoop.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></div>}
                  {activeTab === "report" && <div className="content-stack"><h4>Structured report</h4>{pack.reportSections.map((item, index) => <article className="report-section" key={`${item.heading}-${index}`}><div><h5>{item.heading}</h5><SourcePills ids={item.sourceIds} /></div><p>{item.body}</p></article>)}</div>}
                  {activeTab === "practice" && <div className="content-stack"><h4>Flashcards</h4><div className="flashcard-grid">{pack.flashcards.map((item, index) => <details key={`${item.front}-${index}`}><summary>{item.front}</summary><p>{item.back}</p><SourcePills ids={item.sourceIds} /></details>)}</div><h4>Practice questions</h4>{pack.practice.map((item, index) => <details className="practice-item" key={`${item.question}-${index}`}><summary><span>{index + 1}</span>{item.question}</summary><p><b>Hint:</b> {item.hint}</p><p><b>Answer:</b> {item.answer}</p><SourcePills ids={item.sourceIds} /></details>)}</div>}
                  {activeTab === "collage" && <div className="content-stack"><div className="collage-heading"><div><h4>{pack.collage.title}</h4><p>{pack.collage.caption}</p></div><button type="button" onClick={exportCollage}>Download PNG ↓</button></div><div className="collage-board"><section className="collage-sources" aria-label="Source material"><p>Source material · {sources.length} {sources.length === 1 ? "item" : "items"}</p><div className="collage-grid">{sources.map((source, index) => <figure key={source.id}><NextImage src={source.dataUrl} alt={`Source S${index + 1}: ${source.name}`} width={800} height={600} unoptimized /><figcaption><b>S{index + 1}</b><span>{source.name}</span></figcaption></figure>)}</div></section><aside className="collage-review"><h5>Quick review</h5><p>Explain each point in your own words, then check it against the source.</p><ul className="callout-list">{pack.collage.callouts.map((item, index) => <li key={`${item.text}-${index}`}><SourcePills ids={item.sourceIds} /><span>{item.text}</span></li>)}</ul></aside></div></div>}
                  {activeTab === "sources" && <div className="content-stack"><h4>OCR and source check</h4><p className="helper-copy">Low confidence and unclear text are review prompts, not automatic corrections.</p>{pack.sources.map((source, index) => <article className="source-extract" key={`${source.sourceId}-${index}`}><div><h5>{source.sourceId}</h5><span className={`confidence ${source.confidence}`}>{source.confidence} confidence</span></div><p>{source.extractedText}</p>{source.unclearText.length > 0 && <div className="unclear"><b>Unclear in the image</b>{source.unclearText.map((item, itemIndex) => <span key={`${item}-${itemIndex}`}>{item}</span>)}</div>}</article>)}{pack.cautions.length > 0 && <div className="caution-box"><b>Check before relying on this</b>{pack.cautions.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}</div>}</div>}
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

      <footer><a className="brand" href="#top"><MothMark compact /><span><strong>Bookmoth</strong><small>follow the light of a useful idea</small></span></a><p>Open-source learning software. Verify AI output against your sources.</p></footer>
    </main>
  );
}
