"use client";
import { useState } from "react";
import type { Material } from "../courses/materials";
export function MaterialMetadataEditor({
  material,
  save,
}: {
  material: Material;
  save: (patch: Pick<Material, "name" | "publisher" | "grade" | "semester">) => void;
}) {
  const [name, setName] = useState(material.name);
  const [publisher, setPublisher] = useState(material.publisher);
  const [grade, setGrade] = useState(material.grade);
  const [semester, setSemester] = useState(material.semester);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save({ name, publisher, grade, semester });
      }}
    >
      <h2>編輯教材資料</h2>
      <label className="material-field">
        教材名稱
        <input
          required
          maxLength={60}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="material-field">
        出版社／版本
        <input
          maxLength={60}
          value={publisher}
          onChange={(event) => setPublisher(event.target.value)}
        />
      </label>
      <label className="material-field">
        年級
        <input
          maxLength={60}
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          placeholder="例如：一年級"
        />
      </label>
      <label className="material-field">
        學期
        <input
          maxLength={60}
          value={semester}
          onChange={(event) => setSemester(event.target.value)}
          placeholder="例如：上學期"
        />
      </label>
      <button className="material-primary" type="submit">
        儲存教材資料
      </button>
    </form>
  );
}
