import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { resolveImageUrl } from "@/lib/utils";
import jsPDF from 'jspdf';
import { Button } from "@/components/ui/button";
import { Download, Mail, X, Check } from "lucide-react";
import { idCardService } from "@/services/api";
import { toast } from "sonner";
import { formatStudentId, formatEmployeeId } from "@/utils/idUtils";

interface IDCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: any; // Student or Teacher object
  type: 'STUDENT' | 'TEACHER';
}

export default function IDCardModal({ isOpen, onClose, data, type }: IDCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string>("");

  // Extract data based on type
  const name = data?.user?.name || data?.name || 'Student Name';
  const roleText = type === 'STUDENT' ? 'STUDENT' : 'EMPLOYEE';

  const formattedId = type === 'STUDENT'
    ? formatStudentId(data?.id)
    : formatEmployeeId(data?.id);

  const dob = data?.date_of_birth
    ? new Date(data.date_of_birth).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '-';

  const gender = data?.gender === 'M'
    ? 'Male'
    : data?.gender === 'F'
    ? 'Female'
    : data?.gender || '-';

  const phone = data?.user?.phone || data?.phone || '-';
  const email = data?.user?.email || data?.email || '-';

  const validThrough = data?.id_valid_through
    ? new Date(data.id_valid_through).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '01/02/2027';

  // Profile image with CORS safe fallback
  const rawPhotoUrl = data ? resolveImageUrl(data.user?.profile_url || data.profile_url) : '';
  const photoUrl = rawPhotoUrl
    ? `${rawPhotoUrl}?t=${new Date().getTime()}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0080ff&color=fff&size=256`;

  useEffect(() => {
    if (!isOpen || !data) return;

    // Preload logo as base64 to ensure crisp rendering during canvas export
    const loadLogo = async () => {
      try {
        const response = await fetch('/studyasan-logo.png');
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => setLogoBase64(reader.result as string);
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("Failed to load logo", e);
      }
    };
    loadLogo();
  }, [isOpen, photoUrl]);

  if (!isOpen || !data) return null;

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));

      const canvas = await html2canvas(cardRef.current, {
        scale: 4,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `ID-Card-${formattedId}-${name.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("ID Card downloaded as image");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');

      const cardWidth = cardRef.current.offsetWidth;
      const cardHeight = cardRef.current.offsetHeight;
      const ratio = cardHeight / cardWidth;

      const pdfWidth = 60; // mm (standard ID card format)
      const pdfHeight = pdfWidth * ratio;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ID-Card-${formattedId}-${name.replace(/\s+/g, '-')}.pdf`);
      toast.success("ID Card downloaded as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
      });
      const imageData = canvas.toDataURL("image/png");

      await idCardService.sendEmail({
        userId: data.id,
        userType: type,
        imageData,
      });
      toast.success(`ID Card emailed to ${name}`);
    } catch (error) {
      console.error("Error emailing ID card:", error);
      toast.error("Failed to email ID card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh] border border-slate-200">
        {/* PREVIEW AREA */}
        <div className="flex-1 overflow-auto p-6 sm:p-8 flex items-center justify-center bg-slate-100/80">
          <div
            ref={cardRef}
            className="w-[320px] bg-white relative shadow-2xl rounded-2xl overflow-hidden flex flex-col items-center select-none border border-slate-200"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Top Orange Arch & Accent Frame */}
            <div className="w-full bg-[#f39c12] pt-2 px-2 pb-0">
              {/* Blue Header Section with StudyAsan Logo */}
              <div className="w-full bg-[#0066d6] rounded-t-xl py-3 px-4 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Subtle light glow behind logo */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center">
                  {logoBase64 ? (
                    <img
                      src={logoBase64}
                      alt="StudyAsan Logo"
                      className="h-9 object-contain drop-shadow-sm filter brightness-0 invert"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-white">
                      <span className="text-lg font-black tracking-tight leading-none">
                        Study<span className="text-[#f39c12]">Asan</span>
                      </span>
                      <span className="text-[8px] font-semibold tracking-widest opacity-90 mt-0.5 uppercase">
                        The Path To Success
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Body with Dot Pattern Background */}
            <div className="w-full px-6 pt-5 pb-4 flex flex-col items-center relative bg-white">
              {/* Background subtle micro dot pattern */}
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(#0066d6 1.5px, transparent 1.5px)`,
                  backgroundSize: '12px 12px',
                }}
              ></div>

              {/* Photo - Rounded Rectangle with Blue Border */}
              <div className="relative z-10 w-32 h-40 rounded-2xl border-[3.5px] border-[#0066d6] overflow-hidden shadow-md bg-slate-100 shrink-0">
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>

              {/* Person Name */}
              <h2 className="relative z-10 text-xl font-extrabold text-slate-900 tracking-tight mt-3 text-center truncate max-w-[260px]">
                {name}
              </h2>

              {/* Role Badge (Solid Blue Bar with Uppercase Text) */}
              <div className="relative z-10 mt-2 bg-[#0066d6] text-white py-1 px-8 rounded-sm shadow-xs">
                <span className="text-xs font-black tracking-widest uppercase">
                  {roleText}
                </span>
              </div>

              {/* Details Table */}
              <div className="relative z-10 w-full mt-4 space-y-1.5 text-xs">
                <div className="grid grid-cols-[70px_10px_1fr] items-center">
                  <span className="font-bold text-slate-800">ID No</span>
                  <span className="font-bold text-slate-800 text-center">:</span>
                  <span className="font-bold text-slate-900 tracking-wide">{formattedId}</span>
                </div>

                <div className="grid grid-cols-[70px_10px_1fr] items-center">
                  <span className="font-bold text-slate-800">DOB</span>
                  <span className="font-bold text-slate-800 text-center">:</span>
                  <span className="text-slate-700 font-medium">{dob}</span>
                </div>

                <div className="grid grid-cols-[70px_10px_1fr] items-center">
                  <span className="font-bold text-slate-800">Gender</span>
                  <span className="font-bold text-slate-800 text-center">:</span>
                  <span className="text-slate-700 font-medium">{gender}</span>
                </div>

                <div className="grid grid-cols-[70px_10px_1fr] items-center">
                  <span className="font-bold text-slate-800">Phone</span>
                  <span className="font-bold text-slate-800 text-center">:</span>
                  <span className="text-slate-700 font-medium truncate">{phone}</span>
                </div>

                <div className="grid grid-cols-[70px_10px_1fr] items-start">
                  <span className="font-bold text-slate-800 mt-0.5">Email</span>
                  <span className="font-bold text-slate-800 text-center mt-0.5">:</span>
                  <span className="text-slate-700 font-medium break-all leading-tight">
                    {email}
                  </span>
                </div>
              </div>

              {/* Valid Through in Bottom Right */}
              <div className="relative z-10 w-full flex flex-col items-end mt-4 pt-1">
                <span className="text-[10px] font-bold italic text-[#f39c12] tracking-tight">
                  Valid Through
                </span>
                <span className="text-[11px] font-bold text-slate-800">
                  {validThrough}
                </span>
              </div>
            </div>

            {/* Bottom Accent Graphic Bar */}
            <div className="w-full bg-[#0066d6] h-4 rounded-b-xl relative overflow-hidden flex items-center justify-center">
              <div className="w-12 h-1 bg-white/40 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* CONTROLS AREA */}
        <div className="w-full md:w-64 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900">ID Card Preview</h3>
                <p className="text-xs text-slate-400 font-medium">{formattedId}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                onClick={handleDownloadImage}
                disabled={loading}
                className="w-full rounded-xl h-10 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold justify-start"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2 text-saBlue" /> Download Image (PNG)
              </Button>

              <Button
                onClick={handleDownloadPDF}
                disabled={loading}
                className="w-full rounded-xl h-10 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold justify-start"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2 text-emerald-600" /> Download PDF Card
              </Button>

              <Button
                onClick={handleEmail}
                disabled={loading}
                className="w-full rounded-xl h-10 bg-saBlue hover:bg-saBlueDark text-white text-xs font-bold shadow-md shadow-saBlue/20 justify-start"
              >
                <Mail className="w-4 h-4 mr-2" /> Email ID Card
              </Button>
            </div>
          </div>

          <Button variant="ghost" onClick={onClose} className="w-full rounded-xl text-xs font-semibold text-slate-500">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
