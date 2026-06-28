import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { studentService, boardService, classService, locationService } from '@/services/api';
import type { Board, Class, Country, State, City } from '@/types';
import { ArrowLeft, Loader2, Save, Check, ChevronsUpDown, Camera, UploadCloud, User, Mail, Phone, Lock, BookOpen, Globe, School, MapPin } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import { cn } from '@/lib/utils';
import SearchablePaginatedSelect from '@/components/ui/searchablePaginatedSelect';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePageTitle } from "@/hooks/usePageTitle";

type Gender = "M" | "F" | "OTHER" | null;

export default function CreateStudentPage() {
  usePageTitle("Add New Student");
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const [error, setError] = useState('');
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [successOpen, setSuccessOpen] = useState(false);

  // Profile image states
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    class_id: null as number | null,
    board_id: null as number | null,
    id_valid_through: null as string | null,
    date_of_birth: null as string | null,
    gender: null as Gender,
    school: null as string | null,
    blood_group: null as string | null,
    addressLine: null as string | null,
    countryId: null as number | null,
    stateId: null as number | null,
    cityId: null as number | null,
    postalCode: null as string | null,
  });

  // ================= FETCH DATA =================
  useEffect(() => {
    fetchBoards();
    fetchClasses();
    fetchCountries();
  }, []);

  const fetchBoards = async () => {
    try {
      const response = await boardService.getAll({ limit: 100 });
      setBoards(response.data.data);
    } catch {
      setErrorMessage('Failed to load boards.');
      setErrorOpen(true);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll({ limit: 100 });
      setClasses(response.data.data);
    } catch {
      setErrorMessage('Failed to load classes.');
      setErrorOpen(true);
    }
  };

  const fetchCountries = async () => {
    try {
      const data = await locationService.getCountries();
      setCountries(data);
    } catch {
      setErrorMessage('Failed to load countries.');
      setErrorOpen(true);
    }
  };

  const fetchStates = async (countryId: number) => {
    try {
      const data = await locationService.getStatesByCountry(countryId);
      setStates(data);
    } catch {
      setErrorMessage('Failed to load states.');
      setErrorOpen(true);
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      const data = await locationService.getCitiesByState(stateId);
      setCities(data);
    } catch {
      setErrorMessage('Failed to load cities.');
      setErrorOpen(true);
    }
  };

  // ================= HANDLERS =================
  const handleChange = <T extends keyof typeof formData>(field: T, value: typeof formData[T]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }));
  };

  const handleCountryChange = (countryId: number) => {
    handleChange('countryId', countryId);
    setSelectedCountryId(countryId);
    setSelectedStateId(null);
    handleChange('stateId', null);
    handleChange('cityId', null);
    setStates([]);
    setCities([]);
    fetchStates(countryId);
  };

  const handleStateChange = (stateId: number) => {
    handleChange('stateId', stateId);
    setSelectedStateId(stateId);
    handleChange('cityId', null);
    setCities([]);
    fetchCities(stateId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const bloodGroupMap: Record<string, "A_POS" | "A_NEG" | "B_POS" | "B_NEG" | "AB_POS" | "AB_NEG" | "O_POS" | "O_NEG"> = {
        'A+': 'A_POS',
        'A-': 'A_NEG',
        'B+': 'B_POS',
        'B-': 'B_NEG',
        'AB+': 'AB_POS',
        'AB-': 'AB_NEG',
        'O+': 'O_POS',
        'O-': 'O_NEG',
      };

      const transformedData = {
        ...formData,
        email: formData.email.toLowerCase(),
        blood_group: formData.blood_group ? bloodGroupMap[formData.blood_group] : null,
        addressLine: formData.addressLine || '',
        school: formData.school || '',
        countryId: formData.countryId || 0,
        stateId: formData.stateId || 0,
        cityId: formData.cityId || 0,
        postalCode: formData.postalCode || '',
      };

      // Use FormData to handle file upload
      const submitFormData = new FormData();

      // Add all form fields to FormData
      Object.entries(transformedData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          submitFormData.append(key, value.toString());
        }
      });

      // Add profile image if selected
      if (profileImage) {
        submitFormData.append('profileImage', profileImage);
      }

      await studentService.create(submitFormData);
      setSuccessOpen(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create student.';
      setErrorMessage(msg);
      setErrorOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrorMessage('Image must be less than 5MB');
        setErrorOpen(true);
        return;
      }

      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrorMessage('Please select a valid image file (JPEG, PNG, WebP)');
        setErrorOpen(true);
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

  const FormLabel = ({ children, icon: Icon, required }: { children: React.ReactNode, icon?: any, required?: boolean }) => (
    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
      {required && <span className="text-red-500 text-lg leading-none ml-0.5">*</span>}
    </Label>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <SuccessModal
        open={successOpen}
        title="Student Created Successfully"
        description={`${formData.name} has been added successfully.`}
        showButtons={true}
        okText="OK"
        cancelText="Go Back"
        onConfirm={() => setSuccessOpen(false)}
        onCancel={() => navigate('/dashboard/students')}
        onClose={() => setSuccessOpen(false)}
      />

      <ErrorModal
        open={errorOpen}
        title="Error"
        description={errorMessage}
        okText="Close"
        showButtons={true}
        onConfirm={() => setErrorOpen(false)}
        onClose={() => setErrorOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col space-y-4">
        <Link
          to="/dashboard/students"
          className="flex items-center text-muted-foreground hover:text-saBlue transition-colors w-fit text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Students
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Add New Student</h1>
            <p className="text-gray-500 mt-1">Create a new student profile and set up their account</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* SECTION 1: USER INFO & PROFILE PHOTO */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Photo Card */}
          <Card className="md:col-span-1 rounded-3xl border-gray-100 shadow-sm h-full">
            <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-image-upload')?.click()}>
                <Avatar className="h-32 w-32 border-4 border-gray-50 shadow-inner">
                  <AvatarImage src={imagePreview} className="object-cover" />
                  <AvatarFallback className="bg-gray-100 text-gray-400 text-3xl font-bold">
                    {formData.name ? getInitials(formData.name) : <User className="w-12 h-12 opacity-50" />}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-8 h-8" />
                </div>
                <div className="absolute bottom-0 right-0 bg-saBlue text-white p-2 rounded-full border-4 border-white shadow-sm">
                  <UploadCloud className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4 text-center">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-saBlue hover:bg-blue-50 hover:text-saBlue/80"
                  onClick={() => document.getElementById('profile-image-upload')?.click()}
                >
                  Upload Photo
                </Button>
                <p className="text-[10px] text-gray-400 mt-1">
                  Supported: JPG, PNG, WEBP (Max 5MB)
                </p>
              </div>
              <input
                id="profile-image-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </CardContent>
          </Card>

          {/* Basic Details Inputs */}
          <Card className="md:col-span-2 rounded-3xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-gray-700">Account Information</CardTitle>
              <CardDescription>Essential account details for login and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 col-span-2">
                  <FormLabel icon={User} required>Full Name</FormLabel>
                  <Input
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel icon={Mail} required>Email Address</FormLabel>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel icon={Phone} required>Phone Number</FormLabel>
                  <Input
                    type="tel"
                    placeholder="+1 234 567 890"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    required
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <FormLabel icon={Lock} required>Password</FormLabel>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 text-right">Must be at least 6 characters</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: ACADEMIC DETAILS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-700">Academic & Personal Details</CardTitle>
            <CardDescription>Schooling info and personal attributes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <FormLabel icon={BookOpen}>Class</FormLabel>
                <SearchablePaginatedSelect
                  value={formData.class_id?.toString() || ''}
                  onValueChange={(value) => handleChange('class_id', parseInt(value))}
                  placeholder="Select Class"
                  searchPlaceholder="Search class..."
                  triggerClassName="h-11 rounded-xl bg-gray-50 border-gray-200"
                  options={classes.map((cls) => ({ value: cls.id.toString(), label: cls.name }))}
                />
              </div>

              <div className="space-y-2">
                <FormLabel icon={Globe}>Board</FormLabel>
                <Select
                  value={formData.board_id?.toString() || ''}
                  onValueChange={(value) => handleChange('board_id', parseInt(value))}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select Board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id.toString()}>{board.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FormLabel icon={School}>School Name</FormLabel>
                <Input
                  placeholder="e.g. St. Xavier's High School"
                  value={formData.school || ''}
                  onChange={(e) => handleChange('school', e.target.value)}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Date of Birth</FormLabel>
                <Input
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <FormLabel>ID Valid Through</FormLabel>
                <Input
                  type="date"
                  value={formData.id_valid_through || ''}
                  onChange={(e) => handleChange('id_valid_through', e.target.value)}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Gender</FormLabel>
                <Select
                  value={formData.gender || ''}
                  onValueChange={(value) => handleChange('gender', value as Gender)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FormLabel>Blood Group</FormLabel>
                <Select
                  value={formData.blood_group || ''}
                  onValueChange={(value) => handleChange('blood_group', value)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: ADDRESS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-700">Residential Address</CardTitle>
            <CardDescription>For official correspondence</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <FormLabel icon={MapPin}>Full Address</FormLabel>
              <Textarea
                placeholder="Street address, apartment, suite, etc."
                value={formData.addressLine || ''}
                onChange={(e) => handleChange('addressLine', e.target.value)}
                className="min-h-[80px] rounded-xl bg-gray-50 border-gray-200 resize-none"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <FormLabel>Country</FormLabel>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="w-full justify-between h-11 rounded-xl bg-gray-50 border-gray-200 font-normal"
                    >
                      {formData.countryId
                        ? countries.find((country) => country.id === formData.countryId)?.name
                        : "Select Country..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 rounded-xl" align="start">
                    <div className="p-2 space-y-2">
                      <input
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-saBlue/20"
                        placeholder="Search country..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                      />
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {countries
                          .filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                          .map((country) => (
                            <div
                              key={country.id}
                              className={cn(
                                "flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100",
                                formData.countryId === country.id && "bg-blue-50 text-blue-600"
                              )}
                              onClick={() => {
                                handleCountryChange(country.id);
                                setCountryOpen(false);
                                setCountrySearch("");
                              }}
                            >
                              <Check className={cn("mr-2 h-3 w-3", formData.countryId === country.id ? "opacity-100" : "opacity-0")} />
                              {country.name}
                            </div>
                          ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <FormLabel>State</FormLabel>
                <Popover open={stateOpen} onOpenChange={setStateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={stateOpen}
                      className="w-full justify-between h-11 rounded-xl bg-gray-50 border-gray-200 font-normal"
                      disabled={!selectedCountryId}
                    >
                      {formData.stateId
                        ? states.find((state) => state.id === formData.stateId)?.name
                        : "Select State..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 rounded-xl" align="start">
                    <div className="p-2 space-y-2">
                      <input
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-saBlue/20"
                        placeholder="Search state..."
                        value={stateSearch}
                        onChange={(e) => setStateSearch(e.target.value)}
                      />
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {states
                          .filter(s => s.name.toLowerCase().includes(stateSearch.toLowerCase()))
                          .map((state) => (
                            <div
                              key={state.id}
                              className={cn(
                                "flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100",
                                formData.stateId === state.id && "bg-blue-50 text-blue-600"
                              )}
                              onClick={() => {
                                handleStateChange(state.id);
                                setStateOpen(false);
                                setStateSearch("");
                              }}
                            >
                              <Check className={cn("mr-2 h-3 w-3", formData.stateId === state.id ? "opacity-100" : "opacity-0")} />
                              {state.name}
                            </div>
                          ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <FormLabel>City</FormLabel>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={cityOpen}
                      className="w-full justify-between h-11 rounded-xl bg-gray-50 border-gray-200 font-normal"
                      disabled={!selectedStateId}
                    >
                      {formData.cityId
                        ? cities.find((city) => city.id === formData.cityId)?.name
                        : "Select City..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 rounded-xl" align="start">
                    <div className="p-2 space-y-2">
                      <input
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-saBlue/20"
                        placeholder="Search city..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                      />
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        {cities
                          .filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()))
                          .map((city) => (
                            <div
                              key={city.id}
                              className={cn(
                                "flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100",
                                formData.cityId === city.id && "bg-blue-50 text-blue-600"
                              )}
                              onClick={() => {
                                handleChange('cityId', city.id);
                                setCityOpen(false);
                                setCitySearch("");
                              }}
                            >
                              <Check className={cn("mr-2 h-3 w-3", formData.cityId === city.id ? "opacity-100" : "opacity-0")} />
                              {city.name}
                            </div>
                          ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <FormLabel>Postal Code</FormLabel>
                <Input
                  placeholder="e.g. 10001"
                  value={formData.postalCode || ''}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/dashboard/students')}
            className="w-full sm:w-auto h-12 rounded-xl text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto h-12 rounded-xl bg-saBlue hover:bg-saBlue/90 shadow-lg shadow-saBlue/30 min-w-[160px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Student
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
