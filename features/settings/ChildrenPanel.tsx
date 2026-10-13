import { useState } from "react";
import { BookOpenText, Plus, Trash } from "@phosphor-icons/react";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ChildAvatar, avatarImage, childLabel } from "../../components/ChildPicker";
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

/** The twelve watercolor animals, as pictures to tap. */
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
          <img src={avatarImage(avatar)} alt="" draggable={false} />
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
      <BookOpenText size={20} aria-hidden="true" />
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

/** One child: their picture (tap to change), name, material, and removing them. */
function ChildCard({
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
  const current = child.id === profiles.activeId;
  return (
    <li className={`child-card${current ? " is-current" : ""}`}>
      <button
        type="button"
        className="child-card-avatar"
        aria-label={`更換${label}的頭像`}
        aria-expanded={editingAvatar}
        onClick={() => setEditingAvatar((open) => !open)}
      >
        <ChildAvatar child={child} />
      </button>
      <div className="child-card-main">
        <input
          className="child-card-name"
          aria-label={`${label}的名字`}
          defaultValue={child.name}
          maxLength={maxChildNameLength}
          placeholder={label}
          onBlur={(event) => updateChild(child.id, { name: event.currentTarget.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        {current && <span className="child-card-badge">正在練習</span>}
        <MaterialChoice
          materials={materials}
          label={`${label}的教材`}
          value={
            withChildMaterial(
              { ...materials, activeId: familyMaterialId },
              current ? materials.activeId : child.materialId,
            ).activeId
          }
          onChange={(materialId) => updateChild(child.id, { materialId })}
        />
      </div>
      {canRemove && (
        <button
          type="button"
          className="child-card-remove"
          aria-label={`刪除${label}`}
          onClick={() => setConfirmRemove(true)}
        >
          <Trash size={20} aria-hidden="true" />
        </button>
      )}
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
          title={`刪除「${label}」？`}
          primaryLabel="刪除"
          onPrimary={() => {
            setConfirmRemove(false);
            removeChild(child.id);
          }}
          secondaryLabel="取消"
          onSecondary={() => setConfirmRemove(false)}
        >
          {label}的練習紀錄會一起刪除，無法復原。
        </ConfirmDialog>
      )}
    </li>
  );
}

/** A new child: a picture, a name and a material; nothing else to read. */
function AddChildCard({ materials, onDone }: { materials: MaterialsState; onDone: () => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<Avatar>("dog");
  const [materialId, setMaterialId] = useState(materials.activeId);
  return (
    <form
      className="child-card is-new"
      onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) return;
        addChild(name, avatar, materialId);
        onDone();
      }}
    >
      <img className="child-avatar" src={avatarImage(avatar)} alt="" />
      <div className="child-card-main">
        <input
          className="child-card-name"
          aria-label="新孩子的名字"
          value={name}
          maxLength={maxChildNameLength}
          placeholder="名字"
          autoFocus
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <MaterialChoice
          materials={materials}
          label="新孩子的教材"
          value={materialId}
          onChange={setMaterialId}
        />
      </div>
      <AvatarChoices value={avatar} onChange={setAvatar} />
      <div className="child-card-actions">
        <button type="button" className="secondary-button" onClick={onDone}>
          取消
        </button>
        <button type="submit" className="primary-button" disabled={!name.trim()}>
          新增
        </button>
      </div>
    </form>
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
  const [adding, setAdding] = useState(false);
  const full = profiles.children.length >= maxChildren;
  return (
    <div className="more-detail-content children-panel">
      <h1>孩子</h1>
      <ul className="child-cards">
        {profiles.children.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            canRemove={profiles.children.length > 1}
            materials={materials}
            familyMaterialId={familyMaterialId}
          />
        ))}
      </ul>
      {adding ? (
        <AddChildCard materials={materials} onDone={() => setAdding(false)} />
      ) : (
        !full && (
          <button type="button" className="child-card-add" onClick={() => setAdding(true)}>
            <Plus size={24} weight="bold" aria-hidden="true" />
            新增孩子
          </button>
        )
      )}
    </div>
  );
}
