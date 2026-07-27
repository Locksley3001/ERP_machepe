"use client";

import Image from "next/image";

type FeedbackStatus = "success" | "error";

type ActionFeedbackOverlayProps = {
  status: FeedbackStatus;
  message?: string;
};

const defaultMessages: Record<FeedbackStatus, string> = {
  success: "Accion completada.",
  error: "No se pudo completar."
};

const feedbackAssets: Record<FeedbackStatus, string> = {
  success: "/feedback/confirmation.svg",
  error: "/feedback/wrong.svg"
};

const feedbackAssetSizes: Record<FeedbackStatus, { width: number; height: number }> = {
  success: { width: 500, height: 400 },
  error: { width: 512, height: 512 }
};

export const feedbackDuration = 2650;

export function ActionFeedbackOverlay({ status, message }: ActionFeedbackOverlayProps) {
  const assetSize = feedbackAssetSizes[status];

  return (
    <div
      className={`feedback-backdrop ${status}`}
      role={status === "error" ? "alert" : "status"}
      aria-live="assertive"
      aria-label={message ?? defaultMessages[status]}
    >
      <div className="feedback-panel">
        <Image
          key={`${status}-${message ?? defaultMessages[status]}`}
          className="feedback-animation"
          src={feedbackAssets[status]}
          width={assetSize.width}
          height={assetSize.height}
          alt=""
          aria-hidden="true"
          priority
          unoptimized
          draggable={false}
        />
        <strong>{message ?? defaultMessages[status]}</strong>
      </div>
    </div>
  );
}
