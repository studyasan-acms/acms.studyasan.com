import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { AlertTriangle } from "lucide-react";

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
  // Prevent background scrolling when open
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  // Optional Auto Close
  useEffect(() => {
    if (open && autoClose) {
      const timer = setTimeout(() => onClose?.(), autoClose);
      return () => clearTimeout(timer);
    }
  }, [open, autoClose, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onCancel?.();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Backdrop click dismiss */}
      <div 
        className="absolute inset-0" 
        onClick={() => {
          onCancel?.();
          onClose?.();
        }} 
      />

      <div className="relative bg-white rounded-3xl shadow-2xl p-6 sm:p-7 w-full max-w-sm text-center animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-slate-100">
        {/* Lottie Animation or Icon */}
        <div className="w-32 h-32 mx-auto flex items-center justify-center">
          <DotLottieReact
            src="/lottie/DeleteConfirm.json"
            autoplay
            loop={false}
          />
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-slate-900 tracking-tight mt-2">
          {title}
        </h2>

        {/* Message */}
        <div className="text-slate-600 text-xs sm:text-sm mt-2 leading-relaxed font-medium">
          {message}

          {/* Warning Badge */}
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200/80">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>This action cannot be undone</span>
          </div>
        </div>

        {/* Buttons */}
        {footer ? (
          footer
        ) : (
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              {confirmText}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmationModal;
