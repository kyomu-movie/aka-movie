"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AnimationItem, DiagramStructure, MotionKind, ProjectRecord } from "@/lib/types";

type Project = ProjectRecord & { assets: { image?: string; video?: string } };
const motions: Array<{ value: MotionKind; label: string }> = [
  { value: "fade", label: "フェード" }, { value: "slide-left", label: "左から" }, { value: "slide-right", label: "右から" }, { value: "slide-up", label: "下から" }, { value: "slide-down", label: "上から" }
];

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "処理に失敗しました。");
  return data as T;
}

export default function Home() {
  const [script, setScript] = useState("");
  const [message, setMessage] = useState("");
  const [project, setProject] = useState<Project>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const structure = project?.structure as DiagramStructure | undefined;
  const animation = project?.animation ?? [];
  const canChat = project?.stage === "image_review" || project?.stage === "structure_review";
  const outputName = useMemo(() => project ? `${project.id}.mp4` : "yymmdd_01.mp4", [project]);

  async function run(task: () => Promise<Project>) {
    setBusy(true); setError("");
    try { setProject(await task()); } catch (cause) { setError(cause instanceof Error ? cause.message : "処理に失敗しました。"); }
    finally { setBusy(false); }
  }
  async function start() {
    await run(async () => {
      const created = await request<Project>("/api/projects", { method: "POST", body: JSON.stringify({ script }) });
      return request<Project>(`/api/projects/${created.id}/image`, { method: "POST", body: JSON.stringify({}) });
    });
  }
  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!project || !message.trim()) return;
    const text = message; setMessage("");
    await run(() => request<Project>(`/api/projects/${project.id}/chat`, { method: "POST", body: JSON.stringify({ feedback: text }) }));
  }
  function changeAnimation(index: number, patch: Partial<AnimationItem>) {
    if (!project?.animation) return;
    const next = project.animation.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
    setProject({ ...project, animation: next });
  }
  async function saveAnimation() {
    if (!project) return;
    await run(() => request<Project>(`/api/projects/${project.id}/animation`, { method: "PATCH", body: JSON.stringify({ animation: project.animation }) }));
  }
  async function render() { if (project) await run(() => request<Project>(`/api/projects/${project.id}/render`, { method: "POST", body: "{}" })); }
  async function markSuccess() { if (project) await run(() => request<Project>(`/api/projects/${project.id}/success`, { method: "POST", body: "{}" })); }

  return <main>
    <header className="hero">
      <div className="eyebrow">SCRIPT MOTION STUDIO</div>
      <h1>台本から、伝わる<span>ステップ動画</span>へ。</h1>
      <p>図解生成、構造確認、アニメーション編集、無音mp4書き出しをひとつのチャットで行います。</p>
    </header>
    <section className="workflow" aria-label="作業の流れ">
      <span className={!project ? "active" : "done"}>1 台本</span><i />
      <span className={project?.stage === "image_review" ? "active" : project ? "done" : ""}>2 図解確認</span><i />
      <span className={project?.stage === "structure_review" ? "active" : project?.stage === "complete" ? "done" : ""}>3 構造・動き</span><i />
      <span className={project?.stage === "rendering" || project?.stage === "complete" ? "active" : ""}>4 mp4</span>
    </section>
    <div className="workspace">
      <section className="card chat-card">
        <div className="card-heading"><div><p className="label">CHAT</p><h2>{project ? `案件 ${project.id}` : "台本を入力"}</h2></div>{project && <span className="status">{project.stage.replace("_", " ")}</span>}</div>
        {!project && <>
          <label className="field-label" htmlFor="script">動画にする台本</label>
          <textarea id="script" value={script} onChange={(event) => setScript(event.target.value)} placeholder="例：ゲームとパソコンの違いを、アイコンと矢印で3ステップに分けて説明する。" rows={10} />
          <button className="primary" disabled={busy || !script.trim()} onClick={start}>{busy ? "図解を生成中…" : "図解画像を生成"}</button>
          <p className="hint">参考画像16枚をスタイル参照として使い、GPT Image 2で図解を1枚作成します。</p>
        </>}
        {project && <>
          <div className="messages">{project.messages.map((item, index) => <div key={`${item.createdAt}-${index}`} className={`message ${item.role}`}><b>{item.role === "user" ? "あなた" : "アシスタント"}</b><p>{item.text}</p></div>)}</div>
          {canChat && <form className="message-form" onSubmit={sendChat}>
            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="OK または修正指示を入力" disabled={busy} />
            <button className="primary" disabled={busy || !message.trim()}>{busy ? "処理中…" : "送信"}</button>
          </form>}
          {project.stage === "draft" && <button className="primary" disabled={busy} onClick={() => run(() => request<Project>(`/api/projects/${project.id}/image`, { method: "POST", body: "{}" }))}>図解画像を生成</button>}
        </>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="card preview-card">
        <div className="card-heading"><div><p className="label">PREVIEW</p><h2>{project?.stage === "complete" ? "完成動画" : "図解プレビュー"}</h2></div>{project && <span className="format">1920 × 1080 / 30fps</span>}</div>
        <div className="preview-frame">
          {project?.assets.video ? <video src={project.assets.video} controls playsInline /> : project?.assets.image ? <img src={project.assets.image} alt="生成された図解" /> : <div className="empty"><strong>ここに図解と動画が表示されます</strong><span>白地・太字・黒アイコン・赤い見出しで生成します</span></div>}
        </div>
        {project?.assets.video && <div className="preview-actions"><a className="primary" href={project.assets.video} download={outputName}>mp4を保存</a><button className="secondary" disabled={busy || project.isSuccessExample} onClick={markSuccess}>{project.isSuccessExample ? "成功例として保存済み" : "成功例として保存"}</button></div>}
      </section>
    </div>

    {project && structure && <section className="card editor-card">
      <div className="card-heading"><div><p className="label">ANIMATION PLAN</p><h2>構造要素とアニメーション</h2></div><span className="format">要素を編集してから OK</span></div>
      <p className="structure-summary">{structure.summary || "抽出された要素を順に表示します。"}</p>
      <div className="animation-grid">
        {structure.elements.map((element, index) => {
          const animationIndex = animation.findIndex((candidate) => candidate.elementId === element.id);
          const item = animation[animationIndex] ?? animation[index];
          if (!item) return null;
          return <div className="animation-row" key={element.id}>
            <span className="order">{item.order}</span><div><b>{element.label}</b><small>{element.kind}</small></div>
            <label>動き<select value={item.motion} onChange={(event) => changeAnimation(animationIndex, { motion: event.target.value as MotionKind })}>{motions.map((motion) => <option key={motion.value} value={motion.value}>{motion.label}</option>)}</select></label>
            <label>秒数<input type="number" min="0.2" max="5" step="0.1" value={(item.durationMs / 1000).toFixed(1)} onChange={(event) => changeAnimation(animationIndex, { durationMs: Number(event.target.value) * 1000 })} /></label>
            <label>開始<input type="number" min="0" max="20" step="0.1" value={(item.delayMs / 1000).toFixed(1)} onChange={(event) => changeAnimation(animationIndex, { delayMs: Number(event.target.value) * 1000 })} /></label>
          </div>;
        })}
      </div>
      <div className="editor-actions"><button className="secondary" disabled={busy} onClick={saveAnimation}>編集を保存</button><button className="primary" disabled={busy} onClick={render}>{busy ? "mp4を書き出し中…" : "OK — mp4を書き出す"}</button></div>
    </section>}
  </main>;
}
