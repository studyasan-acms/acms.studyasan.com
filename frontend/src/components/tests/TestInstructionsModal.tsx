import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  FileText,
  Award,
  AlertTriangle,
  Shield,
  CheckCircle2,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import type { Test } from '@/types';

interface TestInstructionsModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  test: Test | null;
  mode: 'test' | 'practice';
}

export default function TestInstructionsModal({
  open,
  onClose,
  onConfirm,
  test,
  mode,
}: TestInstructionsModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!test) return null;

  const totalQuestions = test.questions?.length || test._count?.questions || 0;
  const defaultMark = test.questions?.[0]?.marks || 2;
  const negativeMark = test.has_negative_marking
    ? test.questions?.[0]?.negative_marks || 0.5
    : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setAgreed(false);
          onClose();
        }
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[90vh] flex flex-col p-0 rounded-3xl overflow-hidden shadow-2xl border-slate-200">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-6 bg-slate-50/80 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  General Test Instructions
                </DialogTitle>
                <Badge
                  className={
                    mode === 'practice'
                      ? 'bg-amber-100 text-amber-800 border-none font-semibold text-xs'
                      : 'bg-saBlue/10 text-saBlue border-none font-semibold text-xs'
                  }
                >
                  {mode === 'practice' ? 'Practice Set' : 'Mock Assessment'}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                {test.title} • {test.subject?.name || test.test_series?.title || 'General Test'}
              </p>
            </div>
          </div>

          {/* Quick Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-saBlue shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Duration</p>
                <p className="text-xs font-bold text-slate-800">{test.duration_minutes} Mins</p>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Questions</p>
                <p className="text-xs font-bold text-slate-800">{totalQuestions} Questions</p>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-orange-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Marks</p>
                <p className="text-xs font-bold text-slate-800">{test.total_marks} Marks</p>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Marking Scheme</p>
                <p className="text-xs font-bold text-slate-800">
                  +{defaultMark} {test.has_negative_marking ? `| -${negativeMark}` : '| 0'}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-slate-700 text-xs sm:text-sm leading-relaxed overscroll-contain">
          {/* Section 1: General Examination Instructions */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-saBlue text-white text-[11px] flex items-center justify-center font-bold">1</span>
              General Instructions
            </h3>
            <ul className="list-disc list-outside pl-6 space-y-1.5 text-slate-600">
              <li>
                The countdown timer in the top-right corner of the screen will display the remaining time available for you to complete the examination.
              </li>
              <li>
                When the timer reaches <strong>00:00</strong>, the examination will submit automatically. You do not need to manually submit when time runs out.
              </li>
              <li>
                Ensure you have a stable internet connection and do not refresh or close the test window while attempting the exam.
              </li>
            </ul>
          </div>

          {/* Section 2: Question Palette & Color Coding */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-saBlue text-white text-[11px] flex items-center justify-center font-bold">2</span>
              Question Palette & Status Symbols
            </h3>
            <p className="text-slate-600">
              The Question Palette displayed on the side will indicate the status of each question using the standard symbols below:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-300 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <span className="text-xs font-medium text-slate-700">You have <strong>not visited</strong> the question yet.</span>
              </div>

              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <span className="text-xs font-medium text-slate-700">You have <strong>not answered</strong> the question.</span>
              </div>

              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <span className="text-xs font-medium text-slate-700">You have <strong>answered</strong> the question.</span>
              </div>

              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <span className="text-xs font-medium text-slate-700">You have <strong>marked for review</strong> (unanswered).</span>
              </div>

              <div className="flex items-center gap-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200 sm:col-span-2">
                <div className="relative w-7 h-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  5
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"></span>
                </div>
                <span className="text-xs font-medium text-slate-700">
                  The question is <strong>answered & marked for review</strong> (will be evaluated).
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Navigation & Answering Rules */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-saBlue text-white text-[11px] flex items-center justify-center font-bold">3</span>
              Navigating & Answering Questions
            </h3>
            <ul className="list-disc list-outside pl-6 space-y-1.5 text-slate-600">
              <li>
                Click on the question number in the palette to navigate directly to that question.
              </li>
              <li>
                Click <strong>Save & Next</strong> to save your answer for the current question and proceed to the next question.
              </li>
              <li>
                Click <strong>Mark for Review & Next</strong> to save the answer (if any) and flag it for revisit.
              </li>
              <li>
                To clear your selected response, click on the option again or use the <strong>Clear Response</strong> action.
              </li>
            </ul>
          </div>

          {/* Section 4: Security & Proctoring */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1.5">
            <h3 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-600" />
              Proctoring & Test Integrity
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              This examination is monitored. Switching browser tabs, minimizing the screen, copying text, or using unauthorized keyboard shortcuts will be recorded as security violations.
            </p>
          </div>

          {/* Custom Test Instructions if provided by teacher */}
          {test.instructions && (
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-1">
              <h3 className="font-bold text-saBlue text-xs uppercase tracking-wider">
                Specific Test Instructions
              </h3>
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {test.instructions}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer with Declaration */}
        <DialogFooter className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer select-none text-left">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded text-saBlue focus:ring-saBlue h-4 w-4 shrink-0"
            />
            <span>
              I have read and understood all the instructions above and agree to abide by the examination rules.
            </span>
          </label>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl h-10 px-4 text-xs font-semibold w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!agreed) return;
                onConfirm();
              }}
              disabled={!agreed}
              className="bg-saBlue hover:bg-saBlueDark text-white font-bold rounded-xl h-10 px-5 text-xs shadow-md shadow-saBlue/20 w-full sm:w-auto flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{mode === 'practice' ? 'Begin Practice' : 'Begin Test'}</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
