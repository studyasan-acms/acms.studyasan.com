import { useState, useEffect} from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
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

import { subjectService, boardService, classService } from '@/services/api';
import type { Board, Class, Subject, UpdateSubjectData } from '@/types';
import { useAuthStore } from '@/store/authStore';

import { ArrowLeft, Loader2, Save, Plus, Trash2 } from 'lucide-react';

import ErrorModal from '@/components/ui/errorModal';
import SuccessModal from '@/components/ui/successModal';

export default function EditSubjectPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [syllabusUnits, setSyllabusUnits] = useState<{ name: string; content: string }[]>([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitContent, setNewUnitContent] = useState('');

  const [formData, setFormData] = useState<UpdateSubjectData>({
    name: '',
    cover_image: null,
    class_id: null,
    board_id: null,
    syllabus: null,
    is_course: false,
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard/subjects');
      return;
    }
    fetchBoards();
    fetchClasses();
    if (id) fetchSubject(Number(id));
  }, [id, isAdmin, navigate]);

  const fetchSubject = async (subjectId: number) => {
    setIsLoading(true);

    try {
      const response = await subjectService.getById(subjectId);
      const data: Subject = response.data;

      setSubject(data);

      setFormData({
        name: data.name,
        cover_image: data.cover_image ?? null,
        class_id: data.class_id ?? null,
        board_id: data.board_id ?? null,
        syllabus: data.syllabus ?? null,
        is_course: data.is_course ?? false,
      });

      if (data.syllabus?.units) {
        setSyllabusUnits(data.syllabus.units);
      }
    } catch {
      setError('Failed to load subject data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoards = async () => {
    try {
      const res = await boardService.getAll({ limit: 100 });
      setBoards(res.data.data);
    } catch {}
  };

  const fetchClasses = async () => {
    try {
      const res = await classService.getAll({ limit: 100 });
      setClasses(res.data.data);
    } catch {}
  };

  const addUnit = () => {
    if (newUnitName.trim() && newUnitContent.trim()) {
      setSyllabusUnits((prev) => [
        ...prev,
        { name: newUnitName.trim(), content: newUnitContent.trim() },
      ]);
      setNewUnitName('');
      setNewUnitContent('');
    }
  };

  const removeUnit = (index: number) => {
    setSyllabusUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const syllabusData =
        syllabusUnits.length > 0 ? { units: syllabusUnits } : null;

      await subjectService.update(Number(id), {
        ...formData,
        syllabus: syllabusData,
      });

      setSuccess('Subject updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update subject');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof UpdateSubjectData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg font-medium">Subject not found</p>
        <Button onClick={() => navigate('/dashboard/subjects')} className="mt-4">
          Back to Subjects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <Link
          to="/dashboard/subjects"
          className="flex items-center text-blue-600 text-sm hover:underline w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Subjects
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Edit Subject</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Update information for {subject.name}
          </p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">Basic Information</CardTitle>
              <CardDescription>Subject details</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-600">
                  Subject Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleChange('name', e.target.value)
                  }
                  required
                  disabled={isSaving}
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label htmlFor="cover_image" className="text-gray-600">
                  Cover Image URL
                </Label>
                <Input
                  id="cover_image"
                  type="url"
                  value={formData.cover_image ?? ''}
                  onChange={(e) => handleChange('cover_image', e.target.value || null)}
                  disabled={isSaving}
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label className="text-gray-600">Type</Label>
                <Select
                  value={formData.is_course ? 'course' : 'subject'}
                  onValueChange={(value) => handleChange('is_course', value === 'course')}
                  disabled={isSaving}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subject">Subject</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Courses are standalone; subjects require class & board.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">Classification</CardTitle>
              <CardDescription>Class and board assignment</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Class */}
              <div className="space-y-2">
                <Label className="text-gray-600">Class</Label>
                <Select
                  value={formData.class_id?.toString() ?? 'none'}
                  onValueChange={(v) =>
                    handleChange('class_id', v === 'none' ? null : Number(v))
                  }
                  disabled={isSaving || formData.is_course}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formData.is_course && (
                  <p className="text-xs text-muted-foreground">
                    Class not required for courses
                  </p>
                )}
              </div>

              {/* Board */}
              <div className="space-y-2">
                <Label className="text-gray-600">Board</Label>
                <Select
                  value={formData.board_id?.toString() ?? 'none'}
                  onValueChange={(v) =>
                    handleChange('board_id', v === 'none' ? null : Number(v))
                  }
                  disabled={isSaving || formData.is_course}
                >
                  <SelectTrigger>
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
                  <p className="text-xs text-muted-foreground">
                    Board not required for courses
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Syllabus */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl text-gray-600">Syllabus</CardTitle>
            <CardDescription>Add or modify syllabus units</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder="Unit name"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                disabled={isSaving}
              />
              <Input
                placeholder="Unit content"
                value={newUnitContent}
                onChange={(e) => setNewUnitContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addUnit()}
                disabled={isSaving}
              />
            </div>

            <Button
              type="button"
              onClick={addUnit}
              disabled={!newUnitName.trim() || !newUnitContent.trim() || isSaving}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Unit
            </Button>

            {syllabusUnits.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {syllabusUnits.map((unit, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{unit.name}</div>
                      <div className="text-sm text-muted-foreground">{unit.content}</div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUnit(index)}
                      className="text-destructive"
                      disabled={isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No units added yet. Add units above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end space-x-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/subjects')}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Modals */}
      <ErrorModal
        open={!!error}
        title="Error"
        description={error}
        okText="Close"
        onConfirm={() => setError('')}
      />

      <SuccessModal
        open={!!success}
        title="Success"
        description={success}
        okText="OK"
        onConfirm={() => {
          setSuccess('');
          navigate('/dashboard/subjects');
        }}
      />
    </div>
  );
}
