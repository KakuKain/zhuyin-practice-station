"use client";
import { ShowMsg } from "../../components/ShowMsg";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  DownloadSimple,
  Microphone,
  SpeakerHigh,
  Stop,
  UploadSimple,
} from "@phosphor-icons/react";
import { AnswerDisplay } from "../../components/Zhuyin";
import {
  maxRecordingBytes,
  maxRecordingSeconds,
  recordingError,
  validateAudio,
  type CustomRecording,
} from "../../lib/audio/custom-audio";
import type { CustomAudioController } from "../../lib/audio/useCustomRecordings";
import {
  audioDuration,
  createRecordingSession,
  trimRecordingSilence,
} from "../../lib/audio/recording-session";
import type { ClipOptions } from "../../lib/audio/useAudioPlayer";
import { allSymbols, combinedRhymeGroups } from "../symbols/symbols-data";
import { priorityPrompts, type RecordingPrompt } from "./recording-data";

import { useCatalog } from "../courses/MaterialContext";
import { questionSeedsForLesson } from "../listening/listening-data";
import { recordingKey } from "../../lib/audio/custom-audio";

type Props = {
  audio: CustomAudioController;
  speak: (text: string, options?: ClipOptions) => void;
  stopPlayback: () => void;
  audioLoading: boolean;
  audioError: boolean;
};
type PreviewRecording = CustomRecording & { previewUrl: string };

export function CustomAudioPanel(props: Props) {
  const catalog = useCatalog();
  const recordingLessons = catalog.map((lesson) => ({
    label: `${lesson.materialName} · ${lesson.listeningOnly ? `${lesson.title}（${lesson.reviewRange}）` : `第${lesson.number}課 · ${lesson.title}`}`,
    prompts: [
      ...questionSeedsForLesson(lesson.index, catalog).characters,
      ...questionSeedsForLesson(lesson.index, catalog).words,
    ].map((seed) => ({
      text: seed.audioText,
      pronunciation: seed.answer,
      category: seed.category as "characters" | "words",
      key: recordingKey(seed.audioText, seed.answer),
    })),
  }));
  const rhymePrompts = combinedRhymeGroups
    .flatMap((group) => group.cells)
    .map((text) => ({
      text,
      pronunciation: text,
      category: "characters" as const,
      key: recordingKey(text, text),
    }));
  const [tab, setTab] = useState("symbols");
  const [lessonIndex, setLessonIndex] = useState(-1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RecordingPrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const symbols = allSymbols.map((text) => ({
    text,
    pronunciation: text,
    category: "characters" as const,
    key: recordingKey(text, text),
  }));
  const coursePrompts =
    lessonIndex < 0
      ? [...priorityPrompts, ...recordingLessons.flatMap((lesson) => lesson.prompts)]
      : recordingLessons[lessonIndex].prompts;
  const prompts = Array.from(
    new Map(
      (tab === "symbols" ? symbols : tab === "rhymes" ? rhymePrompts : coursePrompts).map(
        (item) => [item.key, item],
      ),
    ).values(),
  ).filter((item) => !search || `${item.text}${item.pronunciation}`.includes(search));
  const close = () => {
    if (busy) return;
    dialog.current?.close();
    setSelected(null);
    props.stopPlayback();
  };
  return (
    <div className="more-detail-content custom-audio-panel">
      <h1>自訂讀音</h1>
      <p className="more-detail-intro">點選讀音，即可試聽或重新錄製。</p>
      <div className="recording-library-tabs" role="tablist" aria-label="讀音分類">
        {[
          ["symbols", "注音符號"],
          ["rhymes", "結合韻"],
          ["courses", "生字與語詞"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id);
              setSearch("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="custom-audio-picker">
        <label>
          搜尋讀音
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="輸入字詞或注音"
          />
        </label>
        {tab === "courses" && (
          <label>
            課程
            <select
              value={lessonIndex}
              onChange={(event) => setLessonIndex(Number(event.target.value))}
            >
              <option value={-1}>所有課程</option>
              {recordingLessons.map((lesson, index) => (
                <option key={index} value={index}>
                  {lesson.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="recording-library-grid">
        {prompts.map((item) => {
          const recorded = props.audio.recordings.some((recording) => recording.key === item.key);
          return (
            <div className="recording-library-card" key={item.key}>
              <button
                type="button"
                className="recording-library-open"
                onClick={() => {
                  setSelected(item);
                  dialog.current?.showModal();
                }}
              >
                {tab === "courses" ? (
                  <>
                    <strong>{item.text}</strong>
                    <AnswerDisplay answer={item.pronunciation} />
                  </>
                ) : (
                  <AnswerDisplay answer={item.pronunciation} />
                )}
                <small>{recorded ? "已錄音" : "預設讀音"}</small>
              </button>
              <button
                type="button"
                className="recording-library-play"
                aria-label={`試聽 ${item.text}`}
                onClick={() =>
                  props.speak(item.text, {
                    pronunciation: item.pronunciation,
                    allowSynthesis: false,
                  })
                }
              >
                <SpeakerHigh size={22} />
              </button>
            </div>
          );
        })}
      </div>
      {!prompts.length && <p>沒有符合的讀音。</p>}
      <p className="more-detail-footnote">錄音儲存在目前瀏覽器。換裝置前，請下載錄音備份。</p>
      {props.audio.error && <ShowMsg error message={props.audio.error} />}
      <dialog
        ref={dialog}
        className="recording-library-dialog"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <button
          type="button"
          className="recording-library-close"
          disabled={busy}
          onClick={close}
          aria-label="關閉錄音"
        >
          <X size={24} />
        </button>
        {selected && (
          <RecordingEditor key={selected.key} {...props} prompt={selected} onBusy={setBusy} />
        )}
      </dialog>
    </div>
  );
}

function RecordingEditor({
  audio,
  prompt,
  speak,
  stopPlayback,
  audioLoading,
  audioError,
  onBusy,
}: Props & {
  prompt: RecordingPrompt;
  onBusy: (busy: boolean) => void;
}) {
  const [status, setStatus] = useState<"idle" | "waiting" | "recording" | "processing" | "saving">(
    "idle",
  );
  const [seconds, setSeconds] = useState(0);
  const [candidate, setCandidate] = useState<PreviewRecording | null>(null);
  const [original, setOriginal] = useState<Blob | null>(null);
  const [saved, setSaved] = useState<PreviewRecording | null>(null);
  const [heard, setHeard] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteRequested, setDeleteRequested] = useState(false);
  const candidateAudio = useRef<HTMLAudioElement>(null);
  const alive = useRef(true);
  const importGeneration = useRef(0);
  const session = useRef<ReturnType<typeof createRecordingSession> | null>(null);
  const busy = status !== "idle";
  const getRecording = audio.get;
  const info = audio.recordings.find((item) => item.key === prompt.key);
  const candidateUrl = candidate?.previewUrl;
  const savedUrl = saved?.previewUrl;
  useEffect(
    () => () => {
      if (candidateUrl) URL.revokeObjectURL(candidateUrl);
    },
    [candidateUrl],
  );
  useEffect(
    () => () => {
      if (savedUrl) URL.revokeObjectURL(savedUrl);
    },
    [savedUrl],
  );

  useEffect(() => {
    onBusy(busy);
  }, [busy, onBusy]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      importGeneration.current += 1;
      session.current?.cancel();
      stopPlayback();
      onBusy(false);
    };
  }, [stopPlayback, onBusy]);
  useEffect(() => {
    if (status !== "recording") return;
    const started = Date.now();
    const timer = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - started) / 1000)),
      250,
    );
    return () => window.clearInterval(timer);
  }, [status]);
  useEffect(() => {
    let canceled = false;
    if (info)
      void getRecording(prompt.text, prompt.pronunciation)
        .then((recording) => {
          if (!canceled && recording)
            setSaved({ ...recording, previewUrl: URL.createObjectURL(recording.blob) });
        })
        .catch((cause) => {
          if (!canceled) setError(recordingError(cause));
        });
    return () => {
      canceled = true;
    };
  }, [info, getRecording, prompt.text, prompt.pronunciation]);

  const prepare = async (source: Blob, trim = true) => {
    let blob = source;
    const token = ++importGeneration.current;
    setStatus("processing");
    setError("");
    setMessage("");
    setHeard(false);
    setConfirmed(false);
    try {
      if (blob.size > maxRecordingBytes) throw new Error("音檔太大，請使用 2 MB 以下的檔案。");
      if (trim) {
        setOriginal(source);
        blob = await trimRecordingSilence(source);
      }
      const duration = await audioDuration(blob);
      validateAudio(blob, duration);
      if (!alive.current || token !== importGeneration.current) return;
      setCandidate({
        key: prompt.key,
        text: prompt.text,
        pronunciation: prompt.pronunciation,
        blob,
        mimeType: blob.type,
        duration,
        updatedAt: Date.now(),
        previewUrl: URL.createObjectURL(blob),
      });
      setMessage("請先完整試聽，再確認讀音是否正確。");
    } catch (cause) {
      if (alive.current && token === importGeneration.current) setError(recordingError(cause));
    } finally {
      if (alive.current && token === importGeneration.current) setStatus("idle");
    }
  };
  const record = () => {
    stopPlayback();
    candidateAudio.current?.pause();
    setError("");
    setMessage("");
    setDeleteRequested(false);
    session.current?.cancel();
    session.current = createRecordingSession({
      status: (next) => {
        if (next === "recording") setSeconds(0);
        setStatus(next);
      },
      ready: (blob) => {
        if (alive.current) void prepare(blob);
      },
      error: (cause) => {
        if (alive.current) {
          setError(recordingError(cause));
          setStatus("idle");
        }
      },
    });
    void session.current.start();
  };
  const save = async () => {
    if (!candidate || !heard || !confirmed) return;
    stopPlayback();
    candidateAudio.current?.pause();
    setStatus("saving");
    setError("");
    try {
      await audio.save({ ...candidate, updatedAt: Date.now() });
      if (!alive.current) return;
      setCandidate(null);
      setHeard(false);
      setConfirmed(false);
      setMessage("已儲存。相同字詞、相同注音的聽寫與短練習會播放這段錄音。");
    } catch (cause) {
      if (alive.current) setError(recordingError(cause));
    } finally {
      if (alive.current) setStatus("idle");
    }
  };
  const remove = async () => {
    stopPlayback();
    candidateAudio.current?.pause();
    setStatus("saving");
    setError("");
    try {
      await audio.remove(prompt.key);
      if (alive.current) {
        setSaved(null);
        setDeleteRequested(false);
        setMessage("已恢復原本讀音。其他字詞的錄音不受影響。");
      }
    } catch (cause) {
      if (alive.current) setError(recordingError(cause));
    } finally {
      if (alive.current) setStatus("idle");
    }
  };

  return (
    <section className="custom-audio-editor" aria-label={`${prompt.text}讀音設定`}>
      <div className="custom-audio-target">
        <span className={`custom-audio-badge ${info ? "is-recorded" : ""}`}>
          {audio.loading ? "讀取錄音中…" : info ? "已使用自訂錄音" : "目前使用預設讀音"}
        </span>
        <div
          className={`custom-audio-pronunciation ${prompt.category === "words" ? "is-word" : ""}`}
        >
          <strong>{prompt.text}</strong>
          <AnswerDisplay answer={prompt.pronunciation} />
        </div>
        <p>
          只唸「{prompt.text}」，不要唸注音拼法、字義或例句。
          {prompt.category === "words"
            ? "語詞請整個連貫唸完，不拆接單字音檔。"
            : "請留意聲母與聲調，保持自然速度。"}
        </p>
        <button
          type="button"
          className="custom-audio-secondary"
          disabled={busy || audioLoading || audio.loading}
          onClick={() => {
            candidateAudio.current?.pause();
            speak(prompt.text, { pronunciation: prompt.pronunciation, allowSynthesis: false });
          }}
        >
          <SpeakerHigh size={22} aria-hidden="true" />
          {audioLoading ? "讀音載入中…" : "試聽目前讀音"}
        </button>
        {audioError && <ShowMsg error message="讀音無法播放。請確認音量、音檔或網路後再試。" />}
      </div>
      <div className="custom-audio-capture">
        <h2>{info ? "替換這段錄音" : "錄製清楚的讀音"}</h2>
        <p>找安靜的地方，靠近麥克風；每段最多 {maxRecordingSeconds} 秒。</p>
        {status === "recording" ? (
          <button
            type="button"
            className="custom-audio-primary is-recording"
            onClick={() => session.current?.stop()}
          >
            <Stop size={23} weight="fill" aria-hidden="true" />
            停止錄音 · {seconds} 秒
          </button>
        ) : (
          <button
            type="button"
            className="custom-audio-primary"
            disabled={busy || audio.loading || !!audio.error}
            onClick={record}
          >
            <Microphone size={24} aria-hidden="true" />
            {status === "waiting"
              ? "等待麥克風權限…"
              : status === "processing"
                ? "處理音檔中…"
                : status === "saving"
                  ? "儲存中…"
                  : "開始錄音"}
          </button>
        )}
        {status === "waiting" && (
          <button
            type="button"
            className="custom-audio-secondary"
            onClick={() => {
              session.current?.cancel();
              setStatus("idle");
            }}
          >
            取消開啟麥克風
          </button>
        )}
        <label className="custom-audio-import">
          <UploadSimple size={21} aria-hidden="true" />
          或匯入自己的音檔
          <input
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg"
            disabled={busy || audio.loading || !!audio.error}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              stopPlayback();
              candidateAudio.current?.pause();
              const extension = file.name.split(".").pop()?.toLowerCase();
              const type = file.type.startsWith("audio/")
                ? file.type
                : ({
                    m4a: "audio/mp4",
                    mp3: "audio/mpeg",
                    wav: "audio/wav",
                    webm: "audio/webm",
                    ogg: "audio/ogg",
                  }[extension ?? ""] ?? "");
              void prepare(new Blob([file], { type }));
            }}
          />
        </label>
        <small>只在裝置內讀取，單檔上限 2 MB。</small>
      </div>
      {candidate && (
        <div className="custom-audio-candidate">
          <h2>確認新讀音</h2>
          <p>{candidate.duration.toFixed(1)} 秒 · 只修剪首尾空白，保留尾音與中間停頓。</p>
          {original && (
            <button
              type="button"
              className="custom-audio-secondary"
              disabled={busy}
              onClick={() => {
                candidateAudio.current?.pause();
                void prepare(original, false);
              }}
            >
              使用原始錄音
            </button>
          )}
          <audio
            ref={candidateAudio}
            controls
            src={candidateUrl}
            aria-label="試聽新錄音"
            preload="metadata"
            onPlay={stopPlayback}
            onEnded={() => setHeard(true)}
          />
          <label className="custom-audio-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={!heard || busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            我已試聽，確認聲母、韻母與聲調正確
          </label>
          {!heard && <p className="custom-audio-hint">先播放到結束，才能勾選確認。</p>}
          <button
            type="button"
            className="custom-audio-primary"
            disabled={busy || !heard || !confirmed}
            onClick={() => void save()}
          >
            <Check size={22} aria-hidden="true" />
            儲存並使用這段錄音
          </button>
          <button
            type="button"
            className="custom-audio-secondary"
            disabled={busy}
            onClick={() => {
              candidateAudio.current?.pause();
              setCandidate(null);
              setHeard(false);
              setConfirmed(false);
              setMessage("已放棄新錄音，原本讀音不變。");
            }}
          >
            放棄新錄音
          </button>
        </div>
      )}
      {saved && savedUrl && (
        <div className="custom-audio-saved">
          <p>裝置內錄音 · {saved.duration.toFixed(1)} 秒</p>
          <a
            className="custom-audio-secondary"
            href={savedUrl}
            download={`${saved.text}-${saved.pronunciation.replaceAll("|", "_")}.${saved.mimeType.includes("mp4") ? "m4a" : saved.mimeType.includes("mpeg") ? "mp3" : saved.mimeType.includes("ogg") ? "ogg" : saved.mimeType.includes("wav") ? "wav" : "webm"}`}
          >
            <DownloadSimple size={21} aria-hidden="true" />
            下載錄音備份
          </a>
          {!deleteRequested ? (
            <button
              type="button"
              className="custom-audio-text-button"
              disabled={busy}
              onClick={() => setDeleteRequested(true)}
            >
              恢復原本讀音
            </button>
          ) : (
            <div className="custom-audio-delete">
              <p>這段錄音將從裝置移除，請先下載備份。要恢復原本讀音嗎？</p>
              <button
                type="button"
                className="custom-audio-secondary"
                disabled={busy}
                onClick={() => setDeleteRequested(false)}
              >
                保留錄音
              </button>
              <button
                type="button"
                className="custom-audio-secondary"
                disabled={busy}
                onClick={() => void remove()}
              >
                確定恢復原本讀音
              </button>
            </div>
          )}
        </div>
      )}
      <ShowMsg error message={error} onClose={() => setError("")} />
      <ShowMsg message={message} onClose={() => setMessage("")} />
    </section>
  );
}
