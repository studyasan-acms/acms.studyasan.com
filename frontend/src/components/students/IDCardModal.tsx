import React, { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { resolveImageUrl } from "@/lib/utils";
import jsPDF from 'jspdf';
import { Button } from "@/components/ui/button";
import { Download, Mail, X } from "lucide-react";
import { idCardService } from "@/services/api";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";

interface IDCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any; // Student or Teacher object
    type: 'STUDENT' | 'TEACHER';
}

export default function IDCardModal({ isOpen, onClose, data, type }: IDCardModalProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuthStore();
    const [logoBase64, setLogoBase64] = useState<string>("");

    // Extract data based on type
    const name = data?.user?.name || data?.name || 'N/A';
    const role = type === 'STUDENT' ? 'Student' : 'Teacher';

    // Add cache buster to force fresh request with CORS headers if it's a remote URL
    const rawPhotoUrl = data ? (resolveImageUrl(data.user?.profile_url || data.profile_url)) : '';
    const photoUrl = rawPhotoUrl ? `${rawPhotoUrl}?t=${new Date().getTime()}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    useEffect(() => {
        if (!isOpen || !data) return;

        // Preload logo
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

    // Generate valid ID
    const year = new Date().getFullYear();
    const uniqueId = `SA-${type.substring(0, 3)}-${year}-${String(data.id).padStart(4, '0')}`;

    const handleDownloadImage = async () => {
        if (!cardRef.current) return;
        setLoading(true);
        try {
            // Wait for images to render/load
            await new Promise(resolve => setTimeout(resolve, 500));

            // Use html2canvas to capture the card
            const canvas = await html2canvas(cardRef.current, {
                scale: 4,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                scrollX: 0,
                scrollY: -window.scrollY,
                onclone: (clonedDoc, element) => {
                    // Force visible overflow and sufficient height on the clone
                    element.style.overflow = "visible";
                    element.style.height = "auto";
                    element.style.minHeight = "fit-content";

                    // Fix inner container overflow
                    const innerCards = clonedDoc.getElementsByClassName('inner-details-card');
                    if (innerCards.length > 0) {
                        (innerCards[0] as HTMLElement).style.overflow = 'visible';
                    }

                    // Ensure logo is visible in clone
                    const images = clonedDoc.getElementsByTagName('img');
                    for (let i = 0; i < images.length; i++) {
                        images[i].style.display = 'block';
                        images[i].style.visibility = 'visible';
                    }
                }
            });
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `ID-Card-${name.replace(/\s+/g, '-')}.png`;
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
                allowTaint: true
            });
            const imgData = canvas.toDataURL('image/png');

            // Card dimensions in pixels from DOM
            const cardWidth = cardRef.current.offsetWidth;
            const cardHeight = cardRef.current.offsetHeight;
            const ratio = cardHeight / cardWidth;

            const pdfWidth = 60; // mm
            const pdfHeight = pdfWidth * ratio;

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`ID-Card-${name.replace(/\s+/g, '-')}.pdf`);
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
                useCORS: true
            });
            const imageData = canvas.toDataURL("image/png");

            await idCardService.sendEmail({
                userId: data.id,
                userType: type,
                imageData
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">

                {/* PREVIEW AREA */}
                <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gray-100">
                    <div
                        ref={cardRef}
                        className="w-[320px] min-h-[550px] h-auto bg-white relative shadow-2xl overflow-hidden flex flex-col items-center select-none pb-12"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                        {/* 1. TOP GRAPHIC SHAPES */}
                        {/* Main blue header background */}
                        <div className="absolute top-0 left-0 w-full h-40 bg-blue-600 clip-path-header"></div>

                        {/* Decorative geometric shapes */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500 opacity-80 transform -translate-x-10 -translate-y-10 rotate-45"></div>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-700 opacity-90 transform translate-x-12 -translate-y-16 rotate-12"></div>
                        <div className="absolute top-10 right-10 w-20 h-20 bg-blue-400 opacity-60 transform translate-x-8 -translate-y-8 rotate-45"></div>

                        {/* Top Center Logo */}
                        <div className="relative z-50 mt-6 mb-2 flex flex-col items-center">
                            {/* Use public folder logo */}
                            <img
                                src={logoBase64 || "/studyasan-logo.png"}
                                alt="StudyAsan Logo"
                                className="h-12 object-contain drop-shadow-md"
                                crossOrigin="anonymous"
                            />
                        </div>

                        {/* 2. PROFILE IMAGE - CIRCLE WITH BORDER */}
                        <div className="z-20 relative mt-2">
                            <div className="w-32 h-32 rounded-full border-[5px] border-blue-600 bg-white p-1 shadow-xl">
                                <img
                                    src={photoUrl}
                                    alt={name}
                                    className="w-full h-full rounded-full object-cover"
                                    crossOrigin="anonymous"
                                />
                            </div>
                        </div>

                        {/* 3. NAME & ROLE */}
                        <div className="z-10 mt-3 w-full text-center">
                            {/* Blue strip for name */}
                            <div className="bg-blue-600 py-2 w-[90%] mx-auto rounded-sm shadow-md transform skew-x-[-10deg]">
                                <h1 className="text-xl font-black text-white uppercase tracking-wider transform skew-x-[10deg] truncate px-2">
                                    {name}
                                </h1>
                            </div>

                            {/* Role below */}
                            <h2 className="text-blue-600 font-bold text-base mt-2 uppercase tracking-widest">
                                {role}
                            </h2>
                        </div>

                        {/* 4. DETAILS SECTION - White Card Container */}
                        <div className="z-20 mt-4 w-full px-5 pb-8 flex flex-col items-center flex-1 min-h-0">
                            <div className="inner-details-card bg-white/95 backdrop-blur-sm w-full rounded-xl shadow-lg border border-blue-100 p-3 flex flex-col justify-center space-y-2 relative overflow-visible h-auto py-2">
                                {/* Subtle pattern inside detail card */}
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full opacity-50 z-0"></div>

                                {/* Class & Subjects / Department */}
                                <div className="text-center w-full border-b border-gray-100 pb-2 z-10">
                                    <p className="text-gray-800 font-bold text-sm leading-tight px-1 break-words">
                                        {type === 'STUDENT' ? (
                                            <>
                                                <span className="text-blue-700 text-base">{data.class?.name || 'N/A'}</span>
                                                {data.enrollments?.length > 0 &&
                                                    <span className="text-gray-600 block text-xs mt-1 font-medium leading-snug">{data.enrollments.map((e: any) => e.subject?.name).join(', ')}</span>
                                                }
                                            </>
                                        ) : (
                                            <span className="text-gray-700">{data.teacher_subject_junctions?.map((j: any) => j.subject?.name).join(', ') || 'General Faculty'}</span>
                                        )}
                                    </p>
                                </div>

                                {/* Contact Info */}
                                <div className="w-full space-y-2 z-10 pt-1">
                                    <div className="flex justify-between items-center text-xs group">
                                        <span className="text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Phone</span>
                                        <span className="text-gray-800 font-bold font-mono tracking-tight">{data.user?.phone || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-start text-xs group">
                                        <span className="text-gray-500 font-semibold uppercase tracking-wider text-[10px] mt-0.5">Email</span>
                                        <span className="text-gray-800 font-bold break-all whitespace-normal text-right max-w-[180px] leading-tight" title={data.user?.email}>{data.user?.email || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs bg-blue-50/50 p-1.5 rounded-lg border border-blue-100/50 -mx-1 mt-1">
                                        <span className="text-blue-600 font-bold uppercase tracking-wider text-[10px] pl-1">ID No.</span>
                                        <span className="text-blue-800 font-mono font-black tracking-wide pr-1">{String(data.id).padStart(8, '0')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. BOTTOM GRAPHIC SHAPES */}
                        <div className="absolute bottom-0 w-full h-24 z-0 pointer-events-none">
                            <div className="absolute bottom-[-50px] left-[-30px] w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600 transform -rotate-6 shadow-2xl"></div>
                            <div className="absolute bottom-[-30px] right-[-40px] w-40 h-40 bg-blue-400/20 backdrop-blur-md rounded-full"></div>
                        </div>
                    </div>      {/* QR Code Overlay (Small, corner) used for valid digital scan */}
                    <div className="absolute bottom-4 right-4 z-20 bg-white p-1 rounded-md shadow-sm border border-gray-100 hidden">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`https://acms.studyasan.com?email=${data.user?.email || 'unknown'}`)}`}
                            alt="QR"
                            className="h-10 w-10"
                            crossOrigin="anonymous"
                        />
                    </div>
                </div>

                {/* CONTROLS AREA */}
                <div className="w-full md:w-64 bg-white border-l p-6 flex flex-col justify-center space-y-4">
                    <div className="flex justify-between items-center mb-4 md:hidden">
                        <h3 className="font-semibold text-lg">Generate ID</h3>
                        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
                    </div>

                    <div className="space-y-4">

                        <div className="space-y-2">
                            <Button onClick={handleDownloadImage} disabled={loading} className="w-full" variant="outline">
                                <Download className="w-4 h-4 mr-2" /> Download PNG
                            </Button>
                            <Button onClick={handleDownloadPDF} disabled={loading} className="w-full" variant="outline">
                                <Download className="w-4 h-4 mr-2" /> Download PDF
                            </Button>
                            <Button onClick={handleEmail} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                <Mail className="w-4 h-4 mr-2" /> Email Card
                            </Button>
                        </div>
                    </div>

                    <Button variant="ghost" onClick={onClose} className="mt-auto hidden md:flex w-full">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
