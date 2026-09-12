import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { authService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Check, X, Eye, EyeOff, ArrowLeft, Mail, RefreshCw } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { validatePasswordStrength } from "@/utils/passwordValidator";
import { PasswordRequirementsList } from "@/components/common/PasswordRequirementsList";

type RegistrationStep = "form" | "otp";

export default function RegisterPage() {
  usePageTitle("Register");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [step, setStep] = useState<RegistrationStep>("form");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    reference_code: "",
  });

  // OTP state
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('code') || params.get('reference_code');
    if (ref) {
      setFormData(prev => ({ ...prev, reference_code: ref.toUpperCase() }));
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setError("");

    // Validate password strength on UI level
    const passwordValidation = validatePasswordStrength(formData.password);
    if (!passwordValidation.isValid) {
      setError("Please ensure your password meets all security requirements below");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const registerData = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        password: formData.password,
        reference_code: formData.reference_code ? formData.reference_code.toUpperCase() : undefined,
      };

      await authService.requestOtp(registerData);
      setStep("otp");
      setResendCooldown(30);
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to send verification code. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await authService.verifyOtp({
        email: formData.email.toLowerCase(),
        otp: otpCode,
      });
      setAuth(response.data.user, response.data.token);
      if (response.data.user.role === "STUDENT") {
        navigate("/dashboard/home");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Invalid verification code. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError("");

    try {
      await authService.resendOtp(formData.email.toLowerCase());
      setResendCooldown(30);
      setOtp(["", "", "", "", "", ""]);
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to resend code. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const passwordValidation = validatePasswordStrength(formData.password);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#d9ecff] via-[#e8f2ff] to-[#cce4ff] relative overflow-hidden">
      {/* Background geometric shapes */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-24 h-24 border-4 border-[#0076CE] rounded-lg rotate-45"></div>
        <div className="absolute bottom-20 right-16 w-20 h-20 border-4 border-[#0076CE] rounded-full"></div>
        <div className="absolute top-1/2 left-1/3 w-14 h-14 border-4 border-[#0076CE] -rotate-12"></div>
        <div className="absolute bottom-32 left-20 w-16 h-16 border-4 border-[#0076CE] rounded-lg"></div>
        <div className="absolute top-32 right-32 w-20 h-20 border-4 border-[#0076CE] rounded-full"></div>
        <div className="absolute top-1/4 right-1/4 w-12 h-12 border-4 border-[#0099FF] rounded-lg rotate-12"></div>
        <div className="absolute bottom-10 left-1/2 w-16 h-16 border-4 border-[#00A3FF] rounded-full rotate-45"></div>
        <div className="absolute top-3/4 left-1/3 w-20 h-20 border-4 border-[#0076CE] rounded-lg -rotate-30"></div>
        <div className="absolute bottom-1/3 right-1/5 w-14 h-14 border-4 border-[#0055a3] rounded-full rotate-60"></div>
        <div className="absolute top-1/2 right-10 w-10 h-10 border-4 border-[#0088DD] rounded-lg rotate-90"></div>
      </div>

      {/* LEFT IMAGE – Tablet (md) */}
      <div className="hidden md:flex lg:hidden w-1/2 items-center justify-center p-6 relative z-10">
        <DotLottieReact
          src="/lottie/Login-Lady.lottie"
          loop
          autoplay
          className="w-full h-auto max-w-md"
        />
      </div>

      {/* LEFT IMAGE – Desktop (lg) */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-10 relative z-10">
        <DotLottieReact src="/lottie/Login-Lady.lottie" loop autoplay />
      </div>

      {/* RIGHT SIDE (Register Form / OTP Verification) */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-4 relative z-10">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl border-0 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#0076CE] to-[#0055a3] px-6 py-8 text-center">
            <img
              src="/studyasan-logo.png"
              alt="StudyAsan Logo"
              className="h-20 mx-auto mb-3 object-contain"
            />
            <p className="text-blue-100 text-sm">
              {step === "form"
                ? "Create your account and start learning"
                : "Verify your email address"}
            </p>
          </div>

          {step === "form" ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-100 text-red-600 text-sm p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 text-sm">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE]"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 text-sm">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE]"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 text-sm">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Show password requirements only when user has submitted */}
                  {hasSubmitted && (
                    <PasswordRequirementsList
                      requirements={passwordValidation.requirements}
                    />
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-gray-700 text-sm"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className="h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE] pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {hasSubmitted && formData.confirmPassword && (
                    <p
                      className={`text-xs flex items-center gap-1 mt-1 ${
                        formData.password === formData.confirmPassword
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <Check className="h-3 w-3" /> Passwords match
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3" /> Passwords do not match
                        </>
                      )}
                    </p>
                  )}
                </div>

                {/* Referral Code (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="reference_code" className="text-gray-700 text-sm flex items-center justify-between">
                    <span>Referral Code</span>
                    <span className="text-xs text-gray-400 font-normal">Optional</span>
                  </Label>
                  <Input
                    id="reference_code"
                    name="reference_code"
                    type="text"
                    placeholder="e.g. AGENCY100"
                    value={formData.reference_code}
                    onChange={handleChange}
                    disabled={isLoading}
                    className="h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE] uppercase font-mono"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 p-6 pt-0">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-r from-[#0076CE] to-[#0055a3] hover:from-[#0066b8] hover:to-[#004488] text-white rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending verification code...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>

                <p className="text-sm text-center text-gray-600">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="text-[#0076CE] hover:text-[#0055a3] hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          ) : (
            /* OTP Verification Step */
            <div>
              <CardContent className="p-6 space-y-6">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                  }}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to registration
                </button>

                {error && (
                  <div className="bg-red-100 text-red-600 text-sm p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {/* Email info */}
                <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[#0076CE] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">
                      We've sent a 6-digit verification code to:
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {formData.email}
                    </p>
                  </div>
                </div>

                {/* OTP Input */}
                <div>
                  <Label className="text-gray-700 text-sm block mb-3">
                    Enter verification code
                  </Label>
                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <Input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        disabled={isLoading}
                        className="w-12 h-14 text-center text-2xl font-bold rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE]"
                      />
                    ))}
                  </div>
                </div>

                {/* Resend button */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || isLoading}
                    className="inline-flex items-center gap-2 text-sm text-[#0076CE] hover:text-[#0055a3] disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col space-y-4 p-6 pt-0">
                <Button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={isLoading || otp.join("").length !== 6}
                  className="w-full h-11 bg-gradient-to-r from-[#0076CE] to-[#0055a3] hover:from-[#0066b8] hover:to-[#004488] text-white rounded-lg shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Create Account"
                  )}
                </Button>
              </CardFooter>
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
        <span className="text-xs text-gray-500">
          © 2024 StudyAsan. All rights reserved.
        </span>
      </div>
    </div>
  );
}
