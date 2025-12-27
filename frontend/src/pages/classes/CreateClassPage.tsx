import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { classService } from '@/services/api';
import type { CreateClassData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import type { AxiosError } from 'axios';

const CreateClassPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateClassData>({ name: '' });
  const [errors, setErrors] = useState<Partial<CreateClassData>>({});

  // Modals
  const [successOpen, setSuccessOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateClassData> = {};
    if (!formData.name.trim()) newErrors.name = 'Class name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await classService.create(formData);
      setSuccessOpen(true);
    } catch (err: unknown) {
      let message = 'Failed to create class. Please try again.';
      const axiosErr = err as AxiosError<{ message?: string }>;
      if (axiosErr.response?.data?.message) message = axiosErr.response.data.message;
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
        title="Class Created"
        description={`Class "${formData.name}" has been created successfully.`}
        showButtons
        cancelText=""
        okText="OK"
        onConfirm={() => navigate('/dashboard/classes')}
        onClose={() => navigate('/dashboard/classes')}
      />

      {/* ERROR MODAL */}
      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        showButtons
        cancelText=""
        okText="Close"
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col items-start gap-2">
        <div
          onClick={() => navigate('/dashboard/classes')}
          className="inline-flex items-center text-sm sm:text-base text-blue-600 hover:underline cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2 sm:h-5 sm:w-5" />
          Back to Classes
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Create Class</h1>
          <p className="text-gray-400 text-sm sm:text-base">Add a new class level</p>
        </div>
      </div>

      {/* Card */}
      <Card className="w-full max-w-full sm:max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl text-gray-600">Class Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Class 10, Class 12, Grade 5"
                className={`${errors.name ? 'border-red-500' : ''} w-full`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate('/dashboard/classes')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Class
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

export default CreateClassPage;
