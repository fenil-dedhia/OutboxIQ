// TEMPORARY §5.2 verification seam — REPLACED by the real §5.3 modal.
//
// §5.2 ("intercept the click, open OutboxIQ instead of Gmail") is only
// independently verifiable if the interception produces something visible.
// This is the minimal proof: a non-blocking, dismissible on-page banner that
// confirms OutboxIQ took over and native Gmail did NOT schedule.
//
// When §5.3 lands, the content script's onScheduleSend is repointed at the
// React modal mount and this file is deleted. Kept deliberately tiny and
// dependency-free so there is nothing to "migrate".

// No params: the placeholder doesn't read the compose context (§5.3 will). A
// zero-arg function is assignable to onScheduleSend's (ctx) => void type.
const HOST_ID = "outboxiq-schedule-placeholder";

export function openSchedulePlaceholder(): void {
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-label", "OutboxIQ Schedule Send");
  host.style.cssText =
    "position:fixed;z-index:2147483647;left:50%;top:24px;transform:translateX(-50%);" +
    "background:#202124;color:#fff;font:13px/1.5 'Google Sans',Roboto,Arial,sans-serif;" +
    "padding:14px 16px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.3);" +
    "max-width:420px;display:flex;gap:12px;align-items:flex-start;";

  const text = document.createElement("div");
  text.textContent =
    "OutboxIQ intercepted Schedule Send (§5.2). Gmail's native scheduling " +
    "did not run. The enhanced modal (§5.3) will render here next.";

  const close = document.createElement("button");
  close.textContent = "✕";
  close.setAttribute("aria-label", "Dismiss");
  close.style.cssText =
    "background:none;border:0;color:#fff;cursor:pointer;font-size:14px;" +
    "line-height:1;padding:2px;flex:0 0 auto;";
  const dismiss = (): void => host.remove();
  close.addEventListener("click", dismiss);
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") dismiss();
    },
    { once: true },
  );

  host.append(text, close);
  document.body.appendChild(host);
}
