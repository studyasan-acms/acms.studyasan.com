import React, { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface ConfirmationModalProps {
  open: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: React.ReactNode;
  cancelText?: string;
  autoClose?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  footer?: React.ReactNode;
  lottieSrc?: string; // Lottie animation path
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  open,
  title,
  description,
  confirmText = "Yes",
  cancelText = "No",
  autoClose,
  onConfirm,
  onCancel,
  onClose,
  footer,
  lottieSrc = "/lottie/QuestionMark.json", // default to QuestionMark
}) => {

  // Auto close logic
  useEffect(() => {
    if (open && autoClose) {
      const timer = setTimeout(() => onClose?.(), autoClose);
      return () => clearTimeout(timer);
    }
  }, [open, autoClose, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center animate-fade-in">

        {/* Lottie Animation */}
        {lottieSrc && (
          <div className="w-40 mx-auto">
            <DotLottieReact
              src={lottieSrc}
              autoplay
              loop={false}
            />
          </div>
        )}

        {/* Title */}
        {title && (
          <h2 className="text-xl font-semibold mt-4 text-black">
            {title}
          </h2>
        )}

        {/* Description */}
        {description && (
          <div className="text-black text-sm mt-2">
            {description}
          </div>
        )}

        {/* Footer / Buttons */}
        {footer ? (
          footer
        ) : (
          <div className="mt-6 flex justify-center gap-3">
            {cancelText && (
              <button
                onClick={() => {
                  onCancel?.();
                  onClose?.();
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                {cancelText}
              </button>
            )}

            <button
              onClick={() => {
                onConfirm?.();
                onClose?.();
              }}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center"
            >
              {confirmText}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ConfirmationModal;
