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
import { teacherService, locationService, currencyService } from '@/services/api';
import type { Country, State, City, Currency, BloodGroup } from '@/types';
import { ArrowLeft, Loader2, Save, Check, ChevronsUpDown, Camera, UploadCloud, User, Mail, Phone, Lock, Briefcase, GraduationCap, DollarSign, MapPin } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePageTitle } from "@/hooks/usePageTitle";

type Gender = "M" | "F" | "OTHER" | null;

const BLOOD_GROUP_OPTIONS: Array<{ value: BloodGroup; label: string }> = [
  { value: 'A_POS', label: 'A+' },
  { value: 'A_NEG', label: 'A-' },
  { value: 'B_POS', label: 'B+' },
  { value: 'B_NEG', label: 'B-' },
  { value: 'AB_POS', label: 'AB+' },
  { value: 'AB_NEG', label: 'AB-' },
  { value: 'O_POS', label: 'O+' },
  { value: 'O_NEG', label: 'O-' },
];

export default function CreateTeacherPage() {
  usePageTitle("Add New Teacher");
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [currencySearch, setCurrencySearch] = useState("");

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
    id_valid_through: null as string | null,
    salary: null as number | null,
    salary_currency_id: null as number | null,
    qualification: null as string | null,
    gender: null as Gender,
    blood_group: null as BloodGroup | null,
    experience: null as string | null,
    addressLine: null as string | null,
    countryId: null as number | null,
    stateId: null as number | null,
    cityId: null as number | null,
    postalCode: null as string | null,
  });

  // ================= FETCH DATA =================
  useEffect(() => {
    fetchCountries();
    fetchCurrencies();
  }, []);

  const fetchCountries = async () => {
    try {
      const data = await locationService.getCountries();
      setCountries(data);
    } catch {
      setErrorMessage('Failed to load countries.');
      setErrorOpen(true);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const data = await currencyService.getAll();
      setCurrencies(data);
    } catch {
      setErrorMessage('Failed to load currencies.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const transformedData = {
        name: formData.name,
        email: formData.email.toLowerCase(),
        phone: formData.phone,
        password: formData.password,
        id_valid_through: formData.id_valid_through,
        salary: formData.salary,
        salary_currency_id: formData.salary_currency_id,
        qualification: formData.qualification,
        gender: formData.gender,
        blood_group: formData.blood_group,
        experience: formData.experience,
        address: {
          addressLine: formData.addressLine || '',
          countryId: formData.countryId || 0,
          stateId: formData.stateId || 0,
          cityId: formData.cityId || 0,
          postalCode: formData.postalCode || '',
        }
      };

      // Use FormData to handle file upload
      const submitFormData = new FormData();

      // Add basic fields
      submitFormData.append('name', transformedData.name);
      submitFormData.append('email', transformedData.email);
      submitFormData.append('phone', transformedData.phone);
      submitFormData.append('password', transformedData.password);
      if (transformedData.id_valid_through) {
        submitFormData.append('id_valid_through', transformedData.id_valid_through);
      }

      if (transformedData.salary) submitFormData.append('salary', transformedData.salary.toString());
      if (transformedData.salary_currency_id) submitFormData.append('salary_currency_id', transformedData.salary_currency_id.toString());
      if (transformedData.qualification) submitFormData.append('qualification', transformedData.qualification);
      if (transformedData.gender) submitFormData.append('gender', transformedData.gender);
      if (transformedData.blood_group) submitFormData.append('blood_group', transformedData.blood_group);
      if (transformedData.experience) submitFormData.append('experience', transformedData.experience);

      // Add address
      submitFormData.append('address', JSON.stringify(transformedData.address));

      // Add profile image if selected
      if (profileImage) {
        submitFormData.append('profileImage', profileImage);
      }

      await teacherService.create(submitFormData);
      setSuccessOpen(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create teacher.';
      setErrorMessage(msg);
      setErrorOpen(true);
    } finally {
      setIsLoading(false);
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
        title="Teacher Created Successfully"
        description={`${formData.name} has been added successfully.`}
        showButtons={true}
        okText="OK"
        cancelText="Go Back"
        onConfirm={() => setSuccessOpen(false)}
        onCancel={() => navigate('/dashboard/teachers')}
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

      <div className="flex flex-col space-y-4">
        <Link
          to="/dashboard/teachers"
          className="flex items-center text-muted-foreground hover:text-saBlue transition-colors w-fit text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Teachers
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Add New Teacher</h1>
          <p className="text-gray-500 mt-1">Create a new teacher profile and set up their account</p>
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

        {/* SECTION 2: TEACHER DETAILS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-700">Teacher Profile</CardTitle>
            <CardDescription>Professional qualifications and employment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <FormLabel icon={GraduationCap}>Qualification</FormLabel>
                <Input
                  placeholder="M.Sc. Mathematics, B.Ed."
                  value={formData.qualification || ''}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <FormLabel icon={Briefcase}>Experience</FormLabel>
                <Input
                  placeholder="e.g. 5 years"
                  value={formData.experience || ''}
                  onChange={(e) => handleChange('experience', e.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <FormLabel icon={User}>Gender</FormLabel>
                <Select
                  value={formData.gender || ''}
                  onValueChange={(value) => handleChange('gender', value as Gender)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FormLabel>ID Valid Through</FormLabel>
                <Input
                  type="date"
                  value={formData.id_valid_through || ''}
                  onChange={(e) => handleChange('id_valid_through', e.target.value)}
                  disabled={isLoading}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Blood Group</FormLabel>
                <Select
                  value={formData.blood_group || 'none'}
                  onValueChange={(value) => handleChange('blood_group', value === 'none' ? null : (value as BloodGroup))}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    {BLOOD_GROUP_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FormLabel icon={DollarSign}>Salary (Monthly)</FormLabel>
                <div className="flex">
                  <span className="inline-flex items-center px-3 py-2 border border-r-0 rounded-l-xl bg-gray-50 text-gray-700 border-gray-200">
                    {currencies.find((c) => c.id === formData.salary_currency_id)?.symbol || '¤'}
                  </span>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={formData.salary ?? ''}
                    onChange={(e) => handleChange('salary', e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={isLoading}
                    className="h-11 rounded-l-none rounded-r-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FormLabel icon={DollarSign}>Currency</FormLabel>
                <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={currencyOpen}
                      className="w-full justify-between h-11 rounded-xl bg-gray-50 border-gray-200 font-normal"
                      disabled={isLoading}
                    >
                      {formData.salary_currency_id
                        ? `${currencies.find((c) => c.id === formData.salary_currency_id)?.code} - ${currencies.find((c) => c.id === formData.salary_currency_id)?.name}`
                        : 'Select currency...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 rounded-xl">
                    <div className="p-2 space-y-2">
                      <input
                        type="text"
                        placeholder="Search currency..."
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-saBlue/20"
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                      />
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        <div
                          className="flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            handleChange('salary_currency_id', null);
                            setCurrencyOpen(false);
                            setCurrencySearch('');
                          }}
                        >
                          <Check className={cn("mr-2 h-3 w-3", !formData.salary_currency_id ? "opacity-100" : "opacity-0")} />
                          None
                        </div>
                        {currencies
                          .filter((c) => c.code.toLowerCase().includes(currencySearch.toLowerCase()) || c.name.toLowerCase().includes(currencySearch.toLowerCase()))
                          .map((currency) => (
                            <div
                              key={currency.id}
                              className={cn(
                                "flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100",
                                formData.salary_currency_id === currency.id && "bg-blue-50 text-blue-600"
                              )}
                              onClick={() => {
                                handleChange('salary_currency_id', currency.id);
                                setCurrencyOpen(false);
                                setCurrencySearch('');
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  formData.salary_currency_id === currency.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {currency.code} - {currency.name}
                            </div>
                          ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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
            onClick={() => navigate('/dashboard/teachers')}
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
                Create Teacher
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}