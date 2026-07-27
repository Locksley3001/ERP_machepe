"use client";

import { createElement, useEffect } from "react";

type FeedbackStatus = "success" | "error";

type ActionFeedbackOverlayProps = {
  status: FeedbackStatus;
  message?: string;
};

const animationSources: Record<FeedbackStatus, string> = {
  success: "https://lottie.host/39a09eba-2164-462c-96a6-21af76a37a8f/gLnP9sEY37.lottie",
  error: "https://lottie.host/ecb0b36b-8a79-453b-9b8a-66d5f3f25b66/YfZkY2GKMY.lottie"
};

export const feedbackDuration = 1800;

export function ActionFeedbackOverlay({ status, message }: ActionFeedbackOverlayProps) {
  useEffect(() => {
    if (document.querySelector('script[data-dotlottie-wc="true"]')) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.14/dist/dotlottie-wc.js";
    script.type = "module";
    script.dataset.dotlottieWc = "true";
    document.head.appendChild(script);
  }, []);

  return (
    <div className="feedback-backdrop" role={status === "error" ? "alert" : "status"} aria-live="assertive">
      <div className="feedback-panel">
        {createElement("dotlottie-wc", {
          src: animationSources[status],
          autoplay: true,
          loop: true,
          style: {
            width: "min(380px, 78vw)",
            height: "min(380px, 78vw)"
          }
        })}
        {message ? <strong>{message}</strong> : null}
      </div>
    </div>
  );
}
