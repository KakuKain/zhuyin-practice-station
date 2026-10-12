import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ChildAvatar, childLabel } from "../../components/ChildPicker";
import { builtinMaterialId, builtinMaterialName, type MaterialsState } from "../courses/materials";
import { withChildMaterial } from "../courses/useMaterials";
import {
  addChild,
  childAvatars,
  maxChildNameLength,
  maxChildren,
  removeChild,
  updateChild,
  useChildProfiles,
  type ChildAvatar as Avatar,
  type ChildProfile,
} from "../../lib/storage/child-profiles";

const avatarNames: Record<Avatar, string> = {
  cat: "貓",
  dog: "狗",
  rabbit: "兔子",
  bear: "熊",
  panda: "貓熊",
  fox: "狐狸",
  frog: "青蛙",
  tiger: "老虎",
  monkey: "猴子",
  penguin: "企鵝",
  chick: "小雞",
  koala: "無尾熊",
};

function AvatarChoices({ value, onChange }: { value: Avatar; onChange: (avatar: Avatar) => void }) {
  return (
    <div className="child-avatar-choices" role="radiogroup" aria-label="頭像">
      {(Object.keys(childAvatars) as Avatar[]).map((avatar) => (
        <button
          type="button"
          key={avatar}
          role="radio"
          aria-checked={avatar === value}
          aria-label={avatarNames[avatar]}
          onClick={() => onChange(avatar)}
        >
          {childAvatars[avatar]}
        </button>
      ))}
    </div>
  );
}

function MaterialChoice({
  materials,
  value,
  onChange,
  label,
}: {
  materials: MaterialsState;
  value: string;
  onChange: (materialId: string) => void;
  label: string;
}) {
  return (
    <label className="child-material">
      <span>教材</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value={builtinMaterialId}>{builtinMaterialName}</option>
        {materials.materials
          .filter((material) => !material.archived)
          .map((material) => (
            <option key={material.id} value={material.id}>
              {material.name}
            </option>
          ))}
      </select>
    </label>
  );
}

function ChildRow({
  child,
  canRemove,
  materials,
  familyMaterialId,
}: {
  child: ChildProfile;
  canRemove: boolean;
  materials: MaterialsState;
  familyMaterialId: string;
}) {
  const profiles = useChildProfiles();
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const label = childLabel(child, profiles);
  return (
    <li className="child-row">
      <button
        type="button"
        className="child-row-avatar"
        aria-label={`更換${label}的頭像`}
        aria-expanded={editingAvatar}
        onClick={() => setEditingAvatar((open) => !open)}
      >
        <ChildAvatar child={child} />
      </button>
      <label className="child-row-name">
        <span className="visually-hidden">名字</span>
        <input
          defaultValue={child.name}
          maxLength={maxChildNameLength}
          placeholder={label}
          onBlur={(event) => updateChild(child.id, { name: event.currentTarget.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </label>
      {child.id === profiles.activeId && <span className="child-row-current">正在練習</span>}
      {canRemove && (
        <button
          type="button"
          className="child-row-remove"
          aria-label={`刪除${label}`}
          onClick={() => setConfirmRemove(true)}
        >
          <Trash size={20} aria-hidden="true" />
        </button>
      )}
      <MaterialChoice
        materials={materials}
        label={`${label}的教材`}
        value={
          withChildMaterial(
            { ...materials, activeId: familyMaterialId },
            child.id === profiles.activeId ? materials.activeId : child.materialId,
          ).activeId
        }
        onChange={(materialId) => updateChild(child.id, { materialId })}
      />
      {editingAvatar && (
        <AvatarChoices
          value={child.avatar}
          onChange={(avatar) => {
            updateChild(child.id, { avatar });
            setEditingAvatar(false);
          }}
        />
      )}
      {confirmRemove && (
        <ConfirmDialog
          id={`remove-child-${child.id}`}
          eyebrow="刪除孩子"
          title={`刪除「${label}」的紀錄？`}
          primaryLabel="刪除"
          onPrimary={() => {
            setConfirmRemove(false);
            removeChild(child.id);
          }}
          secondaryLabel="取消"
          onSecondary={() => setConfirmRemove(false)}
        >
          {label}
          的待補強、收藏、默寫草稿、聽寫進度和畫板都會刪除，無法復原。需要的話，請先到「裝置備份」下載備份。
        </ConfirmDialog>
      )}
    </li>
  );
}

export function ChildrenPanel({
  materials,
  familyMaterialId,
}: {
  materials: MaterialsState;
  familyMaterialId: string;
}) {
  const profiles = useChildProfiles();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("dog");
  const [materialId, setMaterialId] = useState(materials.activeId);
  const [notice, setNotice] = useState("");
  const full = profiles.children.length >= maxChildren;
  return (
    <div className="more-detail-content children-panel">
      <h1>孩子</h1>
      <p className="more-detail-intro">
        每個孩子可以選自己的教材，也有自己的待補強、收藏、默寫草稿、聽寫進度和畫板；家長建立的教材、聽寫設定和自訂讀音全家共用。有兩個以上的孩子時，打開
        App 會先問「現在是誰在練習？」。資料只存在這台裝置，不需要登入。
      </p>
      <ul className="child-list">
        {profiles.children.map((child) => (
          <ChildRow
            key={child.id}
            child={child}
            canRemove={profiles.children.length > 1}
            materials={materials}
            familyMaterialId={familyMaterialId}
          />
        ))}
      </ul>
      {profiles.children.length === 1 && !profiles.children[0].name && (
        <p className="children-hint">
          目前的練習紀錄屬於「孩子 1」。新增第二個孩子之前，可以先幫他取名字。
        </p>
      )}
      <form
        className="child-add"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || full) return;
          addChild(name, avatar, materialId);
          setNotice(`已新增「${name.trim()}」。下次打開 App 時可以選擇是誰在練習。`);
          setName("");
        }}
      >
        <h2>新增孩子</h2>
        <label>
          <span>名字或暱稱</span>
          <input
            value={name}
            maxLength={maxChildNameLength}
            placeholder="例如：哥哥、小美"
            onChange={(event) => setName(event.currentTarget.value)}
            disabled={full}
          />
        </label>
        <AvatarChoices value={avatar} onChange={setAvatar} />
        <MaterialChoice
          materials={materials}
          label="新孩子的教材"
          value={materialId}
          onChange={setMaterialId}
        />
        <button type="submit" className="primary-button" disabled={!name.trim() || full}>
          <Plus size={20} weight="bold" aria-hidden="true" />
          新增
        </button>
        {full && <p className="children-hint">最多 {maxChildren} 位孩子。</p>}
        <p role="status" className="children-hint">
          {notice}
        </p>
      </form>
    </div>
  );
}
