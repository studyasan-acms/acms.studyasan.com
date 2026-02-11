import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { authService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";

// Define the expected API error shape
interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function LoginPage() {
  usePageTitle("Login");
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await authService.login({
        ...formData,
        email: formData.email.toLowerCase(),
      });
      setAuth(response.data.user, response.data.token);
      if (response.data.user.role === 'STUDENT') {
        navigate("/dashboard/home");
      } else {
        navigate("/dashboard");
      }
    } catch (err: unknown) {
      const apiError = err as ApiErrorResponse;

      // Check for API response message first (from backend)
      if (apiError.response?.data?.message) {
        setError(apiError.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to login. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#d9ecff] via-[#e8f2ff] to-[#cce4ff] relative overflow-hidden">
      {/* Background geometric pattern covering the entire page */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {/* Existing shapes */}
        <div className="absolute top-10 left-10 w-24 h-24 border-4 border-[#0076CE] rounded-lg rotate-45"></div>
        <div className="absolute bottom-20 right-16 w-20 h-20 border-4 border-[#0076CE] rounded-full"></div>
        <div className="absolute top-1/2 left-1/3 w-14 h-14 border-4 border-[#0076CE] -rotate-12"></div>
        <div className="absolute bottom-32 left-20 w-16 h-16 border-4 border-[#0076CE] rounded-lg"></div>
        <div className="absolute top-32 right-32 w-20 h-20 border-4 border-[#0076CE] rounded-full"></div>

        {/* New additional shapes */}
        <div className="absolute top-1/4 right-1/4 w-12 h-12 border-4 border-[#0099FF] rounded-lg rotate-12"></div>
        <div className="absolute bottom-10 left-1/2 w-16 h-16 border-4 border-[#00A3FF] rounded-full rotate-45"></div>
        <div className="absolute top-3/4 left-1/3 w-20 h-20 border-4 border-[#0076CE] rounded-lg -rotate-30"></div>
        <div className="absolute bottom-1/3 right-1/5 w-14 h-14 border-4 border-[#0055a3] rounded-full rotate-60"></div>
        <div className="absolute top-1/2 right-10 w-10 h-10 border-4 border-[#0088DD] rounded-lg rotate-90"></div>
      </div>

      {/* LEFT IMAGE (Hidden on mobile, visible on md+) */}
      {/* LEFT IMAGE - Tablet only */}
      <div className="hidden md:flex lg:hidden w-1/2 items-center justify-center p-6 relative z-10">
        <DotLottieReact
          src="/lottie/Online-Learning.lottie"
          loop
          autoplay
          className="w-full h-auto max-w-md"
        />
      </div>

      {/* LEFT IMAGE - Desktop (unchanged) */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-10 relative z-10">
        <DotLottieReact src="/lottie/Online-Learning.lottie" loop autoplay />
      </div>

      {/* RIGHT SIDE (Login) */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-4 relative z-10">
        {/* Login Card */}
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl relative z-10 border-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-[#0076CE] to-[#0055a3] px-6 py-8 text-center">
            {/* Logo */}
            <img
              src="/studyasan-logo.png"
              alt="StudyAsan Logo"
              className="h-20 mx-auto mb-3 object-contain"
            />

            <p className="text-blue-100 text-sm">
              Sign in to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6">
              {error && (
                <div className="bg-red-100 text-red-600 text-sm p-3 rounded-md border border-red-200">
                  {error}
                </div>
              )}

              {/* Email or Phone */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 text-sm">
                  Email or Phone Number
                </Label>

                <div className="relative">
                  <Mail className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                  <Input
                    id="email"
                    name="email"
                    type="text"
                    className="pl-10 h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE]"
                    placeholder="Enter email or phone number"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-gray-500">You can use your email address or phone number to login</p>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700 text-sm">
                    Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-xs text-[#0076CE] hover:text-[#0055a3] hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <Lock className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />

                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 pr-10 h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE]"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
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
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 p-6 pt-0">
              {/* Sign In button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-gradient-to-r from-[#0076CE] to-[#0055a3] 
                hover:from-[#0066b8] hover:to-[#004488] text-white rounded-lg shadow-lg transition-all duration-300 
                disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Registration link */}
              <p className="text-sm text-center text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-[#0076CE] hover:text-[#0055a3] hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />

      {/* Footer - centered at bottom of the page */}
      <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none">
        <span className="text-xs text-gray-500">
          © 2024 StudyAsan. All rights reserved.
        </span>
      </div>
    </div>
  );
}
