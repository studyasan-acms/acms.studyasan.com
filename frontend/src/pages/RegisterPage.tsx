import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { authService } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      // DO NOT extract confirmPassword → fixes ESLint warning
      const registerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      };

      const response = await authService.register(registerData);
      setAuth(response.data.user, response.data.token);
      navigate("/dashboard");
    } catch (err: unknown) {
      // Type-safe error → fixes "Unexpected any" warning
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to register. Please try again.";

      setError(errorMessage);
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

      {/* RIGHT SIDE (Register Form) */}
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
              Create your account and start learning
            </p>
          </div>

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

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 text-sm">
                    Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE]"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-gray-700 text-sm"
                  >
                    Confirm Password
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-[#0076CE]/20 focus:border-[#0076CE]"
                  />
                </div>
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
                    Creating account...
                  </>
                ) : (
                  "Create Account"
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
