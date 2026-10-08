import { createContext, useContext, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

const MessageRoot = createContext<HTMLDivElement | null>(null);

export function ShowMsgProvider({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return (
    <MessageRoot.Provider value={root}>
      {children}
      <div ref={setRoot} className="showmsg-stack" aria-label="操作訊息" />
    </MessageRoot.Provider>
  );
}

export function ShowMsg(props: {
  message: string;
  onClose?: () => void;
  error?: boolean;
  children?: ReactNode;
}) {
  return props.message ? <Message key={props.message} {...props} /> : null;
}

function Message({
  message,
  onClose,
  error,
  children,
}: {
  message: string;
  onClose?: () => void;
  error?: boolean;
  children?: ReactNode;
}) {
  const root = useContext(MessageRoot);
  const [closed, setClosed] = useState(false);
  if (!root || closed) return null;
  return createPortal(
    <div className={`showmsg${error ? " is-error" : ""}`} role={error ? "alert" : "status"}>
      <div>
        <p>{message}</p>
        {children}
      </div>
      <button
        type="button"
        aria-label="關閉提示"
        onClick={() => {
          setClosed(true);
          onClose?.();
        }}
      >
        <X size={20} aria-hidden="true" />
      </button>
    </div>,
    root,
  );
}
