import React, { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface SuccessModalProps {
  open: boolean;
  title?: string;        
  description?: string;   
  showButtons?: boolean;
  cancelText?: string;
  okText?: string;
  autoClose?: number;
  onCancel?: () => void;
  onConfirm?: () => void;
  onClose?: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  open,
  title,
  description,
  showButtons = true,
  cancelText = "",
  okText = "OK",
  autoClose,
  onCancel,
  onConfirm,
  onClose,
}) => {

  useEffect(() => {
    if (open && autoClose) {
      const timer = setTimeout(() => onClose?.(), autoClose);
      return () => clearTimeout(timer);
    }
  }, [open, autoClose, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center animate-fade-in max-h-[90vh] overflow-y-auto">

        {/* Animation */}
        <div className="w-40 mx-auto">
          <DotLottieReact
            src="/lottie/Success.json"
            autoplay
            loop={false}
          />
        </div>

        {/* Title (from page) */}
        {title && (
          <h2 className="text-xl font-semibold mt-4">
            {title}
          </h2>
        )}

        {/* Description (from page) */}
        {description && (
          <p className="text-gray-600 text-sm mt-2">
            {description}
          </p>
        )}

        {/* Buttons */}
        {showButtons && (
          <div className="mt-6 flex justify-center gap-3">

            {/* Only render cancel button if provided */}
            {cancelText && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg border border-gray-300 
                           text-gray-700 hover:bg-gray-100"
              >
                {cancelText}
              </button>
            )}

            <button
              onClick={onConfirm}
              className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
            >
              {okText}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SuccessModal;
