import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, User, Lock, Save, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/services/api';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string;
  profile_url?: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  delete_requested: boolean;
  delete_verified: boolean;
  delete_requested_at?: string;
  created_at: string;
  updated_at: string;
  student?: {
    id: number;
    class_id?: number;
    board_id?: number;
    date_of_birth?: string;
    gender?: 'M' | 'F' | 'OTHER';
    school?: string;
    blood_group?: string;
    class?: { id: number; name: string };
    board?: { id: number; name: string };
  };
  teacher?: {
    id: number;
    salary?: number;
    qualification?: string;
    gender?: 'M' | 'F' | 'OTHER';
    experience?: string;
    salary_currency?: { id: number; name: string; code: string };
  };
}

interface UpdateProfileData {
  name?: string;
  phone?: string;
  password?: string;
}

interface UpdateStudentData {
  date_of_birth?: string;
  gender?: 'M' | 'F' | 'OTHER';
  school?: string;
  blood_group?: string;
}

interface UpdateTeacherData {
  salary?: number;
  qualification?: string;
  gender?: 'M' | 'F' | 'OTHER';
  experience?: string;
}

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // Basic profile form
  const [basicForm, setBasicForm] = useState<UpdateProfileData>({});
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  // Role-specific forms
  const [studentForm, setStudentForm] = useState<UpdateStudentData>({});
  const [teacherForm, setTeacherForm] = useState<UpdateTeacherData>({});

  const getInitials = (name?: string) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || 'U';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image must be less than 5MB');
        return;
      }
      
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please select a valid image file (JPEG, PNG, WebP)');
        return;
      }

      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadProfile = async () => {
    try {
      console.log('Loading profile data...');
      setLoading(true);
      const response = await apiService.get('/profile');
      console.log('Profile API response:', response.data);
      
      // Extract the actual user data from the nested response
      const userData = response.data.data;
      console.log('Extracted user data:', userData);
      setProfileData(userData);
      
      // Pre-fill forms
      setBasicForm({
        name: userData.name,
        phone: userData.phone,
      });
      
      if (userData.student) {
        setStudentForm({
          date_of_birth: userData.student.date_of_birth?.split('T')[0] || '',
          gender: userData.student.gender || undefined,
          school: userData.student.school || '',
          blood_group: userData.student.blood_group || '',
        });
      }
      
      if (userData.teacher) {
        setTeacherForm({
          salary: userData.teacher.salary || undefined,
          qualification: userData.teacher.qualification || '',
          gender: userData.teacher.gender || undefined,
          experience: userData.teacher.experience || '',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const updateBasicProfile = async () => {
    try {
      setUpdating(true);
      const formData = new FormData();
      
      if (passwordForm.password) {
        if (passwordForm.password !== passwordForm.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        formData.append('password', passwordForm.password);
      }
      if (profileImage) formData.append('profileImage', profileImage);

      // Only proceed if there's something to update
      if (!passwordForm.password && !profileImage) {
        toast.error('No changes to save');
        return;
      }

      const response = await apiService.put('/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update auth store with new user data
      if (user && token) {
        setAuth({ ...user, ...response.data }, token);
      }

      await loadProfile(); // Reload profile to get updated data
      setProfileImage(null);
      setImagePreview('');
      setPasswordForm({ password: '', confirmPassword: '' });
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const updateStudentDetails = async () => {
    try {
      setUpdating(true);
      await apiService.put('/profile/student', studentForm);
      await loadProfile();
      toast.success('Student details updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update student details');
    } finally {
      setUpdating(false);
    }
  };

  const updateTeacherDetails = async () => {
    try {
      setUpdating(true);
      await apiService.put('/profile/teacher', teacherForm);
      await loadProfile();
      toast.success('Teacher details updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update teacher details');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    console.log('ProfilePage mounted, loading profile...');
    loadProfile();
  }, []);

  console.log('ProfilePage render - loading:', loading, 'profileData:', profileData);

  if (loading) {
    console.log('Showing loading spinner...');
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-saBlue"></div>
      </div>
    );
  }

  if (!profileData) {
    console.log('No profile data, showing error...');
    return <div>Error loading profile data</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className={`grid w-full ${profileData?.role === 'ADMIN' ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            {profileData?.role !== 'ADMIN' && (
              <TabsTrigger value="details">
                {profileData?.role === 'STUDENT' ? 'Student Details' : 'Teacher Details'}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage 
                        src={profileData.profile_url || imagePreview} 
                        alt={profileData.name}
                        onError={() => {
                          console.log('Profile page avatar failed to load:', profileData.profile_url || imagePreview);
                        }}
                        onLoad={() => {
                          console.log('Profile page avatar loaded:', profileData.profile_url || imagePreview);
                        }}
                      />
                      <AvatarFallback className="text-xl bg-saVividOrange text-white">
                        {profileData.name ? getInitials(profileData.name) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => document.getElementById('profile-image-upload')?.click()}
                      className="absolute bottom-0 right-0 bg-saBlue hover:bg-saBlueDark text-white p-2 rounded-full shadow-lg transition-colors"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{profileData.name}</h3>
                    <Badge variant="secondary" className="mt-1">
                      {profileData.role}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      Click the camera icon to change your profile picture
                    </p>
                  </div>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                {/* Basic Form Fields */}
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Name cannot be changed</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profileData.email}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profileData.phone}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Phone cannot be changed</p>
                  </div>
                </div>

                <Button 
                  onClick={updateBasicProfile} 
                  disabled={updating || (!profileImage && !passwordForm.password)}
                  className="bg-saBlue hover:bg-saBlueDark"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updating ? 'Updating...' : 'Update Profile'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm({...passwordForm, password: e.target.value})}
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button 
                  onClick={updateBasicProfile}
                  disabled={updating || !passwordForm.password || !passwordForm.confirmPassword}
                  className="bg-saBlue hover:bg-saBlueDark"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updating ? 'Updating...' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            {profileData.role === 'STUDENT' && profileData.student && (
              <Card>
                <CardHeader>
                  <CardTitle>Student Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={studentForm.date_of_birth}
                        onChange={(e) => setStudentForm({...studentForm, date_of_birth: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        value={studentForm.gender || ''}
                        onChange={(e) => setStudentForm({...studentForm, gender: e.target.value as 'M' | 'F' | 'OTHER'})}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="school">School</Label>
                    <Input
                      id="school"
                      value={studentForm.school}
                      onChange={(e) => setStudentForm({...studentForm, school: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="blood_group">Blood Group</Label>
                    <select
                      id="blood_group"
                      value={studentForm.blood_group || ''}
                      onChange={(e) => setStudentForm({...studentForm, blood_group: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A_POS">A+</option>
                      <option value="A_NEG">A-</option>
                      <option value="B_POS">B+</option>
                      <option value="B_NEG">B-</option>
                      <option value="AB_POS">AB+</option>
                      <option value="AB_NEG">AB-</option>
                      <option value="O_POS">O+</option>
                      <option value="O_NEG">O-</option>
                    </select>
                  </div>

                  <Button 
                    onClick={updateStudentDetails}
                    disabled={updating}
                    className="bg-saBlue hover:bg-saBlueDark"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updating ? 'Saving...' : 'Save Student Details'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {profileData.role === 'TEACHER' && profileData.teacher && (
              <Card>
                <CardHeader>
                  <CardTitle>Teacher Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="qualification">Qualification</Label>
                      <Input
                        id="qualification"
                        value={teacherForm.qualification}
                        onChange={(e) => setTeacherForm({...teacherForm, qualification: e.target.value})}
                        readOnly
                        disabled
                        className="bg-gray-100"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="gender">Gender</Label>
                      <select
                        id="gender"
                        value={teacherForm.gender || ''}
                        onChange={(e) => setTeacherForm({...teacherForm, gender: e.target.value as 'M' | 'F' | 'OTHER'})}
                        className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                        disabled
                      >
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="experience">Experience</Label>
                    <Textarea
                      id="experience"
                      value={teacherForm.experience}
                      onChange={(e) => setTeacherForm({...teacherForm, experience: e.target.value})}
                      placeholder="Describe your teaching experience"
                      readOnly
                      disabled
                      className="bg-gray-100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="salary">Salary</Label>
                    <Input
                      id="salary"
                      type="number"
                      value={teacherForm.salary || ''}
                      onChange={(e) => setTeacherForm({...teacherForm, salary: Number(e.target.value)})}
                      readOnly
                      disabled
                      className="bg-gray-100"
                    />
                  </div>

                  <Button 
                    onClick={updateTeacherDetails}
                    disabled={updating}
                    className="bg-saBlue hover:bg-saBlueDark"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updating ? 'Saving...' : 'Save Teacher Details'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}