import React, { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface DeleteConfirmationModalProps {
  open: boolean;
  title?: string;
  message?: React.ReactNode;      // allow JSX
  confirmText?: React.ReactNode;  // allow JSX
  cancelText?: string;
  autoClose?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  footer?: React.ReactNode;       // custom footer for special alignment
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  open,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  autoClose,
  onConfirm,
  onCancel,
  onClose,
  footer,
}) => {

  // Optional Auto Close
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
        <div className="w-40 mx-auto">
          <DotLottieReact
            src="/lottie/DeleteConfirm.json"
            autoplay
            loop={false}
          />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mt-4 text-red-600">
          {title}
        </h2>

        {/* Message */}
        <div className="text-gray-600 text-sm mt-2">
          {message}

          {/* Warning Text at Bottom */}
          <p className="mt-3 text-red-600 text-xs sm:text-sm font-medium">
            *This action cannot be undone.
          </p>
        </div>

        {/* Buttons */}
        {footer ? (
          footer
        ) : (
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-gray-300 
                         text-gray-700 hover:bg-gray-100"
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
            >
              {confirmText}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
