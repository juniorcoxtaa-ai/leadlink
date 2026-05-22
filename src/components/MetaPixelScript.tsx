import { useEffect } from "react";
import {
  initMetaPixel,
  isValidMetaPixelId,
  trackMetaCustomEvent,
  trackMetaEvent,
  trackMetaPageViewOnce,
  type MetaPixelTrackParams,
} from "@/lib/meta-pixel";

type MetaPixelScriptProps = {
  pixelId?: string | null;
  pageKey: string;
  customPageEvent?: {
    name: string;
    params?: MetaPixelTrackParams;
  };
  contentEvent?: {
    name: string;
    params?: MetaPixelTrackParams;
  };
};

export function MetaPixelScript({
  pixelId,
  pageKey,
  customPageEvent,
  contentEvent,
}: MetaPixelScriptProps) {
  const customEventName = customPageEvent?.name;
  const customEventParams = JSON.stringify(customPageEvent?.params ?? null);
  const contentEventName = contentEvent?.name;
  const contentEventParams = JSON.stringify(contentEvent?.params ?? null);

  useEffect(() => {
    const normalizedPixelId = pixelId?.trim() ?? "";
    if (!isValidMetaPixelId(normalizedPixelId)) return;

    const didTrackPageView = trackMetaPageViewOnce(normalizedPixelId, pageKey);
    if (!didTrackPageView) {
      initMetaPixel(normalizedPixelId);
    }

    if (customEventName) {
      trackMetaCustomEvent(
        customEventName,
        customEventParams === "null"
          ? undefined
          : (JSON.parse(customEventParams) as MetaPixelTrackParams),
      );
    }

    if (contentEventName) {
      trackMetaEvent(
        contentEventName,
        contentEventParams === "null"
          ? undefined
          : (JSON.parse(contentEventParams) as MetaPixelTrackParams),
      );
    }
  }, [contentEventName, contentEventParams, customEventName, customEventParams, pageKey, pixelId]);

  return null;
}
