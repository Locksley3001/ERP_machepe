"use client";

/* eslint-disable @next/next/no-img-element */

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

export const feedbackDuration = 1700;

export function ActionFeedbackOverlay({ status, message }: ActionFeedbackOverlayProps) {
  return (
    <div
      className={`feedback-backdrop ${status}`}
      role={status === "error" ? "alert" : "status"}
      aria-live="assertive"
      aria-label={message ?? defaultMessages[status]}
    >
      <div className="feedback-panel">
        <img
          key={`${status}-${message ?? defaultMessages[status]}`}
          className="feedback-animation"
          src={feedbackAssets[status]}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <strong>{message ?? defaultMessages[status]}</strong>
      </div>
    </div>
  );
}
