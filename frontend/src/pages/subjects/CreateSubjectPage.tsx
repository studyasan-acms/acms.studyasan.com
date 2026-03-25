import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { subjectService, boardService, classService, currencyService } from '@/services/api';
import type { Board, Class, CreateSubjectData, Currency } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Loader2, Save, Plus, Trash2, Camera, UploadCloud, BookOpen, Globe, Users, Coins } from 'lucide-react';
import ErrorModal from '@/components/ui/errorModal';
import SuccessModal from '@/components/ui/successModal';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import { usePageTitle } from "@/hooks/usePageTitle";

export default function CreateSubjectPage() {
  usePageTitle("Add New Subject");
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [isLoading, setIsLoading] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syllabusUnits, setSyllabusUnits] = useState<{ name: string; content: string }[]>([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitContent, setNewUnitContent] = useState('');

  // Image upload state
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState<CreateSubjectData>({
    name: '',
    cover_image: null,
    class_id: null,
    board_id: null,
    syllabus: null,
    is_course: false,
    end_date: null,
    price: null,
    currency_id: null,
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard/subjects');
      return;
    }
    fetchBoards();
    fetchClasses();
    fetchCurrencies();
  }, [isAdmin, navigate]);

  const fetchBoards = async () => {
    try {
      const response = await boardService.getAll({ limit: 100 });
      setBoards(response.data.data);
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll({ limit: 100 });
      setClasses(response.data.data);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const currencies = await currencyService.getAll();
      setCurrencies(currencies);
    } catch (err) {
      console.error('Failed to fetch currencies:', err);
    }
  };

  const addUnit = () => {
    if (newUnitName.trim() && newUnitContent.trim()) {
      setSyllabusUnits([
        ...syllabusUnits,
        { name: newUnitName.trim(), content: newUnitContent.trim() },
      ]);
      setNewUnitName('');
      setNewUnitContent('');
    }
  };

  const removeUnit = (index: number) => {
    setSyllabusUnits(syllabusUnits.filter((_, i) => i !== index));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Image must be less than 5MB');
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image file (JPEG, PNG, WebP)');
        return;
      }

      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const syllabusData = syllabusUnits.length > 0 ? { units: syllabusUnits } : null;

      const submitData: CreateSubjectData = {
        ...formData,
        syllabus: syllabusData,
        cover_image: coverImageFile // Send the file instead of a URL
      };

      await subjectService.create(submitData);
      setSuccess('Subject created successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create subject');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof CreateSubjectData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }));
  };

  const FormLabel = ({ children, icon: Icon, required }: { children: React.ReactNode, icon?: any, required?: boolean }) => (
    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
      {required && <span className="text-red-500 text-lg leading-none ml-0.5">*</span>}
    </Label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      {/* --------------------------- HEADER --------------------------- */}
      <div className="flex flex-col space-y-3">
        <Link
          to="/dashboard/subjects"
          className="flex items-center text-muted-foreground hover:text-saBlue transition-colors w-fit text-xs font-medium"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Subjects
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Add New Subject</h1>
          <p className="text-gray-500 mt-0.5 text-xs">Create a new subject or course and define its curriculum</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Cover Image Card */}
          <Card className="md:col-span-1 rounded-2xl border-gray-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 p-4">
              <FormLabel icon={Camera}>Cover Image</FormLabel>
            </CardHeader>
            <CardContent className="flex flex-col items-center p-4 pt-0">
              <div
                className="relative group cursor-pointer w-full aspect-video rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center transition-all hover:border-saBlue/50 hover:bg-gray-100/50"
                onClick={() => document.getElementById('cover-image-upload')?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-gray-400">
                    <UploadCloud className="w-6 h-6 mb-1.5" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider">Upload Image</span>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-5 h-5" />
                </div>
              </div>

              <div className="mt-3 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-saBlue hover:bg-blue-50 text-[10px] h-8 font-bold"
                  onClick={() => document.getElementById('cover-image-upload')?.click()}
                >
                  Change Image
                </Button>
                <p className="text-[9px] text-gray-400 mt-0.5">
                  JPG, PNG, WEBP (Max 5MB)
                </p>
              </div>

              <input
                id="cover_image-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
              <input
                id="cover-image-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Basic Information Card */}
          <Card className="md:col-span-2 rounded-2xl border-gray-100 shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className='text-lg text-gray-700'>Basic Information</CardTitle>
              <CardDescription className="text-xs">Essential details about the subject</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-4 pt-2">
              <div className="space-y-1.5">
                <FormLabel icon={BookOpen} required>Subject Name</FormLabel>
                <Input
                  id="name"
                  placeholder="e.g. Mathematics"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FormLabel>Type</FormLabel>
                  <Select
                    value={formData.is_course ? 'course' : 'subject'}
                    onValueChange={(value) => handleChange('is_course', value === 'course')}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="is_course" className="h-10 rounded-xl bg-gray-50 border-gray-200 text-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subject">Subject</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <FormLabel icon={Coins}>Price</FormLabel>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price ?? ''}
                    onChange={(e) => handleChange('price', e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={isLoading}
                    className="h-10 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
                  />
                </div>
              </div>

              {formData.is_course && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                  <FormLabel>Course End Date</FormLabel>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date ?? ''}
                    onChange={(e) => handleChange('end_date', e.target.value || null)}
                    disabled={isLoading}
                    className="h-10 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors text-sm"
                  />
                </div>
              )}

              {formData.price !== null && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <FormLabel>Currency</FormLabel>
                  <Select
                    value={formData.currency_id?.toString() ?? ''}
                    onValueChange={(value) => handleChange('currency_id', value ? parseInt(value) : null)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="currency_id" className="h-10 rounded-xl bg-gray-50 border-gray-200 text-sm">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id.toString()}>
                          {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Classification Card */}
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className='text-lg text-gray-700'>Classification</CardTitle>
            <CardDescription className="text-xs">Academic assignment for better organization</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 p-4 pt-2">
              <div className="space-y-1.5">
                <FormLabel icon={Users}>Class</FormLabel>
                <Select
                  value={formData.class_id?.toString() || 'none'}
                  onValueChange={(value) =>
                    handleChange('class_id', value === 'none' ? null : parseInt(value))
                  }
                  disabled={isLoading || formData.is_course}
                >
                  <SelectTrigger id="class" className="h-10 rounded-xl bg-gray-50 border-gray-200 text-sm">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SearchablePaginatedSelect
                      searchPlaceholder="Search class..."
                      options={[
                        { value: 'none', label: 'None' },
                        ...classes.map((cls) => ({ value: cls.id.toString(), label: cls.name })),
                      ]}
                    />
                  </SelectContent>
                </Select>
                {formData.is_course && (
                  <p className="text-[10px] text-gray-400 mt-1 italic">Not required for standalone courses</p>
                )}
              </div>

              <div className="space-y-1.5">
                <FormLabel icon={Globe}>Board</FormLabel>
                <Select
                  value={formData.board_id?.toString() || 'none'}
                  onValueChange={(value) =>
                    handleChange('board_id', value === 'none' ? null : parseInt(value))
                  }
                  disabled={isLoading || formData.is_course}
                >
                  <SelectTrigger id="board" className="h-10 rounded-xl bg-gray-50 border-gray-200 text-sm">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id.toString()}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.is_course && (
                  <p className="text-[10px] text-gray-400 mt-1 italic">Not required for standalone courses</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Syllabus Card */}
        <Card className="rounded-2xl border-gray-100 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className='text-lg text-gray-700'>Syllabus</CardTitle>
            <CardDescription className="text-xs">Define the curriculum and learning units</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-4 pt-2">
            <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <FormLabel>Unit Name</FormLabel>
                  <Input
                    placeholder="e.g. Algebra Basics"
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    disabled={isLoading}
                    className="bg-white h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <FormLabel>Content Description</FormLabel>
                  <Input
                    placeholder="Brief overview"
                    value={newUnitContent}
                    onChange={(e) => setNewUnitContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addUnit()}
                    disabled={isLoading}
                    className="bg-white h-9 text-xs"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={addUnit}
                disabled={!newUnitName.trim() || !newUnitContent.trim() || isLoading}
                variant="outline"
                className="w-full h-9 rounded-lg border-saBlue/20 text-saBlue hover:bg-saBlue/5 font-semibold text-[10px] uppercase tracking-wider"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Syllabus Unit
              </Button>
            </div>

            {syllabusUnits.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">Current Curriculum</p>
                <div className="space-y-2 max-h-60 overflow-y-auto px-1 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                  {syllabusUnits.map((unit, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 group hover:border-saBlue/30 hover:shadow-sm transition-all">
                      <div className="w-6 h-6 rounded-lg bg-saBlue/10 flex items-center justify-center text-saBlue text-[10px] font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-700 text-xs truncate">{unit.name}</div>
                        <div className="text-[10px] text-gray-400 truncate mt-0.5">{unit.content}</div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUnit(index)}
                        className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg h-7 w-7"
                        disabled={isLoading}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-gray-50/30 rounded-xl border border-dashed border-gray-200">
                <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No units added yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/dashboard/subjects')}
            className="w-full sm:w-auto h-11 rounded-xl text-gray-500 hover:text-gray-700 font-medium text-xs"
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto h-11 rounded-xl bg-saBlue hover:bg-saBlue/90 shadow-lg shadow-saBlue/30 min-w-[140px] font-bold uppercase tracking-wider text-[10px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Subject
              </>
            )}
          </Button>
        </div>
      </form>

      {/* ------------------------ MODALS ------------------------ */}
      <ErrorModal
        open={!!error}
        title="Form Error"
        description={error}
        okText="Got it"
        onConfirm={() => setError('')}
      />

      <SuccessModal
        open={!!success}
        title="Subject Created"
        description={success}
        okText="Done"
        onConfirm={() => {
          setSuccess('');
          navigate('/dashboard/subjects');
        }}
      />
    </div>
  );
}
