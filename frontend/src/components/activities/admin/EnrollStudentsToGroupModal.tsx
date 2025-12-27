import { useState, useEffect } from 'react';
import { X, Users, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityEnrollmentAPI } from '../../../services/activity.service';
import api from '../../../services/api';
import { toast } from 'sonner';
import type { ActivityGroup } from '../../../types/activity';

interface Student {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface Props {
  group: ActivityGroup;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EnrollStudentsToGroupModal({ group, onClose, onSuccess }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch students
      const studentsResponse = await api.get('/students', {
        params: { limit: 1000 },
      });
      setStudents(Array.isArray(studentsResponse.data.data.data) ? studentsResponse.data.data.data : studentsResponse.data.data || []);
      
      // Fetch enrolled students for this group
      const enrollmentsResponse = await activityEnrollmentAPI.getGroupEnrollments(group.id);
      const enrolled = enrollmentsResponse.data.data || [];
      setEnrolledStudents(enrolled);
      setSelectedStudents(enrolled); // Pre-select enrolled students
    } catch (error: any) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudent = (studentId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    const filteredStudentIds = filteredStudents.map((s) => s.id);
    if (selectedStudents.length === filteredStudentIds.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudentIds);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Determine which students to enroll and unenroll
      const toEnroll = selectedStudents.filter(id => !enrolledStudents.includes(id));
      const toUnenroll = enrolledStudents.filter(id => !selectedStudents.includes(id));
      
      // Enroll new students
      if (toEnroll.length > 0) {
        await activityEnrollmentAPI.enrollToGroup(group.id, toEnroll);
      }
      
      // Unenroll removed students
      for (const studentId of toUnenroll) {
        await activityEnrollmentAPI.unenrollFromGroup(group.id, studentId);
      }
      
      const totalChanges = toEnroll.length + toUnenroll.length;
      if (totalChanges === 0) {
        toast.info('No changes made');
      } else {
        toast.success(
          `Successfully updated enrollments: ${toEnroll.length} enrolled, ${toUnenroll.length} unenrolled`
        );
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update enrollments');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              Enroll Students to Group
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Group: <span className="font-semibold">{group.name}</span>
            </p>
            <p className="text-xs text-gray-500">
              Students will be enrolled to all {group._count?.activities || 0} published activities in this group
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search students by name or email..."
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Select All */}
          <div className="mb-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {selectedStudents.length} of {filteredStudents.length} students selected
            </span>
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          {/* Students List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No students found matching your search' : 'No students available'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => {
                const isEnrolled = enrolledStudents.includes(student.id);
                const isSelected = selectedStudents.includes(student.id);
                
                return (
                  <div
                    key={student.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleStudent(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {student.user.name}
                            {isEnrolled && (
                              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                                Enrolled
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{student.user.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>Save Changes</>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
