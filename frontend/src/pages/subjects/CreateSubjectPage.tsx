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
import { subjectService, boardService, classService } from '@/services/api';
import type { Board, Class, CreateSubjectData } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, Loader2, Save, Plus, Trash2 } from 'lucide-react';
import ErrorModal from '@/components/ui/errorModal';
import SuccessModal from '@/components/ui/successModal';

export default function CreateSubjectPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [isLoading, setIsLoading] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syllabusUnits, setSyllabusUnits] = useState<{ name: string; content: string }[]>([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitContent, setNewUnitContent] = useState('');

  const [formData, setFormData] = useState<CreateSubjectData>({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const syllabusData = syllabusUnits.length > 0 ? { units: syllabusUnits } : null;
      await subjectService.create({ ...formData, syllabus: syllabusData });
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

  return (
    <div className="space-y-6">
      {/* --------------------------- HEADER --------------------------- */}
      <div className="flex flex-col space-y-2">
        <Link
          to="/dashboard/subjects"
          className="flex items-center text-blue-600 text-sm hover:underline w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Subjects
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Add New Subject</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create a new subject or course
          </p>
        </div>
      </div>
      {/* --------------------------------------------------------------- */}

      {/* --------------------------- FORM ------------------------------ */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className='sm:text-xl text-xl text-gray-600'>Basic Information</CardTitle>
              <CardDescription>Subject details</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className='text-gray-600'>Subject Name *</Label>
                <Input
                  id="name"
                  placeholder="Mathematics"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_image" className='text-gray-600'>Cover Image URL</Label>
                <Input
                  id="cover_image"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.cover_image ?? ''}
                  onChange={(e) => handleChange('cover_image', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="is_course" className='text-gray-600'>Type</Label>
                <Select
                  value={formData.is_course ? 'course' : 'subject'}
                  onValueChange={(value) => handleChange('is_course', value === 'course')}
                  disabled={isLoading}
                >
                  <SelectTrigger id="is_course">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subject">Subject</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Courses are standalone; subjects require class/board
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Classification Card */}
          <Card>
            <CardHeader>
              <CardTitle className='sm:text-xl text-xl text-gray-600'>Classification</CardTitle>
              <CardDescription>Class and board assignment</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class" className='text-gray-600'>Class</Label>
                <Select
                  value={formData.class_id?.toString() || 'none'}
                  onValueChange={(value) =>
                    handleChange('class_id', value === 'none' ? null : parseInt(value))
                  }
                  disabled={isLoading || formData.is_course}
                >
                  <SelectTrigger id="class">
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
                  <p className="text-xs text-muted-foreground">Class not required for courses</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="board" className='text-gray-600'>Board</Label>
                <Select
                  value={formData.board_id?.toString() || 'none'}
                  onValueChange={(value) =>
                    handleChange('board_id', value === 'none' ? null : parseInt(value))
                  }
                  disabled={isLoading || formData.is_course}
                >
                  <SelectTrigger id="board">
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
                  <p className="text-xs text-muted-foreground">Board not required for courses</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Syllabus Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className='sm:text-xl text-xl text-gray-600'>Syllabus</CardTitle>
            <CardDescription>Add optional syllabus units</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  placeholder="Unit name (e.g., Algebra Basics)"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  disabled={isLoading}
                />
                <Input
                  placeholder="Unit description/content"
                  value={newUnitContent}
                  onChange={(e) => setNewUnitContent(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addUnit()}
                  disabled={isLoading}
                />
              </div>

              <Button
                type="button"
                onClick={addUnit}
                disabled={!newUnitName.trim() || !newUnitContent.trim() || isLoading}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </div>

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
                      className="text-destructive hover:text-destructive"
                      disabled={isLoading}
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
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isLoading}>
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
