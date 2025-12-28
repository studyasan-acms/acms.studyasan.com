import { useState, useEffect } from 'react';
import { X, UserCheck, CheckCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { activityGroupAPI } from '../../../services/activity.service';
import api from '../../../services/api';
import { toast } from 'sonner';
import type { ActivityGroup, ActivityGroupTeacherJunction } from '../../../types/activity';

interface Teacher {
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

export default function AssignTeachersToGroupModal({ group, onClose, onSuccess }: Props) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<number[]>([]);
  const [assignedTeachers, setAssignedTeachers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch teachers
      const teachersResponse = await api.get('/teachers', {
        params: { limit: 1000 },
      });
      setTeachers(Array.isArray(teachersResponse.data.data.data) ? teachersResponse.data.data.data : teachersResponse.data.data || []);
      
      // Fetch assigned teachers for this group
      const assignmentsResponse = await activityGroupAPI.getTeachers(group.id);
      const assigned = assignmentsResponse.data.data || [];
      const assignedTeacherIds = assigned.map((a: ActivityGroupTeacherJunction) => a.teacher_id);
      setAssignedTeachers(assignedTeacherIds);
      setSelectedTeachers(assignedTeacherIds); // Pre-select assigned teachers
    } catch (error: any) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter((teacher) =>
    teacher.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleTeacher = (teacherId: number) => {
    setSelectedTeachers((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSelectAll = () => {
    const filteredTeacherIds = filteredTeachers.map((t) => t.id);
    if (selectedTeachers.length === filteredTeacherIds.length) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(filteredTeacherIds);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Determine which teachers to assign and unassign
      const toAssign = selectedTeachers.filter(id => !assignedTeachers.includes(id));
      const toUnassign = assignedTeachers.filter(id => !selectedTeachers.includes(id));
      
      // Assign new teachers
      if (toAssign.length > 0) {
        for (const teacherId of toAssign) {
          await activityGroupAPI.assignTeacher({ activity_group_id: group.id, teacher_id: teacherId });
        }
      }
      
      // Unassign removed teachers
      if (toUnassign.length > 0) {
        // Get the junction IDs for unassignment
        const assignmentsResponse = await activityGroupAPI.getTeachers(group.id);
        const assignments = assignmentsResponse.data.data || [];
        
        for (const teacherId of toUnassign) {
          const assignment = assignments.find((a: ActivityGroupTeacherJunction) => a.teacher_id === teacherId);
          if (assignment) {
            await activityGroupAPI.removeTeacher(assignment.id);
          }
        }
      }
      
      const totalChanges = toAssign.length + toUnassign.length;
      if (totalChanges === 0) {
        toast.info('No changes made');
      } else {
        toast.success(
          `Successfully updated assignments: ${toAssign.length} assigned, ${toUnassign.length} unassigned`
        );
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update teacher assignments');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <UserCheck className="w-5 h-5 mr-2" />
            Manage Teachers for {group.name}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Select All */}
              <div className="mb-4">
                <Button
                  variant="outline"
                  onClick={handleSelectAll}
                  className="text-sm"
                >
                  {selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0
                    ? 'Deselect All'
                    : 'Select All'
                  }
                </Button>
                <span className="ml-2 text-sm text-gray-600">
                  {selectedTeachers.length} of {filteredTeachers.length} selected
                </span>
              </div>

              {/* Teachers List */}
              <div className="max-h-96 overflow-y-auto border rounded-md">
                {filteredTeachers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No teachers found
                  </div>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className={`p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                        selectedTeachers.includes(teacher.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleToggleTeacher(teacher.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold">
                              {teacher.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium">{teacher.user.name}</h3>
                            <p className="text-sm text-gray-600">{teacher.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {assignedTeachers.includes(teacher.id) && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full mr-2">
                              Assigned
                            </span>
                          )}
                          {selectedTeachers.includes(teacher.id) ? (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting ? 'Updating...' : 'Update Assignments'}
          </Button>
        </div>
      </div>
    </div>
  );
}