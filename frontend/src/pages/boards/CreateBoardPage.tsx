import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { boardService } from "@/services/api";
import type { CreateBoardData } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SuccessModal from "@/components/ui/successModal";
import ErrorModal from "@/components/ui/errorModal";
import type { AxiosError } from "axios";

const CreateBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateBoardData>({ name: "" });
  const [errors, setErrors] = useState<Partial<CreateBoardData>>({});

  // Modals
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateBoardData> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Board name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await boardService.create(formData);
      setSuccessOpen(true);
    } catch (err: unknown) {
      // Narrow the type
      let message = "Failed to create board. Please try again.";
      const axiosErr = err as AxiosError<{ message?: string }>;

      if (axiosErr.response?.data?.message) {
        message = axiosErr.response.data.message;
      }

      setErrorMessage(message);
      setErrorOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* SUCCESS MODAL */}
      <SuccessModal
        open={successOpen}
        title="Board Created"
        description={`Board "${formData.name}" has been created successfully.`}
        showButtons={true}
        cancelText=""
        okText="OK"
        onConfirm={() => navigate("/dashboard/boards")}
        onClose={() => navigate("/dashboard/boards")}
      />

      {/* ERROR MODAL */}
      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        showButtons={true}
        cancelText=""
        okText="Close"
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col items-start gap-2">
        {/* Back Button */}
        <div
          onClick={() => navigate("/dashboard/boards")}
          className="inline-flex items-center text-sm sm:text-base text-blue-600 hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2 sm:h-5 sm:w-5" />
          Back to Boards
        </div>

        {/* Title and Subtitle */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">
            Create Board
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Add a new educational board
          </p>
        </div>
      </div>

      {/* Card */}
      <Card className="w-full max-w-full sm:max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-gray-600">
            Board Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Board Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., CBSE, ICSE, State Board"
                className={`${errors.name ? "border-red-500" : ""} w-full`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate("/dashboard/boards")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Board
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateBoardPage;
