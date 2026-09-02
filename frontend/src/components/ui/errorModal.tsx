import React, { useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface ErrorModalProps {
  open: boolean;
  title?: string;
  description?: any;
  showButtons?: boolean;
  cancelText?: string;
  okText?: string;
  autoClose?: number;
  onCancel?: () => void;
  onConfirm?: () => void;
  onClose?: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({
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

  const renderDescription = (desc: any) => {
    if (!desc) return null;

    if (typeof desc === 'string') {
      return <p className="text-gray-600 text-sm mt-2">{desc}</p>;
    }

    if (Array.isArray(desc)) {
      return (
        <div className="text-gray-600 text-sm mt-2 text-left max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border">
          <ul className="list-disc pl-5 space-y-1">
            {desc.map((err, idx) => {
              if (typeof err === 'string') return <li key={idx}>{err}</li>;
              if (err && typeof err === 'object') {
                const loc = err.loc ? err.loc.join(' -> ') : '';
                const msg = err.msg || JSON.stringify(err);
                return <li key={idx}>{loc ? `${loc}: ${msg}` : msg}</li>;
              }
              return <li key={idx}>{String(err)}</li>;
            })}
          </ul>
        </div>
      );
    }

    if (typeof desc === 'object') {
      // If it's a generic object (e.g. from axios response)
      // Check if it has message or detail
      const errorMsg = desc.message || desc.detail || desc.error;
      if (errorMsg) {
        return renderDescription(errorMsg);
      }
      return (
        <div className="text-gray-600 text-sm mt-2 text-left max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border">
          <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(desc, null, 2)}</pre>
        </div>
      );
    }

    return <p className="text-gray-600 text-sm mt-2">{String(desc)}</p>;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => (onClose || onCancel || onConfirm)?.()}
    >
      <div
        className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Animation */}
        <div className="w-40 mx-auto">
          <DotLottieReact
            src="/lottie/Error.json"
            autoplay
            loop={false}
          />
        </div>

        {/* Title */}
        {title && (
          <h2 className="text-xl font-semibold mt-4 text-red-600">
            {title}
          </h2>
        )}

        {/* Description */}
        {renderDescription(description)}

        {/* Buttons */}
        {showButtons && (
          <div className="mt-6 flex justify-center gap-3">

            {cancelText && (
              <button
                type="button"
                onClick={onCancel || onClose}
                className="px-4 py-2 rounded-lg border border-gray-300 
                           text-gray-700 hover:bg-gray-100 font-medium text-sm"
              >
                {cancelText}
              </button>
            )}

            <button
              type="button"
              onClick={onConfirm || onClose}
              className="px-6 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium text-sm transition-colors"
            >
              {okText}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ErrorModal;

