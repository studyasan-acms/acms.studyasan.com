import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { teacherService, locationService, currencyService } from '@/services/api';
import axios from 'axios';
import type { Teacher, Country, State, City, Currency } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface TeacherRole {
  id: number;
  name: string;
  description: string | null;
}
import { ArrowLeft, Loader2, Save, Check, ChevronsUpDown, User, Mail, Phone, Briefcase, GraduationCap, DollarSign, MapPin, Camera, UploadCloud } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import { cn, resolveImageUrl } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type Gender = "M" | "F" | "OTHER" | null;

export default function EditTeacherPage() {
  usePageTitle("Edit Teacher");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [roles, setRoles] = useState<TeacherRole[]>([]);

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

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  // Profile image state
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState({
    salary: null as number | null,
    salary_currency_id: null as number | null,
    qualification: null as string | null,
    gender: null as Gender,
    experience: null as string | null,
    addressLine: null as string | null,
    countryId: null as number | null,
    stateId: null as number | null,
    cityId: null as number | null,
    postalCode: null as string | null,
    name: null as string | null,
    email: null as string | null,
    phone: null as string | null,
    roleId: null as number | null,
  });

  // ================= FETCH DATA =================
  useEffect(() => {
    if (id) {
      fetchTeacher(parseInt(id));
      fetchCountries();
      fetchCurrencies();
      fetchRoles();
    }
  }, [id]);

  const fetchTeacher = async (teacherId: number) => {
    setIsLoading(true);
    try {
      const response = await teacherService.getById(teacherId);
      const teacherData = response?.data ?? response;
      setTeacher(teacherData);

      // Set initial form data from teacher
      const initialData = {
        salary: teacherData.salary,
        salary_currency_id: teacherData.salary_currency?.id ?? null,
        qualification: teacherData.qualification,
        gender: teacherData.gender,
        experience: teacherData.experience,
        addressLine: null as string | null,
        countryId: null as number | null,
        stateId: null as number | null,
        cityId: null as number | null,
        postalCode: null as string | null,
        name: teacherData.user.name,
        email: teacherData.user.email,
        phone: teacherData.user.phone,
        roleId: teacherData.role_id || null,
      };

      // If teacher has address, load it
      if (teacherData.address) {
        const address = teacherData.address;
        initialData.addressLine = address.addressLine || '';
        initialData.countryId = address.country?.id || null;
        initialData.stateId = address.state?.id || null;
        initialData.cityId = address.city?.id || null;
        initialData.postalCode = address.postalCode || '';

        // Set selected IDs for dropdowns
        if (address.country?.id) {
          setSelectedCountryId(address.country.id);
          try {
            const statesData = await locationService.getStatesByCountry(address.country.id);
            setStates(statesData);
          } catch (error) {
            console.error('Failed to load states:', error);
          }
        }

        if (address.state?.id) {
          setSelectedStateId(address.state.id);
          try {
            const citiesData = await locationService.getCitiesByState(address.state.id);
            setCities(citiesData);
          } catch (error) {
            console.error('Failed to load cities:', error);
          }
        }
      }

      setFormData(initialData);
    } catch (error: any) {
      const backendMsg = error?.response?.data?.message;
      setErrorMessage(backendMsg || error?.message || 'Failed to load teacher data.');
      setErrorOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const data = await locationService.getCountries();
      setCountries(data);
    } catch {
      console.error('Failed to load countries');
    }
  };

  const fetchCurrencies = async () => {
    try {
      const data = await currencyService.getAll();
      setCurrencies(data);
    } catch {
      console.error('Failed to load currencies');
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}teacher-roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setRoles(response.data.data.roles || []);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const fetchStates = async (countryId: number) => {
    try {
      const data = await locationService.getStatesByCountry(countryId);
      setStates(data);
    } catch {
      console.error('Failed to load states');
    }
  };

  const fetchCities = async (stateId: number) => {
    try {
      const data = await locationService.getCitiesByState(stateId);
      setCities(data);
    } catch {
      console.error('Failed to load cities');
    }
  };

  // ================= HANDLERS =================
  const handleChange = <T extends keyof typeof formData>(field: T, value: typeof formData[T]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === '' ? null : value,
    }));
  };

  const handleCountryChange = (countryId: number | null) => {
    handleChange('countryId', countryId);
    setSelectedCountryId(countryId);
    setSelectedStateId(null);
    handleChange('stateId', null);
    handleChange('cityId', null);
    setStates([]);
    setCities([]);
    if (countryId) {
      fetchStates(countryId);
    }
  };

  const handleStateChange = (stateId: number | null) => {
    handleChange('stateId', stateId);
    setSelectedStateId(stateId);
    handleChange('cityId', null);
    setCities([]);
    if (stateId) {
      fetchCities(stateId);
    }
  };

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
    if (!id) return;

    setIsSaving(true);

    try {
      // Validate address - all or nothing
      const hasAnyAddressField =
        formData.addressLine ||
        formData.countryId ||
        formData.stateId ||
        formData.cityId ||
        formData.postalCode;
      const hasAllAddressFields =
        formData.addressLine &&
        formData.countryId &&
        formData.stateId &&
        formData.cityId &&
        formData.postalCode;

      if (hasAnyAddressField && !hasAllAddressFields) {
        setErrorMessage(
          "If updating address, all address fields (Address, Country, State, City, Postal Code) are required."
        );
        setErrorOpen(true);
        setIsSaving(false);
        return;
      }

      const transformedData = {
        salary: formData.salary,
        salary_currency_id: formData.salary_currency_id,
        qualification: formData.qualification,
        gender: formData.gender,
        experience: formData.experience,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role_id: formData.roleId,
        address: hasAllAddressFields ? {
          addressLine: formData.addressLine || '',
          countryId: formData.countryId || 0,
          stateId: formData.stateId || 0,
          cityId: formData.cityId || 0,
          postalCode: formData.postalCode || '',
        } : undefined
      };

      // Remove undefined values
      const cleanData: any = {};
      Object.entries(transformedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleanData[key] = value;
        }
      });

      if (Object.keys(cleanData).length === 0 && !profileImage) {
        setErrorMessage('No changes to save.');
        setErrorOpen(true);
        setIsSaving(false);
        return;
      }

      console.log('Updating teacher with data:', cleanData);

      // If there's a profile image, use FormData
      if (profileImage) {
        const formDataPayload = new FormData();
        Object.entries(cleanData).forEach(([key, value]) => {
          if (key === 'address' && value) {
            formDataPayload.append(key, JSON.stringify(value));
          } else if (value !== null && value !== undefined) {
            formDataPayload.append(key, value.toString());
          }
        });
        formDataPayload.append('profileImage', profileImage);

        await teacherService.update(parseInt(id), formDataPayload);
      } else {
        await teacherService.update(parseInt(id), cleanData);
      }
      setSuccessOpen(true);
    } catch (err: any) {
      console.error('Error updating teacher:', err);
      const msg = err.response?.data?.message || 'Failed to update teacher.';
      setErrorMessage(msg);
      setErrorOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const FormLabel = ({ children, icon: Icon, required }: { children: React.ReactNode, icon?: any, required?: boolean }) => (
    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
      {required && <span className="text-red-500 text-lg leading-none ml-0.5">*</span>}
    </Label>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg font-bold text-gray-500">Teacher not found</p>
        <Button onClick={() => navigate('/dashboard/teachers')} className="mt-4">
          Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <SuccessModal
        open={successOpen}
        title="Teacher Updated Successfully"
        description={`Details for ${teacher.user.name} have been updated.`}
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
        <button
          onClick={() => navigate('/dashboard/teachers')}
          className="flex items-center text-muted-foreground hover:text-saBlue transition-colors w-fit text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Teachers
        </button>

        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Edit Teacher</h1>
          <p className="text-gray-500 mt-1">
            Update teacher details for {teacher.user.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* SECTION 1: USER INFO WITH AVATAR */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Photo Card */}
          <Card className="md:col-span-1 rounded-3xl border-gray-100 shadow-sm h-full">
            <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-image-upload')?.click()}>
                <Avatar className="h-32 w-32 border-4 border-gray-50 shadow-inner">
                  <AvatarImage src={imagePreview || resolveImageUrl(teacher.user.profile_url)} className="object-cover" />
                  <AvatarFallback className="bg-gray-100 text-gray-400 text-3xl font-bold">
                    {teacher.user.name ? getInitials(teacher.user.name) : <User className="w-12 h-12 opacity-50" />}
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
                  disabled={isSaving}
                >
                  Change Photo
                </Button>
                <input
                  id="profile-image-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Max 5MB (JPEG, PNG, WebP)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card className="md:col-span-2 rounded-3xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-gray-700">Account Information</CardTitle>
              <CardDescription>Basic contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="col-span-2 space-y-2">
                  <FormLabel icon={User}>Full Name</FormLabel>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={isSaving}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel icon={Mail}>Email</FormLabel>
                  <Input
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={isSaving}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel icon={Phone}>Phone</FormLabel>
                  <Input
                    value={formData.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    disabled={isSaving}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: TEACHER DETAILS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-700">Teacher Details</CardTitle>
            <CardDescription>Update professional information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <FormLabel icon={GraduationCap}>Qualification</FormLabel>
                <Input
                  id="qualification"
                  placeholder="M.Sc. Mathematics, B.Ed."
                  value={formData.qualification || ''}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <FormLabel icon={Briefcase}>Experience</FormLabel>
                <Input
                  id="experience"
                  placeholder="5 years"
                  value={formData.experience || ''}
                  onChange={(e) => handleChange('experience', e.target.value)}
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-2">
                <FormLabel icon={User}>Gender</FormLabel>
                <Select
                  value={formData.gender || 'none'}
                  onValueChange={(value) => handleChange('gender', value === 'none' ? null : value as Gender)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="gender" className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
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
                    id="salary"
                    type="number"
                    placeholder="50000"
                    value={formData.salary ?? ''}
                    onChange={(e) => handleChange('salary', e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={isSaving}
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
                      disabled={isSaving}
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
                      <div className="max-h-60 overflow-y-auto space-y-1">
                        <div
                          className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                          onClick={() => {
                            handleChange('salary_currency_id', null);
                            setCurrencyOpen(false);
                            setCurrencySearch('');
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !formData.salary_currency_id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          None
                        </div>
                        {currencies
                          .filter((c) => c.code.toLowerCase().includes(currencySearch.toLowerCase()) || c.name.toLowerCase().includes(currencySearch.toLowerCase()))
                          .map((currency) => (
                            <div
                              key={currency.id}
                              className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => {
                                handleChange('salary_currency_id', currency.id);
                                setCurrencyOpen(false);
                                setCurrencySearch('');
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
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

              <div className="space-y-2">
                <FormLabel icon={Briefcase}>Teacher Role</FormLabel>
                <Select
                  value={formData.roleId?.toString() || 'none'}
                  onValueChange={(value) => handleChange('roleId', value === 'none' ? null : parseInt(value))}
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Role</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Assign a custom role to grant additional permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: ADDRESS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-700">Residential Address</CardTitle>
            <CardDescription>
              Update teacher address. All fields must be filled to save address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <FormLabel icon={MapPin}>Full Address</FormLabel>
              <Textarea
                id="addressLine"
                placeholder="Street address, apartment, suite, etc."
                value={formData.addressLine || ''}
                onChange={(e) => handleChange('addressLine', e.target.value)}
                disabled={isSaving}
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
                      disabled={isSaving}
                    >
                      {formData.countryId
                        ? countries.find((country) => country.id === formData.countryId)?.name
                        : "Select country..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 rounded-xl" align="start">
                    <div className="p-2 space-y-2">
                      <input
                        type="text"
                        placeholder="Search country..."
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-saBlue/20"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                      />
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        <div
                          className="flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            handleCountryChange(null);
                            setCountryOpen(false);
                            setCountrySearch("");
                          }}
                        >
                          <Check className={cn("mr-2 h-3 w-3", !formData.countryId ? "opacity-100" : "opacity-0")} />
                          None
                        </div>
                        {countries
                          .filter(country => country.name.toLowerCase().includes(countrySearch.toLowerCase()))
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
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.countryId === country.id ? "opacity-100" : "opacity-0"
                                )}
                              />
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
                      disabled={!selectedCountryId || isSaving}
                    >
                      {formData.stateId
                        ? states.find((state) => state.id === formData.stateId)?.name
                        : "Select state..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 rounded-xl" align="start">
                    <div className="p-2 space-y-2">
                      <input
                        type="text"
                        placeholder="Search state..."
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-saBlue/20"
                        value={stateSearch}
                        onChange={(e) => setStateSearch(e.target.value)}
                      />
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        <div
                          className="flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            handleStateChange(null);
                            setStateOpen(false);
                            setStateSearch("");
                          }}
                        >
                          <Check className={cn("mr-2 h-3 w-3", !formData.stateId ? "opacity-100" : "opacity-0")} />
                          None
                        </div>
                        {states
                          .filter(state => state.name.toLowerCase().includes(stateSearch.toLowerCase()))
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
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.stateId === state.id ? "opacity-100" : "opacity-0"
                                )}
                              />
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
                      disabled={!selectedStateId || isSaving}
                    >
                      {formData.cityId
                        ? cities.find((city) => city.id === formData.cityId)?.name
                        : "Select city..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 rounded-xl" align="start">
                    <div className="p-2 space-y-2">
                      <input
                        type="text"
                        placeholder="Search city..."
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-saBlue/20"
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
                  id="postalCode"
                  placeholder="e.g. 10001"
                  value={formData.postalCode || ''}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  disabled={isSaving}
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
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto h-12 rounded-xl bg-saBlue hover:bg-saBlue/90 shadow-lg shadow-saBlue/30 min-w-[160px]"
          >
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
    </div>
  );
}