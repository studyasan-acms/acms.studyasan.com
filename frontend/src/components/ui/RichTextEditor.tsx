import React, { useRef, useEffect, useCallback, useState } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (htmlValue: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  id?: string;
}

// Converts WYSIWYG HTML from the editor into KaTeX format for storage
const htmlToKatex = (html: string) => {
  if (!html) return "";
  let text = html;
  
  // Replace sup/sub with KaTeX wrappers: ${}^{...}$ and ${}_{...}$
  // In replace(), $$ inserts a literal $
  text = text.replace(/<sup[^>]*>(.*?)<\/sup>/gi, '$${}^{$1}$$');
  text = text.replace(/<sub[^>]*>(.*?)<\/sub>/gi, '$${}_{$1}$$');
  
  // Handle block elements
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n');
  text = text.replace(/<\/div>\s*<div[^>]*>/gi, '\n');
  text = text.replace(/<div[^>]*>/gi, '\n');
  
  // Decode HTML entities and strip remaining HTML tags
  const temp = document.createElement('div');
  temp.innerHTML = text;
  text = temp.textContent || temp.innerText || "";
  
  // Clean up multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
};

// Converts stored KaTeX format back into WYSIWYG HTML for the editor
const katexToHtml = (katex: string) => {
  if (!katex) return "";
  let html = katex;
  // Convert KaTeX wrappers back to sup/sub
  html = html.replace(/\$\{\}\^\{(.*?)\}\$/g, '<sup>$1</sup>');
  html = html.replace(/\$\{\}_\{(.*?)\}\$/g, '<sub>$1</sub>');
  
  // Convert newlines to br
  html = html.replace(/\n/g, '<br/>');
  return html;
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  rows = 3,
  className = "",
  id,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValueRef = useRef<string | null>(null);
  const [isSuperActive, setIsSuperActive] = useState(false);
  const [isSubActive, setIsSubActive] = useState(false);

  // Sync external value (KaTeX) → editor DOM (HTML)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Convert the incoming KaTeX string back to HTML for WYSIWYG editing
    const htmlValue = katexToHtml(value || "");

    // Avoid resetting cursor position on every keystroke
    if (editor.innerHTML !== htmlValue && value !== lastValueRef.current) {
      editor.innerHTML = htmlValue;
      lastValueRef.current = value;
    }
  }, [value]);

  // Update toolbar button active states based on current selection
  const updateToolbarState = useCallback(() => {
    const superActive = document.queryCommandState("superscript");
    const subActive = document.queryCommandState("subscript");
    setIsSuperActive(superActive);
    setIsSubActive(subActive);
  }, []);

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    // Convert the WYSIWYG HTML into KaTeX for storage
    const katex = htmlToKatex(html);
    lastValueRef.current = katex; // Store the KaTeX representation to prevent cursor jumps
    onChange(katex);
    updateToolbarState();
  }, [onChange, updateToolbarState]);

  const handleKeyUp = useCallback(() => {
    updateToolbarState();
  }, [updateToolbarState]);

  const handleMouseUp = useCallback(() => {
    updateToolbarState();
  }, [updateToolbarState]);

  const applyFormat = useCallback((command: "superscript" | "subscript") => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command);
    updateToolbarState();
    // Trigger onChange after formatting
    const html = editor.innerHTML;
    const katex = htmlToKatex(html);
    lastValueRef.current = katex;
    onChange(katex);
  }, [onChange, updateToolbarState]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Ctrl + . → Superscript
      if (e.ctrlKey && !e.shiftKey && e.key === ".") {
        e.preventDefault();
        applyFormat("superscript");
        return;
      }
      // Ctrl + , → Subscript
      if (e.ctrlKey && !e.shiftKey && e.key === ",") {
        e.preventDefault();
        applyFormat("subscript");
        return;
      }
    },
    [applyFormat]
  );

  // On paste: accept only plain text to avoid unwanted formatting
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  const minHeight = `${rows * 1.75}rem`;

  return (
    <div className={`rich-text-editor-wrapper group ${className}`}>
      {/* Floating Toolbar (visible on hover/focus) */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
        <button
          type="button"
          title="Superscript (Ctrl+.)"
          aria-label="Superscript"
          onClick={() => applyFormat("superscript")}
          className={`floating-btn ${isSuperActive ? "active" : ""}`}
        >
          x²
        </button>
        <button
          type="button"
          title="Subscript (Ctrl+,)"
          aria-label="Subscript"
          onClick={() => applyFormat("subscript")}
          className={`floating-btn ${isSubActive ? "active" : ""}`}
        >
          x₂
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        id={id}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseUp={handleMouseUp}
        onPaste={handlePaste}
        style={{ minHeight }}
        data-placeholder={placeholder}
        className="rich-text-content"
      />

      <style>{`
        .rich-text-editor-wrapper {
          position: relative;
        }

        .floating-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.75rem;
          height: 1.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: #6b7280;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .floating-btn:hover {
          color: #111827;
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .floating-btn.active {
          color: #2563eb;
          border-color: #bfdbfe;
          background: #eff6ff;
        }

        .rich-text-content {
          width: 100%;
          padding: 0.5rem 0.75rem;
          padding-right: 4rem; /* leave space for floating buttons */
          font-size: 0.875rem;
          line-height: 1.6;
          color: #111827;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          outline: none;
          word-break: break-word;
          overflow-y: auto;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .rich-text-content:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }

        .rich-text-content:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
          display: block;
        }

        .rich-text-content sup,
        .rich-text-content sub {
          font-size: 0.72em;
        }
      `}</style>
    </div>
  );
}
