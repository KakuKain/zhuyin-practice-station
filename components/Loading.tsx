/**
 * 正在準備…: a screen or a list on its way. The audio overlay's three dots, larger, hop in turn;
 * `page` fills the screen for the full-screen views.
 */
export function Loading({
  label = "正在準備練習…",
  page = false,
}: {
  label?: string;
  page?: boolean;
}) {
  return (
    <p className={`feature-loading${page ? " is-page" : ""}`} role="status">
      <span className="loading-orbit is-large" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>{label}</span>
    </p>
  );
}
