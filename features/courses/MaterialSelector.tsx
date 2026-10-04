"use client";

import { useState } from "react";
import { ShowMsg } from "../../components/ShowMsg";
import type { AppController } from "../usePracticeApp";
import { builtinMaterialId, builtinMaterialName } from "./materials";

export function MaterialSelector({
  app,
}: {
  app: Pick<AppController, "materialsState" | "setMaterialsState">;
}) {
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  return (
    <>
      <select
        className="header-material-selector"
        aria-label="選擇教材"
        value={app.materialsState.activeId}
        onChange={(event) => {
          const activeId = event.target.value;
          const saved = app.setMaterialsState((current) => ({ ...current, activeId }));
          setFailed(!saved);
          setNotice(
            saved ? "已更換教材，首頁課次已更新。" : "已更換教材；僅本次頁面可用，尚未儲存。",
          );
        }}
      >
        <option value={builtinMaterialId}>{builtinMaterialName}</option>
        {app.materialsState.materials
          .filter((material) => !material.archived)
          .map((material) => (
            <option key={material.id} value={material.id}>
              {material.name}
            </option>
          ))}
      </select>
      <ShowMsg error={failed} message={notice} onClose={() => setNotice("")} />
    </>
  );
}
