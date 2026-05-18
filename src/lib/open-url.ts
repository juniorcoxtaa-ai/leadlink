export function isMobileBrowser() {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
}

export function openUrlWithFallback(url: string, target: "_blank" | "_self" = "_blank") {
  if (typeof window === "undefined" || !url) return;

  if (target === "_self" || isMobileBrowser()) {
    window.location.href = url;
    return;
  }

  const popup = window.open(url, target, "noopener,noreferrer");
  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    window.location.href = url;
  }
}
