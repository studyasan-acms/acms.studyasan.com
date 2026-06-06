import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { activityAPI, activityGroupAPI } from '@/services/activity.service';
import ActivityForm from '@/components/activities/admin/ActivityForm';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ActivityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<any>(null);
  const [activityGroups, setActivityGroups] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const groupsRes = await activityGroupAPI.getAll({ limit: 100 });
        setActivityGroups(groupsRes.data.data.activityGroups || []);

        if (id) {
          const res = await activityAPI.getById(Number(id));
          setActivity(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load data', error);
        toast.error('Failed to load activity data');
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{id ? 'Edit Activity' : 'Create New Activity'}</h1>
        <p className="text-gray-500">Configure your activity and add engaging content for students.</p>
      </div>
      <ActivityForm
        activity={activity}
        activityGroups={activityGroups}
        onSuccess={() => navigate(-1)}
        onCancel={() => navigate(-1)}
        isStandalone={true}
      />
    </div>
  );
}
