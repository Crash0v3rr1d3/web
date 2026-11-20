// Helpers for rendering third-party data (feeds, leak sites, GitHub) without HTML injection.

/** Return the URL only if it is absolute http(s); otherwise "#". Blocks javascript:, data:, etc. */
export function safeUrl(raw: unknown): string {
  try {
    const u = new URL(String(raw ?? ""));
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : "#";
  } catch {
    return "#";
  }
}

/** Create an element with a class and plain-text content (never parsed as HTML). */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: unknown,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

/** Build the ticker row shared by the PoC / CVE / CERT cards. */
export function tickerItem(opts: {
  href: unknown;
  hoverBorder: string;
  hoverText: string;
  title: unknown;
  badge?: unknown;
  body: unknown;
}): HTMLAnchorElement {
  const a = el("a", `group flex flex-col ${opts.hoverBorder} transition-colors`);
  a.href = safeUrl(opts.href);
  a.target = "_blank";
  a.rel = "noopener noreferrer";

  const head = el("div", "flex justify-between w-full");
  const title = el("span", `font-bold text-white ${opts.hoverText} transition-colors`, opts.title);
  title.style.fontFamily = "'Iceland', cursive";
  head.append(title);
  if (opts.badge !== undefined) {
    head.append(el("span", "text-[8px] text-neutral-600 group-hover:text-green-500 transition-colors", opts.badge));
  }
  a.append(
    head,
    el("span", "text-neutral-400 group-hover:text-neutral-300 whitespace-nowrap overflow-hidden text-ellipsis transition-colors", opts.body),
  );
  return a;
}
