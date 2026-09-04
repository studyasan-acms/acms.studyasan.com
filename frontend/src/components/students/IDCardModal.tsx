import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { resolveImageUrl } from "@/lib/utils";
import jsPDF from 'jspdf';
import { Button } from "@/components/ui/button";
import { Download, Mail, X, User } from "lucide-react";
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
  const [imgError, setImgError] = useState(false);

  // Extract name
  const name = data?.user?.name || data?.name || 'Name';

  // Dynamic role determination: prioritize assigned role name (Faculty, Accountant, etc.)
  const getRoleText = () => {
    if (type === 'STUDENT') return 'STUDENT';
    if (data?.role?.name) return String(data.role.name).trim().toUpperCase();
    if (typeof data?.role === 'string' && data.role.trim() && data.role !== 'TEACHER' && data.role !== 'EMPLOYEE') {
      return data.role.trim().toUpperCase();
    }
    if (data?.role_name) return String(data.role_name).trim().toUpperCase();
    if (data?.designation) return String(data.designation).trim().toUpperCase();
    return 'FACULTY';
  };

  const roleText = getRoleText();

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

  // Extract initials for fallback avatar
  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const [photoBase64, setPhotoBase64] = useState<string>("");

  // Extract all possible image fields
  const rawPhoto = data?.user?.profile_url || data?.profile_url || data?.user?.photo || data?.photo || data?.user?.avatar || data?.avatar || data?.user?.image || data?.image || data?.profile_image || data?.user?.profile_image;
  const photoUrl = rawPhoto ? resolveImageUrl(rawPhoto) : '';

  useEffect(() => {
    setImgError(false);
    if (!photoUrl) {
      setPhotoBase64('');
      return;
    }

    let isMounted = true;

    const loadPhoto = async () => {
      // If already a base64 or blob URL, use directly
      if (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:')) {
        setPhotoBase64(photoUrl);
        return;
      }

      try {
        // Try direct fetch first
        let res = await fetch(photoUrl).catch(() => null);

        // If direct fetch blocked (e.g. S3 CORS), route through the backend proxy
        if (!res || !res.ok) {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/';
          const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
          const proxyUrl = `${cleanApiUrl}/upload/proxy-file?url=${encodeURIComponent(photoUrl)}`;
          res = await fetch(proxyUrl).catch(() => null);
        }

        if (res && res.ok) {
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (isMounted && typeof reader.result === 'string') {
              setPhotoBase64(reader.result);
            }
          };
          reader.readAsDataURL(blob);
          return;
        }
      } catch (err) {
        console.warn('Failed to convert photo to base64:', err);
      }

      // Fallback: use raw photoUrl
      if (isMounted) {
        setPhotoBase64(photoUrl);
      }
    };

    loadPhoto();

    return () => {
      isMounted = false;
    };
  }, [photoUrl]);

  useEffect(() => {
    if (!isOpen || !data) return;

    // Preload logo as base64 to ensure crisp offline rendering during canvas export
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
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
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
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
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
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row max-h-[94vh] border border-slate-200">
        {/* PREVIEW AREA */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-100/90">

          {/* ── 3-strip background + floating white card ── */}
          <div
            ref={cardRef}
            className="relative select-none overflow-hidden shadow-2xl"
            style={{
              width: '300px',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            {/* Strip 1 — Orange (top 35%) */}
            <div className="absolute top-0 left-0 right-0 bg-[#ea8e16]" style={{ height: '30%' }} />

            {/* Strip 2 — Dotted grey (middle 50%) */}
            <div
              className="absolute left-0 right-0 overflow-hidden"
              style={{
                top: '30%',
                height: '50%',
                backgroundColor: '#dde3ea',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='6' cy='6' r='1.5' fill='%238fa3b1'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
              }}
            />

            {/* Strip 3 — Blue (bottom 20%) */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#1053db]" style={{ height: '20%' }} />

            {/* White card — floats over all 3 strips with margin on all sides */}
            <div
              className="relative z-10 bg-white rounded-lg overflow-hidden flex flex-col shadow-xl"
              style={{ margin: '16px' }}
            >
              {/* Blue header with logo */}
              <div className="w-full bg-[#1053db] py-2 px-2 flex items-center justify-center relative overflow-hidden shrink-0">
                <img
                  src={logoBase64 || '/studyasan-logo.png'}
                  alt="StudyAsan Logo"
                  className="relative z-10 w-[96%] h-auto max-h-16 object-contain"
                  crossOrigin="anonymous"
                />
              </div>

              {/* White body */}
              <div
                className="w-full bg-white px-4 pt-3.5 pb-3.5 flex flex-col items-center overflow-hidden"
                style={{ boxSizing: 'border-box' }}
              >

                {/* Photo */}
                <div className="w-[118px] h-[146px] rounded-[16px] border-[3px] border-[#3b82f6] overflow-hidden shadow-sm bg-slate-100 shrink-0">
                  {(photoBase64 || photoUrl) && !imgError ? (
                    <img
                      src={photoBase64 || photoUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                      onError={() => {
                        console.error("ID Card photo failed to load:", photoBase64 || photoUrl);
                        setImgError(true);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-slate-100 to-blue-100">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                        <User className="w-7 h-7 text-[#1053db]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Name */}
                <h2
                  className="w-full font-black text-slate-900 text-center px-1 mt-3.5 break-words"
                  style={{ fontSize: '18px', lineHeight: '22px', textAlign: 'center' }}
                >
                  {name}
                </h2>

                {/* Role badge (with left & right padding from card container, perfectly centered text) */}
                <div
                  className="w-full mt-2.5 bg-[#4175fc] text-white shrink-0 rounded-none"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    paddingTop: '6px',
                    paddingBottom: '6px',
                    paddingLeft: '0px',
                    paddingRight: '0px',
                    display: 'block',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#ffffff',
                      lineHeight: '16px',
                      letterSpacing: '0px',
                      margin: 0,
                      padding: 0,
                      paddingBottom: '6px',
                      display: 'block',
                    }}
                  >
                    {roleText}
                  </div>
                </div>

                {/* Details table */}
                <table className="w-full mt-3.5 border-collapse text-xs">
                  <tbody>
                    <tr>
                      <td className="py-1 font-bold text-slate-900 whitespace-nowrap w-[62px] align-middle">ID No</td>
                      <td className="py-1 font-bold text-slate-900 text-center w-[12px] align-middle">:</td>
                      <td className="py-1 text-slate-800 font-medium pl-2 align-middle truncate max-w-[150px]">{formattedId}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-bold text-slate-900 whitespace-nowrap align-middle">DOB</td>
                      <td className="py-1 font-bold text-slate-900 text-center align-middle">:</td>
                      <td className="py-1 text-slate-800 font-medium pl-2 align-middle truncate max-w-[150px]">{dob}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-bold text-slate-900 whitespace-nowrap align-middle">Gender</td>
                      <td className="py-1 font-bold text-slate-900 text-center align-middle">:</td>
                      <td className="py-1 text-slate-800 font-medium pl-2 align-middle truncate max-w-[150px]">{gender}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-bold text-slate-900 whitespace-nowrap align-middle">Phone</td>
                      <td className="py-1 font-bold text-slate-900 text-center align-middle">:</td>
                      <td className="py-1 text-slate-800 font-medium pl-2 align-middle truncate max-w-[150px]">{phone}</td>
                    </tr>
                    <tr>
                      <td className="py-1 font-bold text-slate-900 whitespace-nowrap align-top">Email</td>
                      <td className="py-1 font-bold text-slate-900 text-center align-top">:</td>
                      <td className="py-1 text-slate-800 font-medium pl-2 align-top break-all text-[11px] leading-tight">{email}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Valid Through */}
                <div className="w-full flex flex-col items-end mt-2.5 shrink-0">
                  <span className="text-[9.5px] font-bold italic text-slate-700 leading-snug">Valid Through</span>
                  <span className="text-[11.5px] font-black italic text-[#ea8e16] leading-snug mt-0.5">{validThrough}</span>
                </div>
              </div>
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
