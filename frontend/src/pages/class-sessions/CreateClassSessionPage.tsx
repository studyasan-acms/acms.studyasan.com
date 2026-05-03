import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Video, MapPin, RefreshCw, Info, BookOpen, Calendar, Settings, ChevronRight, Check } from 'lucide-react';
import { classSessionService, subjectService, teacherService, classService, boardService, profileService } from '@/services/api';
import type { Subject, Teacher, Class, Board, CreateClassSessionData, ClassSession, RecurrenceRule } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/authStore';

// Import your modals
import ErrorModal from '@/components/ui/errorModal';
import SuccessModal from '@/components/ui/successModal';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import { usePageTitle } from "@/hooks/usePageTitle";

type SubjectPageResponse = {
  data?: Subject[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
};

export default function CreateClassSessionPage() {
  usePageTitle("Schedule Session");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectPage, setSubjectPage] = useState(1);
  const [subjectTotalPages, setSubjectTotalPages] = useState(1);
  const [subjectLoading, setSubjectLoading] = useState(false);
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

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CreateClassSessionData>({
    teacher_id: 0,
    subject_id: 0,
    class_id: null,
    board_id: null,
    mode: 'ONLINE',
    location: null,
    meeting_link: null,
    emergency_meeting_link: null,
    start_time: '',
    end_time: '',
    is_recurring: false,
    recurrence_rule: null,
    title: '',
    description: '',
    create_google_meet: false, // Disabled - using integrated classroom
  });

  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>({
    frequency: 'weekly',
    interval: 1,
    daysOfWeek: [],
    endDate: '',
    count: undefined,
  });

  const isAdmin = user?.role === 'ADMIN';

  const fetchSubjects = useCallback(async (page: number, search: string, classId: number | null) => {
    try {
      setSubjectLoading(true);
      const subjectsRes = await subjectService.getAll({
        page,
        limit: 10,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(classId ? { class_id: classId } : {}),
      });

      const payload = subjectsRes.data?.data as Subject[] | SubjectPageResponse | undefined;
      const pageSubjects = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as SubjectPageResponse)?.data)
          ? (payload as SubjectPageResponse).data || []
          : [];

      const totalPages = Array.isArray(payload)
        ? 1
        : Math.max(1, (payload as SubjectPageResponse)?.pagination?.totalPages || 1);

      setSubjects(pageSubjects);
      setSubjectTotalPages(totalPages);
    } catch (error) {
      console.error('Failed to fetch subjects', error);
      setSubjects([]);
      setSubjectTotalPages(1);
    } finally {
      setSubjectLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [classesRes, boardsRes] = await Promise.all([
        classService.getAll({ page: 1, limit: 100 }),
        boardService.getAll(),
      ]);
      setClasses(Array.isArray(classesRes.data?.data) ? classesRes.data.data : []);
      setBoards(Array.isArray(boardsRes.data?.data) ? boardsRes.data.data : []);

      if (isAdmin) {
        const teachersRes = await teacherService.getAll();
        setTeachers(teachersRes.data.data);
      }

      // Editing case
      if (id) {
        const sessionRes = await classSessionService.getById(parseInt(id));
        const session: ClassSession = sessionRes.data;

        // datetime-local formatting - convert UTC to local time
        const formatForInput = (dateStr: string) => {
          const date = new Date(dateStr);
          // Get local date-time string in the format needed for datetime-local input
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        setFormData({
          teacher_id: session.teacher_id,
          subject_id: session.subject_id,
          class_id: session.class_id,
          board_id: session.board_id,
          mode: session.mode,
          location: session.location,
          meeting_link: session.meeting_link,
          emergency_meeting_link: session.emergency_meeting_link,
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

  useEffect(() => {
    fetchSubjects(subjectPage, subjectSearch, formData.class_id ?? null);
  }, [fetchSubjects, subjectPage, subjectSearch, formData.class_id]);

  // Auto-set teacher for non-admin
  useEffect(() => {
    if (!isAdmin && user?.id) {
      // For teachers, we'll auto-set their ID once we know their teacher record
      const fetchTeacherRecord = async () => {
        try {
          const res = await profileService.getProfile();
          if (res.data?.teacher?.id) {
            setFormData(prev => ({ ...prev, teacher_id: res.data.teacher.id }));
          }
        } catch (err) {
          console.error("Failed to fetch teacher record", err);
        }
      };
      fetchTeacherRecord();
    }
  }, [isAdmin, user?.id]);

  // 🔥 Handle Subject Selection change
  const handleSubjectChange = async (subjectId: number) => {
    if (!subjectId) {
      setFormData(prev => ({ ...prev, subject_id: 0, class_id: null, board_id: null }));
      return;
    }

    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      setFormData(prev => ({
        ...prev,
        subject_id: subjectId,
        class_id: subject.class_id,
        board_id: subject.board_id
      }));

      // Fetch teachers for this subject
      try {
        const res = await teacherService.getBySubject(subjectId);
        const subjectTeachers = res.data;
        setTeachers(subjectTeachers);

        // Auto-select if only one teacher
        if (subjectTeachers.length === 1) {
          setFormData(prev => ({ ...prev, teacher_id: subjectTeachers[0].id }));
        } else if (!isAdmin && user?.id) {
          // If teacher, see if they are in the list
          const me = subjectTeachers.find((t: Teacher) => t.user_id === user.id);
          if (me) {
            setFormData(prev => ({ ...prev, teacher_id: me.id }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch teachers for subject", err);
      }
    }
  };

  const handleClassChange = (classId: number | null) => {
    setFormData(prev => ({ ...prev, class_id: classId, subject_id: 0 }));
  };

  const filteredSubjects = subjects.filter((subject) => {
    const isEndedCourse = Boolean(
      subject.is_course && subject.end_date && new Date(subject.end_date) < new Date()
    );

    return !isEndedCourse;
  });

  useEffect(() => {
    setSubjectPage(1);
  }, [subjectSearch, formData.class_id]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // STEP-BY-STEP FLOW LOGIC
    if (currentStep === 1) {
      if (!formData.subject_id || !formData.teacher_id) {
        return setErrorModal({
          open: true,
          title: 'Required Selection',
          description: 'Please select both a subject and a teacher to continue.',
        });
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!formData.start_time || !formData.end_time) {
        return setErrorModal({
          open: true,
          title: 'Timing Required',
          description: 'Please set the session start and end times.',
        });
      }
      if (formData.mode === 'OFFLINE' && !formData.location) {
        return setErrorModal({
          open: true,
          title: 'Location Required',
          description: 'Offline sessions must include a location.',
        });
      }
      generateAutoTitle();
      setCurrentStep(3);
      return;
    }

    // FINAL SUBMISSION (STEP 3)
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

      // Convert local datetime to UTC ISO string for backend
      const convertToUTC = (localDateTimeString: string) => {
        // datetime-local input value is interpreted as local time by JavaScript
        // Simply creating a Date and converting to ISO gives us the UTC equivalent
        return new Date(localDateTimeString).toISOString();
      };

      const dataToSubmit = {
        ...formData,
        start_time: convertToUTC(formData.start_time),
        end_time: convertToUTC(formData.end_time),
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

  // 🔥 UI Helpers
  const nextStep = () => {
    // This is now mostly handled by handleSubmit, but we'll keep it for the button click
    const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
    handleSubmit(fakeEvent);
  };

  const generateAutoTitle = () => {
    if (formData.title && !isEditing) return; // Don't overwrite if already there (unless it was auto-gen)

    const subject = subjects.find(s => s.id === formData.subject_id);
    const cls = classes.find(c => c.id === formData.class_id);
    const board = boards.find(b => b.id === formData.board_id);

    if (!subject) return;

    let timeStr = "";
    if (formData.start_time) {
      const date = new Date(formData.start_time);
      timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const titleParts = [
      cls?.name,
      board?.name,
      subject.name,
      timeStr
    ].filter(Boolean);

    setFormData(prev => ({ ...prev, title: titleParts.join(' - ') }));
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const Stepper = () => {
    const steps = [
      { id: 1, name: 'Subject', icon: BookOpen },
      { id: 2, name: 'Schedule', icon: Calendar },
      { id: 3, name: 'Refine', icon: Settings },
    ];
    return (
      <div className="flex items-center justify-between mb-8 max-w-2xl mx-auto">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep > step.id
                  ? 'bg-green-500 text-white'
                  : currentStep === step.id
                    ? 'bg-saBlue text-white ring-2 ring-saBlue/10 scale-105'
                    : 'bg-gray-100 text-gray-400'
                  }`}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${currentStep === step.id ? 'text-saBlue' : 'text-gray-400'}`}>
                {step.name}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`flex-1 h-[2px] mx-4 -mt-6 min-w-[30px] ${currentStep > step.id ? 'bg-green-300' : 'bg-gray-100'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-saBlue/20 border-t-saBlue rounded-full animate-spin" />
        <div className="text-gray-400 animate-pulse font-medium">Preparing Session Builder...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-4 px-2 sm:px-4">

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate('/dashboard/class-sessions')}
            className="group flex items-center text-sm text-gray-500 hover:text-saBlue transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Back to Sessions
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">
            {isEditing ? 'Edit Session' : 'Schedule Class'}
          </h1>
        </div>
      </div>

      <Stepper />

      <Card className="border border-gray-100 shadow-md shadow-gray-200/20 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit}>
            <div className="p-6 sm:p-10 min-h-[400px]">
              {/* STEP 1: SUBJECT & TEACHER */}
              {currentStep === 1 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Target Audience</h3>
                      </div>

                      <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
                        <div>
                          <Label className='text-[10px] font-semibold text-gray-400 uppercase tracking-widest'>Optional Class Filter</Label>
                          <Select
                            value={formData.class_id ? String(formData.class_id) : 'all'}
                            onValueChange={(value) => handleClassChange(value === 'all' ? null : parseInt(value))}
                          >
                            <SelectTrigger className="w-full h-11 border border-gray-100 bg-white rounded-xl mt-2 text-sm font-medium text-gray-700 focus:ring-2 focus:ring-saBlue/10">
                              <SelectValue placeholder="All Classes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SearchablePaginatedSelect
                                searchPlaceholder="Search class..."
                                options={[
                                  { value: 'all', label: 'All Classes' },
                                  ...classes.map((cls) => ({ value: String(cls.id), label: cls.name })),
                                ]}
                              />
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className='text-[10px] font-semibold text-gray-400 uppercase tracking-widest'>Board (Auto)</Label>
                          <div className="w-full p-3 bg-gray-50 rounded-xl mt-2 text-xs text-gray-500 font-medium border border-gray-100">
                            {formData.board_id ? boards.find(b => b.id === formData.board_id)?.name : 'Auto-detected'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-saBlue/5 flex items-center justify-center border border-saBlue/10">
                          <Check className="w-4 h-4 text-saBlue" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-800">Primary Details</h3>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <Label className='text-[10px] font-bold text-saBlue uppercase tracking-widest'>Subject *</Label>
                          <Select
                            value={formData.subject_id ? String(formData.subject_id) : ''}
                            onValueChange={(value) => handleSubjectChange(parseInt(value))}
                          >
                            <SelectTrigger className="w-full h-11 border border-saBlue/20 bg-white rounded-xl mt-2 text-sm focus:border-saBlue focus:ring-2 focus:ring-saBlue/5 font-bold text-gray-800">
                              <SelectValue placeholder="Choose a subject..." />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="px-2 py-1.5 sticky top-0 bg-popover border-b">
                                <Input
                                  className="h-7 text-xs"
                                  placeholder="Search subject..."
                                  value={subjectSearch}
                                  onChange={(e) => setSubjectSearch(e.target.value)}
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                              <div className="max-h-52 overflow-y-auto">
                                {subjectLoading && (
                                  <div className="py-3 text-center text-xs text-gray-400">Loading subjects...</div>
                                )}
                                {!subjectLoading && filteredSubjects.map((subject) => (
                                  <SelectItem key={subject.id} value={String(subject.id)}>
                                    {subject.name} {subject.class?.name ? `(${subject.class.name})` : ''}
                                  </SelectItem>
                                ))}
                                {!subjectLoading && filteredSubjects.length === 0 && (
                                  <div className="py-3 text-center text-xs text-gray-400">No subjects found</div>
                                )}
                              </div>
                              {subjectTotalPages > 1 && (
                                <div className="sticky bottom-0 bg-popover border-t px-2 py-1.5 flex items-center justify-between">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSubjectPage((prev) => Math.max(1, prev - 1));
                                    }}
                                    disabled={subjectPage === 1}
                                  >
                                    Prev
                                  </Button>
                                  <span className="text-[10px] text-gray-500">Page {subjectPage} / {subjectTotalPages}</span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[10px]"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSubjectPage((prev) => Math.min(subjectTotalPages, prev + 1));
                                    }}
                                    disabled={subjectPage === subjectTotalPages}
                                  >
                                    Next
                                  </Button>
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          {filteredSubjects.length === 0 && (
                            <p className="text-[10px] text-gray-400 mt-2 px-1">No active subjects match your filters.</p>
                          )}
                        </div>

                        <div>
                          <Label className='text-[9px] font-semibold text-gray-400 block uppercase tracking-widest mb-2 px-1'>Teacher Allocation *</Label>
                          <select
                            className="w-full p-3 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-saBlue/5 outline-none disabled:opacity-50"
                            value={formData.teacher_id || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, teacher_id: parseInt(e.target.value) }))}
                            required
                            disabled={!formData.subject_id || (!isAdmin && formData.teacher_id !== 0)}
                          >
                            <option value="">{formData.subject_id ? "Select Teacher" : "Select Subject First"}</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>{teacher.user.name}</option>
                            ))}
                          </select>
                          {teachers.length === 0 && formData.subject_id !== 0 && (
                            <p className="text-[10px] text-destructive mt-2 font-semibold px-2">No teachers assigned to this subject.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: SCHEDULE & MODE */}
              {currentStep === 2 && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100">
                    <button
                      type="button"
                      className={`p-5 rounded-xl flex flex-col items-center gap-2 transition-all duration-300 ${formData.mode === 'ONLINE'
                        ? 'bg-white shadow-md border border-saBlue/20'
                        : 'opacity-50 hover:opacity-100'
                        }`}
                      onClick={() => setFormData((prev) => ({ ...prev, mode: 'ONLINE' }))}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.mode === 'ONLINE' ? 'bg-saBlue text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Video className="w-5 h-5" />
                      </div>
                      <span className={`font-bold tracking-wider uppercase text-[10px] ${formData.mode === 'ONLINE' ? 'text-saBlue' : 'text-gray-400'}`}>Online</span>
                    </button>
                    <button
                      type="button"
                      className={`p-5 rounded-xl flex flex-col items-center gap-2 transition-all duration-300 ${formData.mode === 'OFFLINE'
                        ? 'bg-white shadow-md border border-amber-500/20'
                        : 'opacity-50 hover:opacity-100'
                        }`}
                      onClick={() => setFormData((prev) => ({ ...prev, mode: 'OFFLINE' }))}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formData.mode === 'OFFLINE' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <span className={`font-bold tracking-wider uppercase text-[10px] ${formData.mode === 'OFFLINE' ? 'text-amber-500' : 'text-gray-400'}`}>Offline</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-2">
                      <Label className='text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1'>Start Date & Time *</Label>
                      <Input
                        type="datetime-local"
                        className="h-11 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-sm font-medium focus:ring-2 focus:ring-saBlue/5"
                        value={formData.start_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, start_time: e.target.value }))}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className='text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1'>End Date & Time *</Label>
                      <Input
                        type="datetime-local"
                        className="h-11 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-sm font-medium focus:ring-2 focus:ring-saBlue/5"
                        value={formData.end_time}
                        onChange={(e) => setFormData((prev) => ({ ...prev, end_time: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  {formData.mode === 'ONLINE' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50/30 rounded-2xl border border-saBlue/5 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-saBlue/10 flex items-center justify-center shrink-0">
                          <Video className="w-5 h-5 text-saBlue" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-saBlue">Virtual Classroom Enabled</p>
                          <p className="text-[11px] text-saBlue/60 mt-0.5 font-medium">You can add a backup Google Meet link for emergencies.</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className='text-[10px] font-semibold text-saBlue uppercase tracking-widest ml-1'>Emergency Google Meet Link (Optional)</Label>
                        <Input
                          type="url"
                          className="h-11 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-sm font-medium focus:ring-2 focus:ring-saBlue/5"
                          placeholder="https://meet.google.com/xxx-xxxx-xxx"
                          value={formData.emergency_meeting_link || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, emergency_meeting_link: e.target.value || null }))}
                        />
                        <p className="text-[10px] text-gray-400 ml-1">Students will see this as a fallback when classroom connection fails.</p>
                      </div>
                    </div>
                  )}

                  {formData.mode === 'OFFLINE' && (
                    <div className="space-y-2">
                      <Label className='text-[10px] font-semibold text-amber-600 uppercase tracking-widest ml-1'>Physical Location *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        <Input
                          type="text"
                          className="h-11 pl-11 rounded-xl border-gray-200 bg-gray-50/30 focus:bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500/5"
                          placeholder="e.g., Room 101, Science Block..."
                          value={formData.location || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                          required={formData.mode === 'OFFLINE'}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: REFINE & RECURRENCE */}
              {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="space-y-4">
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 mb-4">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">Final Session Title</p>
                      <Input
                        className="h-11 rounded-xl border-gray-200 bg-white font-bold text-gray-800 focus:ring-2 focus:ring-saBlue/5"
                        placeholder="e.g., Weekly Algebra Session..."
                        value={formData.title || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      />
                      <p className="text-[10px] text-gray-400 mt-2 italic px-1">Tip: Keep it clear and descriptive for students.</p>
                    </div>

                    <div>
                      <Label className='text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1'>Additional Notes</Label>
                      <textarea
                        className="w-full p-4 border border-gray-200 bg-white focus:bg-white rounded-2xl mt-2 min-h-[80px] text-sm font-medium text-gray-700 focus:ring-2 focus:ring-saBlue/5 outline-none"
                        placeholder="Topics covered, syllabus pointers..."
                        value={formData.description || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border transition-all duration-300 ${formData.is_recurring ? 'bg-saBlue/5 border-saBlue/20' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${formData.is_recurring ? 'bg-saBlue text-white' : 'bg-white text-gray-400 border border-gray-100'}`}>
                          <RefreshCw className={`w-5 h-5 ${formData.is_recurring ? 'animate-spin-slow' : ''}`} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">Recurring Schedule</p>
                          <p className="text-[10px] text-gray-400 font-medium">Auto-generate future sessions</p>
                        </div>
                      </div>
                      <Switch
                        checked={formData.is_recurring}
                        onCheckedChange={(checked: boolean) => setFormData((prev) => ({ ...prev, is_recurring: checked }))}
                      />
                    </div>

                    {formData.is_recurring && (
                      <div className="mt-8 pt-8 border-t border-saBlue/10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <Label className='text-[10px] font-semibold text-saBlue uppercase tracking-widest'>Frequency</Label>
                            <select
                              className="w-full p-3 border border-saBlue/10 bg-white rounded-xl mt-2 text-sm focus:ring-2 focus:ring-saBlue/5 font-bold outline-none"
                              value={recurrenceRule.frequency}
                              onChange={(e) => setRecurrenceRule((prev) => ({ ...prev, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' }))}
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
                          </div>
                          <div>
                            <Label className='text-[10px] font-semibold text-saBlue uppercase tracking-widest'>Repeat Every</Label>
                            <div className="flex items-center gap-3 mt-2">
                              <Input
                                type="number"
                                min={1}
                                className="w-20 h-10 rounded-xl text-center font-bold border border-saBlue/10 bg-white"
                                value={recurrenceRule.interval || 1}
                                onChange={(e) => setRecurrenceRule((prev) => ({ ...prev, interval: parseInt(e.target.value) || 1 }))}
                              />
                              <span className="text-xs font-semibold text-saBlue/60 uppercase tracking-wider">
                                {recurrenceRule.frequency === 'daily' ? 'Days' : recurrenceRule.frequency === 'weekly' ? 'Weeks' : 'Months'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {recurrenceRule.frequency === 'weekly' && (
                          <div className="space-y-3">
                            <Label className='text-[10px] font-semibold text-saBlue uppercase tracking-widest'>On Specific Days</Label>
                            <div className="flex flex-wrap gap-2">
                              {dayNames.map((day, index) => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => handleDayToggle(index)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${recurrenceRule.daysOfWeek?.includes(index)
                                    ? 'bg-saBlue text-white'
                                    : 'bg-white text-gray-400 border border-gray-100 hover:text-saBlue hover:bg-saBlue/5'
                                    }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <Label className='text-[10px] font-bold text-saBlue uppercase tracking-widest'>Ending Pattern</Label>
                            <div className="mt-2 space-y-4">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">On Date:</span>
                                <Input
                                  type="date"
                                  className="h-12 pl-16 rounded-xl border-none bg-white shadow-sm"
                                  value={recurrenceRule.endDate || ''}
                                  onChange={(e) => setRecurrenceRule((prev) => ({ ...prev, endDate: e.target.value, count: undefined }))}
                                />
                              </div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">After:</span>
                                <Input
                                  type="number"
                                  placeholder="Occurrences"
                                  className="h-12 pl-16 rounded-xl border-none bg-white shadow-sm"
                                  value={recurrenceRule.count || ''}
                                  onChange={(e) => setRecurrenceRule((prev) => ({ ...prev, count: e.target.value ? parseInt(e.target.value) : undefined, endDate: '' }))}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="bg-white/50 p-4 rounded-xl border border-saBlue/10 flex items-center justify-center text-center">
                            <p className="text-xs text-saBlue/60 font-medium italic">All selected students will be notified for every instance of this class.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION BAR */}
            <div className="bg-gray-50/80 border-t p-6 flex items-center justify-between gap-4">
              {currentStep > 1 ? (
                <Button type="button" variant="outline" className="rounded-xl font-bold text-gray-500 border-gray-200 hover:bg-white px-6" onClick={prevStep}>
                  Back
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className={`bg-saBlue hover:bg-saBlue/90 text-white rounded-xl px-8 font-bold h-11 flex items-center gap-2 transition-all ${currentStep < 3 ? 'w-auto' : 'w-48'}`}
                  disabled={submitting}
                >
                  {currentStep < 3 ? (
                    <>
                      Next Step
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    submitting ? 'Processing...' : isEditing ? 'Save Changes' : 'Create Session'
                  )}
                </Button>
              </div>
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
