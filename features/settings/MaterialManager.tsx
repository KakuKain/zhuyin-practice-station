"use client";
import type { CustomLesson, Material, MaterialsState } from "../courses/materials";
import {
  archiveLesson,
  archiveMaterial,
  moveLesson,
  moveMaterial,
} from "../courses/material-actions";

type Props = {
  state: MaterialsState;
  active?: Material;
  change: (action: (state: MaterialsState) => MaterialsState, message: string) => void;
  editMaterial: () => void;
  editLesson: (lesson: CustomLesson) => void;
};
export function MaterialManager({ state, active, change, editMaterial, editLesson }: Props) {
  const lessons = active?.lessons.filter((lesson) => !lesson.archived) ?? [];
  const materials = state.materials.filter((material) => !material.archived);
  const position = materials.findIndex((material) => material.id === active?.id);
  return (
    <>
      {active && (
        <section className="material-management" aria-label="管理目前教材">
          <div className="material-management-actions">
            <button type="button" onClick={editMaterial}>
              編輯教材資料
            </button>
            <button
              type="button"
              disabled={position <= 0}
              aria-label={`上移教材 ${active.name}`}
              onClick={() =>
                change((current) => moveMaterial(current, active.id, -1), "已調整教材順序")
              }
            >
              教材上移
            </button>
            <button
              type="button"
              disabled={position === materials.length - 1}
              aria-label={`下移教材 ${active.name}`}
              onClick={() =>
                change((current) => moveMaterial(current, active.id, 1), "已調整教材順序")
              }
            >
              教材下移
            </button>
            <button
              type="button"
              onClick={() =>
                change(
                  (current) => archiveMaterial(current, active.id, true),
                  "已封存教材，可在封存區還原",
                )
              }
            >
              封存教材
            </button>
          </div>
          <p className="more-detail-footnote">封存會從首頁隱藏；字詞、舊版及練習紀錄仍保留。</p>
          <ol className="material-managed-lessons">
            {lessons.map((lesson, order) => (
              <li key={lesson.index}>
                <div>
                  <strong>{lesson.title}</strong>
                  <small>{lesson.terms.length} 個字詞</small>
                </div>
                <div className="material-management-actions">
                  <button
                    type="button"
                    onClick={() => editLesson(lesson)}
                    aria-label={`編輯課次 ${lesson.title}`}
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    disabled={order === 0}
                    aria-label={`上移課次 ${lesson.title}`}
                    onClick={() =>
                      change(
                        (current) => moveLesson(current, active.id, lesson.index, -1),
                        "已調整課次順序",
                      )
                    }
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={order === lessons.length - 1}
                    aria-label={`下移課次 ${lesson.title}`}
                    onClick={() =>
                      change(
                        (current) => moveLesson(current, active.id, lesson.index, 1),
                        "已調整課次順序",
                      )
                    }
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    aria-label={`封存課次 ${lesson.title}`}
                    onClick={() =>
                      change(
                        (current) => archiveLesson(current, active.id, lesson.index, true),
                        "已封存課次，可在封存區還原",
                      )
                    }
                  >
                    封存
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!lessons.length && <p>目前沒有開啟中的課次；可以新增字詞或還原封存課次。</p>}
        </section>
      )}
      {(state.materials.some((material) => material.archived) ||
        active?.lessons.some((lesson) => lesson.archived)) && (
        <details className="material-archive">
          <summary>封存教材與舊版課次</summary>
          <p className="more-detail-footnote">
            修改字詞後的舊版也保留在這裡。還原舊版會另外顯示一課。
          </p>
          {state.materials
            .filter((material) => material.archived)
            .map((material) => (
              <div className="material-archive-row" key={material.id}>
                <span>
                  {material.name} · {material.lessons.length} 個課次版本
                </span>
                <button
                  type="button"
                  aria-label={`還原教材 ${material.name}`}
                  onClick={() =>
                    change((current) => archiveMaterial(current, material.id, false), "已還原教材")
                  }
                >
                  還原教材
                </button>
              </div>
            ))}
          {active?.lessons
            .filter((lesson) => lesson.archived)
            .map((lesson) => (
              <div className="material-archive-row" key={lesson.index}>
                <span>
                  {lesson.title} · {lesson.terms.length} 個字詞
                </span>
                <button
                  type="button"
                  aria-label={`還原課次 ${lesson.title}`}
                  onClick={() =>
                    change(
                      (current) => archiveLesson(current, active.id, lesson.index, false),
                      "已還原課次",
                    )
                  }
                >
                  還原課次
                </button>
              </div>
            ))}
        </details>
      )}
    </>
  );
}
