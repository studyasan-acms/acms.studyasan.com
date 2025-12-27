import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Video, MapPin, RefreshCw, Info } from 'lucide-react';
import { classSessionService, subjectService, teacherService, classService, boardService } from '@/services/api';
import type { Subject, Teacher, Class, Board, CreateClassSessionData, ClassSession, RecurrenceRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/authStore';

// Import your modals
import ErrorModal from '@/components/ui/errorModal';
import SuccessModal from '@/components/ui/successModal';

export default function CreateClassSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);

  // 🔥 Modal States
  const [errorModal, setErrorModal] = useState({
    open: false,
    title: '',
    description: '',
  });

  const [successModal, setSuccessModal] = useState({
    open: false,
    title: '',
    description: '',
  });

  const [formData, setFormData] = useState<CreateClassSessionData>({
    teacher_id: 0,
    subject_id: 0,
    class_id: null,
    board_id: null,
    mode: 'ONLINE',
    location: null,
    meeting_link: null,
    start_time: '',
    end_time: '',
    is_recurring: false,
    recurrence_rule: null,
    title: '',
    description: '',
    create_google_meet: true,
  });

  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>({
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [],
    endDate: '',
    count: undefined,
  });

  const isAdmin = user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [subjectsRes, classesRes, boardsRes] = await Promise.all([
        subjectService.getAll(),
        classService.getAll(),
        boardService.getAll(),
      ]);
      setSubjects(subjectsRes.data.data);
      setClasses(classesRes.data.data);
      setBoards(boardsRes.data.data);

      if (isAdmin) {
        const teachersRes = await teacherService.getAll();
        setTeachers(teachersRes.data.data);
      }

      // Editing case
      if (id) {
        const sessionRes = await classSessionService.getById(parseInt(id));
        const session: ClassSession = sessionRes.data;

        // datetime-local formatting
        const formatForInput = (dateStr: string) => {
          const date = new Date(dateStr);
          return date.toISOString().slice(0, 16);
        };

        setFormData({
          teacher_id: session.teacher_id,
          subject_id: session.subject_id,
          class_id: session.class_id,
          board_id: session.board_id,
          mode: session.mode,
          location: session.location,
          meeting_link: session.meeting_link,
          start_time: formatForInput(session.start_time),
          end_time: formatForInput(session.end_time),
          is_recurring: session.is_recurring,
          recurrence_rule: session.recurrence_rule,
          create_google_meet: false,
        });

        if (session.recurrence_rule) setRecurrenceRule(session.recurrence_rule);
      }
    } catch (error) {
      setErrorModal({
        open: true,
        title: 'Fetch Error',
        description: 'Failed to load session data.',
      });
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-set teacher for non-admin
  useEffect(() => {
    if (!isAdmin && teachers.length > 0 && user?.id) {
      const myTeacher = teachers.find((t) => t.user_id === user.id);
      if (myTeacher) {
        setFormData((prev) => ({ ...prev, teacher_id: myTeacher.id }));
      }
    }
  }, [isAdmin, teachers, user?.id]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.teacher_id || !formData.subject_id) {
      return setErrorModal({
        open: true,
        title: 'Missing Required Fields',
        description: 'Please select both teacher and subject.',
      });
    }

    if (!formData.start_time || !formData.end_time) {
      return setErrorModal({
        open: true,
        title: 'Invalid Time',
        description: 'Start and end time are required.',
      });
    }

    if (formData.mode === 'OFFLINE' && !formData.location) {
      return setErrorModal({
        open: true,
        title: 'Location Required',
        description: 'Offline sessions must include a location.',
      });
    }

    try {
      setSubmitting(true);
      
      const dataToSubmit = {
        ...formData,
        recurrence_rule: formData.is_recurring ? recurrenceRule : null,
      };

      if (isEditing && id) {
        await classSessionService.update(parseInt(id), dataToSubmit);

        setSuccessModal({
          open: true,
          title: 'Session Updated!',
          description: 'The class session was successfully updated.',
        });

      } else {
        await classSessionService.create(dataToSubmit);

        setSuccessModal({
          open: true,
          title: 'Session Created!',
          description: 'The class session has been scheduled successfully.',
        });
      }

      setTimeout(() => navigate('/dashboard/class-sessions'), 1500);
    } catch (error: any) {
      setErrorModal({
        open: true,
        title: 'Save Failed',
        description: error.response?.data?.message || 'Something went wrong.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDayToggle = (day: number) => {
    setRecurrenceRule((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek?.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...(prev.daysOfWeek || []), day].sort(),
    }));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* BACK LINK */}
      <div className="mb-6">
        <a
          onClick={() => navigate('/dashboard/class-sessions')}
          className="inline-flex items-center text-blue-600 hover:underline cursor-pointer w-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Sessions
        </a>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl text-gray-600">
            {isEditing ? 'Edit Class Session' : 'Schedule New Class Session'}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                  formData.mode === 'ONLINE'
                    ? 'border-saBlue bg-saBlueLight/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, mode: 'ONLINE' }))}
              >
                <Video className={`w-8 h-8 ${formData.mode === 'ONLINE' ? 'text-saBlue' : 'text-gray-400'}`} />
                <span className={`font-medium ${formData.mode === 'ONLINE' ? 'text-saBlue' : 'text-gray-600'}`}>
                  Online
                </span>
              </button>
              <button
                type="button"
                className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                  formData.mode === 'OFFLINE'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, mode: 'OFFLINE' }))}
              >
                <MapPin className={`w-8 h-8 ${formData.mode === 'OFFLINE' ? 'text-amber-500' : 'text-gray-400'}`} />
                <span className={`font-medium ${formData.mode === 'OFFLINE' ? 'text-amber-600' : 'text-gray-600'}`}>
                  In-Person
                </span>
              </button>
            </div>

            {/* Subject & Teacher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject" className='text-gray-600'>Subject *</Label>
                <select
                  id="subject"
                  className="w-full p-2 border rounded-md mt-1"
                  value={formData.subject_id || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject_id: parseInt(e.target.value) }))}
                  required
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div>
                  <Label htmlFor="teacher" className='text-gray-600'>Teacher *</Label>
                  <select
                    id="teacher"
                    className="w-full p-2 border rounded-md mt-1"
                    value={formData.teacher_id || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, teacher_id: parseInt(e.target.value) }))}
                    required
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.user.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Class & Board (optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="class" className='text-gray-600'>Class (Optional)</Label>
                <select
                  id="class"
                  className="w-full p-2 border rounded-md mt-1"
                  value={formData.class_id || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, class_id: e.target.value ? parseInt(e.target.value) : null }))}
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="board" className='text-gray-600'>Board (Optional)</Label>
                <select
                  id="board"
                  className="w-full p-2 border rounded-md mt-1"
                  value={formData.board_id || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, board_id: e.target.value ? parseInt(e.target.value) : null }))}
                >
                  <option value="">All Boards</option>
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time" className='text-gray-600'>Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  className="mt-1"
                  value={formData.start_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_time" className='text-gray-600'>End Time *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  className="mt-1"
                  value={formData.end_time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Mode-specific fields */}
            {formData.mode === 'ONLINE' && !isEditing && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Switch
                    id="create_google_meet"
                    checked={formData.create_google_meet}
                    onCheckedChange={(checked: boolean) => setFormData((prev) => ({ ...prev, create_google_meet: checked }))}
                  />
                  <Label htmlFor="create_google_meet" className="flex items-center gap-2 cursor-pointer text-gray-600">
                    <Video className="w-4 h-4 text-saBlue/50" />
                    Auto-create Google Meet
                  </Label>
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-10">
                  Automatically creates a Google Meet link and invites enrolled students
                </p>
              </div>
            )}

            {formData.mode === 'ONLINE' && !formData.create_google_meet && (
              <div>
                <Label htmlFor="meeting_link">Meeting Link</Label>
                <Input
                  id="meeting_link"
                  type="url"
                  className="mt-1"
                  placeholder="https://meet.google.com/..."
                  value={formData.meeting_link || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, meeting_link: e.target.value }))}
                />
              </div>
            )}

            {formData.mode === 'OFFLINE' && (
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  type="text"
                  className="mt-1"
                  placeholder="e.g., Room 101, Main Building"
                  value={formData.location || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  required={formData.mode === 'OFFLINE'}
                />
              </div>
            )}

            {/* Optional title & description */}
            <div>
              <Label htmlFor="title" className='text-gray-600'>Session Title (Optional)</Label>
              <Input
                id="title"
                type="text"
                className="mt-1"
                placeholder="Custom title for this session"
                value={formData.title || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description" className='text-gray-600'>Description (Optional)</Label>
              <textarea
                id="description"
                className="w-full p-2 border rounded-md mt-1 min-h-[80px]"
                placeholder="Add any notes or agenda for this session..."
                value={formData.description || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Recurring Session */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <Switch
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked: boolean) => setFormData((prev) => ({ ...prev, is_recurring: checked }))}
                />
                <Label htmlFor="is_recurring" className="flex items-center gap-2 cursor-pointer text-gray-600">
                  <RefreshCw className="w-4 h-4 text-saBlue/50" />
                  Make this a recurring class
                </Label>
              </div>

              {formData.is_recurring && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Frequency</Label>
                      <select
                        className="w-full p-2 border rounded-md mt-1"
                        value={recurrenceRule.frequency}
                        onChange={(e) => setRecurrenceRule((prev) => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <Label>Every</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={recurrenceRule.interval || 1}
                          onChange={(e) => setRecurrenceRule((prev) => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                          className="w-20"
                        />
                        <span className="text-gray-600">
                          {recurrenceRule.frequency === 'daily' ? 'day(s)' :
                           recurrenceRule.frequency === 'weekly' ? 'week(s)' : 'month(s)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {recurrenceRule.frequency === 'weekly' && (
                    <div>
                      <Label>On Days</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {dayNames.map((day, index) => (
                          <label
                            key={day}
                            className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all ${
                              recurrenceRule.daysOfWeek?.includes(index)
                                ? 'bg-saBlue text-white border-saBlue'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <Checkbox
                              checked={recurrenceRule.daysOfWeek?.includes(index)}
                              onCheckedChange={() => handleDayToggle(index)}
                              className="hidden"
                            />
                            {day}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>End Date (Optional)</Label>
                      <Input
                        type="date"
                        className="mt-1"
                        value={recurrenceRule.endDate || ''}
                        onChange={(e) => setRecurrenceRule((prev) => ({ ...prev, endDate: e.target.value, count: undefined }))}
                      />
                    </div>

                    <div>
                      <Label>Or Number of Occurrences</Label>
                      <Input
                        type="number"
                        min={1}
                        max={52}
                        className="mt-1"
                        placeholder="e.g., 10"
                        value={recurrenceRule.count || ''}
                        onChange={(e) => setRecurrenceRule((prev) => ({ ...prev, count: e.target.value ? parseInt(e.target.value) : undefined, endDate: '' }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <Info className="w-5 h-5 text-saBlue/50 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-600">Notification</p>
                <p>All enrolled students will receive a notification about this class session when it's created.</p>
              </div>
            </div>

            {/* Submit Buttons */}
             <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1"
                onClick={() => navigate('/dashboard/class-sessions')}
              >
                Cancel
              </Button>

              <Button type="submit" className="flex-1 bg-saBlue hover:bg-saBlueDarkHover text-white" disabled={submitting}>
                {submitting ? 'Saving...' : isEditing ? 'Update Session' : 'Schedule Session'}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>

      {/* 🔥 SUCCESS MODAL */}
      <SuccessModal
        open={successModal.open}
        title={successModal.title}
        description={successModal.description}
        autoClose={1500}
        onClose={() => setSuccessModal({ ...successModal, open: false })}
      />

      {/* 🔥 ERROR MODAL */}
      <ErrorModal
        open={errorModal.open}
        title={errorModal.title}
        description={errorModal.description}
        okText="Close"
        onConfirm={() => setErrorModal({ ...errorModal, open: false })}
        onClose={() => setErrorModal({ ...errorModal, open: false })}
      />

    </div>
  );
}
