import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authService } from "@/services/api";
import { Loader2, Mail, Lock, Eye, EyeOff, KeyRound, Check, X } from "lucide-react";
import { validatePasswordStrength } from "@/utils/passwordValidator";
import { PasswordRequirementsList } from "@/components/common/PasswordRequirementsList";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "email" | "otp" | "password";

export default function ForgotPasswordModal({
  isOpen,
  onClose,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleClose = () => {
    setStep("email");
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setHasSubmitted(false);
    onClose();
  };

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await authService.requestPasswordReset(email);
      setSuccess(response.message);
      setTimeout(() => {
        setStep("otp");
        setSuccess("");
      }, 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to send OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await authService.verifyPasswordResetOtp({
        email,
        otp,
      });
      setSuccess(response.message);
      setTimeout(() => {
        setStep("password");
        setSuccess("");
        setHasSubmitted(false);
      }, 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Invalid OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);
    setError("");
    setSuccess("");

    // Validate password strength on UI level
    const validation = validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      setError("Please ensure your password meets all security requirements below");
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.resetPassword({
        email,
        otp,
        newPassword,
      });
      setSuccess(response.message);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to reset password. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const response = await authService.requestPasswordReset(email);
      setSuccess(response.message);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Failed to resend OTP. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValidation = validatePasswordStrength(newPassword);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="h-5 w-5 text-[#0076CE]" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            {step === "email" &&
              "Enter your email address to receive a verification code"}
            {step === "otp" &&
              "Enter the 6-digit code sent to your email"}
            {step === "password" && "Create a new password for your account"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Email */}
        {step === "email" && (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-600 text-sm p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 text-green-600 text-sm p-3 rounded-md border border-green-200">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <div className="relative">
                <Mail className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="reset-email"
                  type="email"
                  className="pl-10"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-[#0076CE] to-[#0055a3] hover:from-[#0066b8] hover:to-[#004488]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-600 text-sm p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 text-green-600 text-sm p-3 rounded-md border border-green-200">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-otp">Verification Code</Label>
              <Input
                id="reset-otp"
                type="text"
                className="text-center text-2xl tracking-widest"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">
                Code sent to {email}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("email")}
                disabled={isLoading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                className="flex-1 bg-gradient-to-r from-[#0076CE] to-[#0055a3] hover:from-[#0066b8] hover:to-[#004488]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="text-sm text-[#0076CE] hover:text-[#0055a3] hover:underline disabled:opacity-50"
              >
                Didn't receive the code? Resend
              </button>
            </div>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === "password" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-600 text-sm p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 text-green-600 text-sm p-3 rounded-md border border-green-200">
                {success}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-10"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {hasSubmitted && (
                <PasswordRequirementsList
                  requirements={passwordValidation.requirements}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="pl-10 pr-10"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {hasSubmitted && confirmPassword && (
                <p
                  className={`text-xs flex items-center gap-1 ${
                    newPassword === confirmPassword ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {newPassword === confirmPassword ? (
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

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-[#0076CE] to-[#0055a3] hover:from-[#0066b8] hover:to-[#004488]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
