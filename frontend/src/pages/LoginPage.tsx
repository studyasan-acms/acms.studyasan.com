import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { authService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#d9ecff] via-[#e8f2ff] to-[#cce4ff] relative overflow-x-hidden overflow-y-auto py-10 px-4">
      {/* Background geometric pattern covering the entire page */}
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

      {/* Main 2-Column Responsive Container */}
      <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 relative z-10 my-auto">
        
        {/* LEFT ILLUSTRATION (Desktop & Tablet) */}
        <div className="hidden lg:flex w-full lg:w-1/2 items-center justify-center p-4">
          <div className="w-full max-w-lg flex items-center justify-center">
            <DotLottieReact
              src="/lottie/Online-Learning.lottie"
              loop
              autoplay
              className="w-full h-auto max-h-[480px] drop-shadow-md"
            />
          </div>
        </div>

        {/* RIGHT SIDE (Login Form Card) */}
        <div className="w-full lg:w-1/2 max-w-md flex flex-col items-center">
          <Card className="w-full bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl relative z-10 border-0 overflow-hidden">
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
              <CardContent className="p-6 space-y-5">
                {error && (
                  <div className="bg-red-100 text-red-600 text-sm p-3 rounded-md border border-red-200">
                    {error}
                  </div>
                )}

                {/* Email or Phone */}
                <div className="space-y-1.5">
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
                  <p className="text-[11px] text-gray-500">You can use your email address or phone number to login</p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
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

              <CardFooter className="flex flex-col space-y-3.5 p-6 pt-0">
                {/* Sign In button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-gradient-to-r from-[#0076CE] to-[#0055a3] 
                  hover:from-[#0066b8] hover:to-[#004488] text-white rounded-lg shadow-lg transition-all duration-300 
                  disabled:opacity-50 font-medium"
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
                    className="text-[#0076CE] hover:text-[#0055a3] hover:underline font-semibold"
                  >
                    Sign up
                  </Link>
                </p>

                {/* Policy links */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-500 text-center">
                  <Link to="/privacy" className="hover:text-saBlue hover:underline">
                    Privacy Policy
                  </Link>
                  <span>•</span>
                  <Link to="/terms-and-conditions" className="hover:text-saBlue hover:underline">
                    Terms & Conditions
                  </Link>
                  <span>•</span>
                  <Link to="/refund-policy" className="hover:text-saBlue hover:underline">
                    Refunds
                  </Link>
                </div>

                <div className="text-[11px] text-center text-slate-400">
                  Support: <a href="mailto:contact@studyasan.com" className="text-saBlue hover:underline">contact@studyasan.com</a> | <a href="tel:+917409888805" className="text-saBlue hover:underline">+91 74098 88805</a>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>

      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />

      {/* Footer copyright */}
      <div className="absolute bottom-2 inset-x-0 text-center pointer-events-none">
        <span className="text-[11px] text-slate-500">
          © {new Date().getFullYear()} StudyAsan. All rights reserved.
        </span>
      </div>
    </div>
  );
}
