import { MaterialManager } from "./MaterialManager";
import { MaterialMetadataEditor } from "./MaterialMetadataEditor";
import { updateMaterial, replaceLesson } from "../courses/material-actions";
import { ShowMsg } from "../../components/ShowMsg";
import { HeaderBack } from "../../components/AppChrome";
import { useRef, useState } from "react";
import {
  BookOpenText,
  DownloadSimple,
  Plus,
  SpeakerHigh,
  UploadSimple,
} from "@phosphor-icons/react";
import type { AppController } from "../usePracticeApp";
import {
  appendImportedMaterials,
  builtinMaterialId,
  builtinMaterialName,
  parseMaterialFile,
  parseWordList,
  rowsToTerms,
  serializeMaterialFile,
  type ImportRow,
  type Material,
  type CustomLesson,
  type MaterialsState,
} from "../courses/materials";

type Props = {
  app: Pick<
    AppController,
    | "materialsState"
    | "setMaterialsState"
    | "materialsStorageError"
    | "catalog"
    | "setView"
    | "setMorePanel"
    | "speak"
    | "stopPlayback"
    | "audioError"
    | "audioLoading"
  >;
};
export function MaterialsPanel({ app }: Props) {
  const { materialsState: state, setMaterialsState: setState } = app;
  const [stage, setStage] = useState<"list" | "paste" | "review" | "file" | "metadata">("list");
  const [editingLesson, setEditingLesson] = useState<number | null>(null);
  const [noticeFailed, setNoticeFailed] = useState(false);
  const [targetId, setTargetId] = useState("new");
  const [name, setName] = useState("我的題庫");
  const [title, setTitle] = useState("本週聽寫");
  const [publisher, setPublisher] = useState("");
  const [grade, setGrade] = useState("");
  const [semester, setSemester] = useState("");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileMaterials, setFileMaterials] = useState<Material[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const active = state.materials.find((item) => item.id === state.activeId && !item.archived);
  const report = (message: string, saved: boolean) => {
    setNoticeFailed(!saved);
    setNotice(
      saved
        ? `${message}，已儲存在這台裝置。`
        : `${message}；僅本次頁面可用，尚未儲存。請先匯出題庫備份。`,
    );
  };
  const change = (action: (current: MaterialsState) => MaterialsState, message: string) => {
    try {
      report(message, setState(action));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "無法修改教材。");
    }
  };
  const editLesson = (lesson: CustomLesson) => {
    if (!active) return;
    setEditingLesson(lesson.index);
    setTargetId(active.id);
    setTitle(lesson.title);
    setText(lesson.terms.map((term) => `${term.text} ${term.syllables.join(" ")}`).join("\n"));
    setRows([]);
    setNotice("");
    setError("");
    setStage("paste");
  };
  const back = () => {
    app.stopPlayback();
    setError("");
    setStage("list");
  };
  const saveWords = () => {
    try {
      const terms = rowsToTerms(rows);
      if (!title.trim()) throw new Error("請填寫課次名稱。");
      if (targetId === "new" && !name.trim()) throw new Error("請填寫教材名稱。");
      let revised = false;
      const saved = setState((current) => {
        if (editingLesson !== null) {
          const result = replaceLesson(current, targetId, editingLesson, {
            title: title.trim(),
            terms,
          });
          revised = result.contentChanged;
          return result.state;
        }
        const existing = current.materials.find(
          (material) => material.id === targetId && !material.archived,
        );
        if (targetId !== "new" && !existing) throw new Error("這組教材已不存在，請重新選擇。");
        if (existing && existing.lessons.length >= 50)
          throw new Error("每組教材最多 50 個課次版本，請另建教材。");
        if (!existing && current.materials.length >= 30) throw new Error("最多可儲存 30 組教材。");
        const nextIndex = current.nextIndex;
        const lesson = { index: nextIndex, title: title.trim(), terms };
        const id = existing?.id ?? crypto.randomUUID();
        return {
          ...current,
          activeId: id,
          nextIndex: nextIndex + 1,
          materials: existing
            ? current.materials.map((material) =>
                material.id === id
                  ? { ...material, lessons: [...material.lessons, lesson] }
                  : material,
              )
            : [
                ...current.materials,
                {
                  id,
                  name: name.trim(),
                  publisher: publisher.trim(),
                  grade,
                  semester,
                  lessons: [lesson],
                },
              ],
        };
      });
      app.stopPlayback();
      setStage("list");
      setText("");
      setRows([]);
      setError("");
      report(
        editingLesson === null
          ? `已加入「${title.trim()}」`
          : revised
            ? "已儲存新版課次，舊版及其練習紀錄仍保留"
            : "已更新課次名稱",
        saved,
      );
      setEditingLesson(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "無法儲存，請檢查內容。");
    }
  };
  const saveFile = () => {
    try {
      const saved = setState((current) => appendImportedMaterials(current, fileMaterials));
      setStage("list");
      setFileMaterials([]);
      report("題庫檔已匯入，首頁已切換到匯入的教材", saved);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "無法匯入。");
    }
  };
  return (
    <div className="more-detail-content materials-panel">
      <HeaderBack
        label={stage === "list" ? "更多" : "返回教材列表"}
        onBack={
          stage === "list"
            ? () => {
                app.stopPlayback();
                app.setMorePanel("home");
              }
            : back
        }
      />
      <h1>教材與題庫</h1>
      <p className="more-detail-intro">選好教材，首頁就會顯示這組課次。不需要登入。</p>
      <div className="material-device-note">
        <strong>題庫只存在這台裝置</strong>
        <p>換裝置或清除瀏覽器資料前，請先匯出自訂題庫。題庫檔不包含錄音與練習紀錄。</p>
      </div>
      <ShowMsg
        error
        message={
          app.materialsStorageError && !notice
            ? "這台裝置目前無法讀取或儲存教材；內容仍可在本次頁面使用，請匯出題庫備份。"
            : ""
        }
      />
      <ShowMsg error message={error} onClose={() => setError("")} />
      <ShowMsg error={noticeFailed} message={notice} onClose={() => setNotice("")} />
      {stage === "list" ? (
        <>
          <label className="material-field">
            目前教材
            <select
              value={state.activeId}
              onChange={(event) => {
                const activeId = event.target.value;
                change((current) => ({ ...current, activeId }), "已更換教材，首頁課次已更新");
              }}
            >
              <option value={builtinMaterialId}>{builtinMaterialName}（9 課）</option>
              {state.materials
                .filter((material) => !material.archived)
                .map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}（{material.lessons.filter((lesson) => !lesson.archived).length}{" "}
                    課）
                  </option>
                ))}
            </select>
          </label>
          <div className="material-course-summary">
            <BookOpenText size={26} aria-hidden="true" />
            <div>
              <strong>{active?.name ?? builtinMaterialName}</strong>
              <p>
                {active
                  ? [active.publisher, active.grade, active.semester].filter(Boolean).join("・") ||
                    "自訂字詞教材"
                  : "目前收錄第一至第九課"}
              </p>
            </div>
          </div>
          <MaterialManager
            state={state}
            active={active}
            change={change}
            editMaterial={() => {
              setError("");
              setNotice("");
              setStage("metadata");
            }}
            editLesson={editLesson}
          />
          <button type="button" className="material-primary" onClick={() => app.setView("courses")}>
            查看首頁課次
          </button>
          <h2>加入自己的內容</h2>
          <p className="more-detail-footnote">
            這裡匯入的是「練習字詞清單」，目前不支援整篇課文、課本照片或
            PDF。請先挑出這週要練的生字、語詞。
          </p>
          <div className="material-actions">
            <button
              type="button"
              onClick={() => {
                setEditingLesson(null);
                setTitle("本週聽寫");
                setText("");
                setRows([]);
                setTargetId(active?.id ?? "new");
                setNotice("");
                setError("");
                setStage("paste");
              }}
            >
              <Plus size={20} aria-hidden="true" />
              貼上字詞建立課次
            </button>
            <button type="button" onClick={() => inputRef.current?.click()}>
              <UploadSimple size={20} aria-hidden="true" />
              匯入題庫檔
            </button>
            {active && (
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(serializeMaterialFile(active))}`}
                download={`${active.name.replace(/[\\/:*?"<>|]/g, "_")}-題庫.json`}
              >
                <DownloadSimple size={20} aria-hidden="true" />
                匯出目前題庫
              </a>
            )}
          </div>
          <input
            ref={inputRef}
            className="visually-hidden"
            type="file"
            accept=".json,application/json"
            aria-label="選擇題庫 JSON 檔"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                if (file.size > 2_000_000) throw new Error("題庫檔太大，請選擇 2 MB 以下的檔案。");
                const materials = parseMaterialFile(await file.text());
                setFileMaterials(materials);
                setError("");
                setNotice("");
                setStage("file");
              } catch (cause) {
                setError(cause instanceof Error ? cause.message : "檔案無法讀取。");
              }
            }}
          />
        </>
      ) : (
        <>
          {stage !== "metadata" && (
            <ol className="material-progress" aria-label="匯入步驟">
              <li aria-current={stage === "paste" ? "step" : undefined}>1 貼上字詞</li>
              <li aria-current={stage === "review" || stage === "file" ? "step" : undefined}>
                2 確認內容
              </li>
              <li>3 儲存</li>
            </ol>
          )}
          {stage === "metadata" && active && (
            <MaterialMetadataEditor
              key={active.id}
              material={active}
              save={(patch) => {
                try {
                  const saved = setState((current) => updateMaterial(current, active.id, patch));
                  report("已更新教材資料", saved);
                  setError("");
                  setStage("list");
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "無法修改。");
                }
              }}
            />
          )}
          {stage === "paste" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  setRows(parseWordList(text));
                  setError("");
                  setStage("review");
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : "無法解析。");
                }
              }}
            >
              {editingLesson === null && (
                <label className="material-field">
                  加入哪一組教材
                  <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                    <option value="new">建立新的教材／題庫</option>
                    {state.materials
                      .filter((material) => !material.archived)
                      .map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {editingLesson !== null && <p>修改字詞或注音會建立新版，舊版的筆跡與收藏會保留。</p>}
              {targetId === "new" && (
                <>
                  <label className="material-field">
                    教材名稱
                    <input
                      maxLength={60}
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="例如：南一二年級，或我的題庫"
                    />
                  </label>
                  <details className="material-metadata">
                    <summary>版本與年級（選填）</summary>
                    <label className="material-field">
                      出版社／版本
                      <input
                        maxLength={60}
                        value={publisher}
                        onChange={(event) => setPublisher(event.target.value)}
                        placeholder="例如：康軒、南一、翰林"
                      />
                    </label>
                    <label className="material-field">
                      年級
                      <select value={grade} onChange={(event) => setGrade(event.target.value)}>
                        <option value="">不指定</option>
                        {["一年級", "二年級", "三年級", "四年級", "五年級", "六年級"].map(
                          (item) => (
                            <option key={item}>{item}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="material-field">
                      學期
                      <select
                        value={semester}
                        onChange={(event) => setSemester(event.target.value)}
                      >
                        <option value="">不指定</option>
                        <option>上學期</option>
                        <option>下學期</option>
                      </select>
                    </label>
                  </details>
                </>
              )}
              <label className="material-field">
                課次名稱
                <input
                  maxLength={60}
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="例如：第三課，或本週聽寫"
                />
              </label>
              <label className="material-field">
                生字／語詞清單
                <textarea
                  required
                  value={text}
                  maxLength={20000}
                  rows={6}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={"半\n飯 ㄈㄢˋ\n學校 ㄒㄩㄝˊ ㄒㄧㄠˋ"}
                />
              </label>
              <p className="more-detail-footnote">
                每行一個字詞，也可用頓號分隔。可附注音；一個國字對應一組注音，組與組之間留空白。這一步先貼字詞，完整課文請分成要練的語詞。
              </p>
              <button type="submit" className="material-primary">
                下一步：確認注音
              </button>
            </form>
          )}
          {stage === "review" && (
            <>
              <h2>{title} · 確認練習字詞</h2>
              <p className="more-detail-footnote">
                已知讀音會先帶入，其餘請補填。多音字、變調與輕聲請依課本核對；試聽可能使用裝置合成音，指定注音不保證改變合成發音，可到「自訂讀音」補錄音。
              </p>
              <div className="material-review-list">
                {rows.map((row, index) => (
                  <div className="material-review-row" key={index}>
                    <label className="material-include">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, included: event.target.checked } : item,
                            ),
                          )
                        }
                      />
                      納入
                    </label>
                    <label className="material-field">
                      字詞 {index + 1}
                      <input
                        value={row.text}
                        maxLength={8}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, text: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="material-field">
                      注音 {index + 1}
                      <input
                        value={row.reading}
                        placeholder="請填注音，每字以空白分隔"
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, reading: event.target.value } : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="material-preview"
                      disabled={app.audioLoading || !row.text}
                      onClick={() =>
                        app.speak(row.text, {
                          pronunciation: row.reading.trim().split(/\s+/).join("|"),
                        })
                      }
                    >
                      <SpeakerHigh size={18} aria-hidden="true" />
                      試聽 {row.text}
                    </button>
                  </div>
                ))}
              </div>
              {app.audioError && (
                <ShowMsg
                  error
                  message="無法試聽，請確認裝置音量與瀏覽器語音支援，或儲存後匯入自訂讀音。"
                />
              )}
              <p>{rows.filter((row) => row.included).length} 個字詞將加入這一課</p>
              <div className="material-actions">
                <button
                  type="button"
                  onClick={() => {
                    app.stopPlayback();
                    setStage("paste");
                    setError("");
                  }}
                >
                  返回修改清單
                </button>
                <button type="button" className="material-primary" onClick={saveWords}>
                  {editingLesson === null ? "確認並儲存題庫" : "確認儲存修改"}
                </button>
              </div>
            </>
          )}
          {stage === "file" && (
            <>
              <h2>確認匯入的教材</h2>
              <p>會新增一份題庫，不會覆蓋現有教材與練習紀錄。</p>
              {fileMaterials.map((material) => (
                <div className="material-file-preview" key={material.id}>
                  <strong>{material.name}</strong>
                  <ol>
                    {material.lessons.map((lesson) => (
                      <li key={lesson.index}>
                        {lesson.title} · {lesson.terms.length} 個字詞
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
              <button type="button" className="material-primary" onClick={saveFile}>
                確認匯入題庫
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
