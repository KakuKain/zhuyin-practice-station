/** A peek lasts only as long as its originating pointer/key is held. */
export function createPositionHold(onChange: (held: boolean) => void) {
  let pointer: number | null = null;
  let key: string | null = null;
  let held = false;
  const update = (value: boolean) => {
    if (held === value) return;
    held = value;
    onChange(value);
  };
  const cancel = () => {
    pointer = null;
    key = null;
    update(false);
  };
  return {
    pointerDown(id: number) {
      if (held) return false;
      pointer = id;
      update(true);
      return true;
    },
    pointerUp(id: number) {
      if (pointer === id) cancel();
    },
    keyDown(value: string) {
      if (value === "Escape") {
        cancel();
        return true;
      }
      if (value !== " " && value !== "Enter") return false;
      if (!held) {
        key = value;
        update(true);
      }
      return true;
    },
    keyUp(value: string) {
      if (key !== value) return false;
      cancel();
      return true;
    },
    cancel,
  };
}
