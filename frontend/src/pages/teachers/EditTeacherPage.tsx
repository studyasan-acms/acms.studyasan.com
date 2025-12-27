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
import type { Teacher, Country, State, City, Currency } from '@/types';
import { ArrowLeft, Loader2, Save, Check, ChevronsUpDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import SuccessModal from '@/components/ui/successModal';
import ErrorModal from '@/components/ui/errorModal';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Gender = "M" | "F" | "OTHER" | null;

export default function EditTeacherPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [teacher, setTeacher] = useState<Teacher | null>(null);
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

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

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
  });

  // ================= FETCH DATA =================
  useEffect(() => {
    if (id) {
      fetchTeacher(parseInt(id));
    }
    fetchCountries();
    fetchCurrencies();
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

      if (Object.keys(cleanData).length === 0) {
        setErrorMessage('No changes to save.');
        setErrorOpen(true);
        setIsSaving(false);
        return;
      }

      console.log('Updating teacher with data:', cleanData);

      await teacherService.update(parseInt(id), cleanData);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-lg font-medium">Teacher not found</p>
        <Button onClick={() => navigate('/dashboard/teachers')} className="mt-4">
          Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUCCESS MODAL */}
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

      {/* ERROR MODAL */}
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
      <div className="flex flex-col space-y-2">
        <button
          onClick={() => navigate('/dashboard/teachers')}
          className="flex items-center text-blue-600 text-sm hover:underline w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Teachers
        </button>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Edit Teacher</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Update teacher details for {teacher.user.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Information Card (read-only) */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">User Information</CardTitle>
              <CardDescription>Account information (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-600">Full Name</Label>
                <Input value={teacher.user.name} disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">Email</Label>
                <Input value={teacher.user.email} disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600">Phone</Label>
                <Input value={teacher.user.phone} disabled />
              </div>
              <p className="text-xs text-muted-foreground">
                User account details cannot be edited here.
              </p>
            </CardContent>
          </Card>

          {/* Editable Teacher Details */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">Teacher Details</CardTitle>
              <CardDescription>Update professional information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qualification" className="text-gray-600">
                  Qualification
                </Label>
                <Input
                  id="qualification"
                  placeholder="M.Sc. Mathematics, B.Ed."
                  value={formData.qualification || ''}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="text-gray-600">
                  Experience
                </Label>
                <Input
                  id="experience"
                  placeholder="5 years"
                  value={formData.experience || ''}
                  onChange={(e) => handleChange('experience', e.target.value)}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-gray-600">
                  Gender
                </Label>
                <Select
                  value={formData.gender || 'none'}
                  onValueChange={(value) => handleChange('gender', value === 'none' ? null : value as Gender)}
                  disabled={isSaving}
                >
                  <SelectTrigger id="gender">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-gray-600">
                    Salary (Monthly)
                  </Label>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-3 py-2 border border-r-0 rounded-l-md bg-gray-50 text-gray-700">
                      {currencies.find((c) => c.id === formData.salary_currency_id)?.symbol || '¤'}
                    </span>
                    <Input
                      id="salary"
                      type="number"
                      placeholder="50000"
                      value={formData.salary ?? ''}
                      onChange={(e) => handleChange('salary', e.target.value ? parseFloat(e.target.value) : null)}
                      disabled={isSaving}
                      className="rounded-l-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_currency" className="text-gray-600">
                    Currency
                  </Label>
                  <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={currencyOpen}
                        className="w-full justify-between"
                        disabled={isSaving}
                      >
                        {formData.salary_currency_id
                          ? `${currencies.find((c) => c.id === formData.salary_currency_id)?.code} - ${currencies.find((c) => c.id === formData.salary_currency_id)?.name}`
                          : 'Select currency...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="Search currency..."
                          className="w-full px-2 py-1 border rounded"
                          value={currencySearch}
                          onChange={(e) => setCurrencySearch(e.target.value)}
                        />
                        <div className="max-h-60 overflow-y-auto">
                          <div
                            className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
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
                                className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
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
              </div>
            </CardContent>
          </Card>

          {/* Address Section - FIXED WITH POPOVER SEARCH COMPONENTS */}
          <Card className="w-full md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl text-gray-600">Address</CardTitle>
              <CardDescription>
                Update teacher address. All fields must be filled to save address.
                {teacher.address && (
                  <span className="text-green-600 ml-2">✓ Address exists</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine" className="text-gray-600">
                  Address
                </Label>
                <Textarea
                  id="addressLine"
                  placeholder="123 Main Street, Apartment, etc."
                  value={formData.addressLine || ''}
                  onChange={(e) => handleChange('addressLine', e.target.value)}
                  disabled={isSaving}
                  className="w-full"
                  rows={3}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country" className="text-gray-600">
                    Country
                  </Label>
                  <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryOpen}
                        className="w-full justify-between"
                        disabled={isSaving}
                      >
                        {formData.countryId
                          ? countries.find((country) => country.id === formData.countryId)?.name
                          : "Select country..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="Search country..."
                          className="w-full px-2 py-1 border rounded"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                        />
                        <div className="max-h-60 overflow-y-auto">
                          <div
                            className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              handleCountryChange(null);
                              setCountryOpen(false);
                              setCountrySearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !formData.countryId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            None
                          </div>
                          {countries
                            .filter(country => country.name.toLowerCase().includes(countrySearch.toLowerCase()))
                            .map((country) => (
                              <div
                                key={country.id}
                                className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
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
                  <Label htmlFor="state" className="text-gray-600">
                    State
                  </Label>
                  <Popover open={stateOpen} onOpenChange={setStateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={stateOpen}
                        className="w-full justify-between"
                        disabled={!selectedCountryId || isSaving}
                      >
                        {formData.stateId
                          ? states.find((state) => state.id === formData.stateId)?.name
                          : "Select state..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="Search state..."
                          className="w-full px-2 py-1 border rounded"
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                        />
                        <div className="max-h-60 overflow-y-auto">
                          <div
                            className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              handleStateChange(null);
                              setStateOpen(false);
                              setStateSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !formData.stateId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            None
                          </div>
                          {states
                            .filter(state => state.name.toLowerCase().includes(stateSearch.toLowerCase()))
                            .map((state) => (
                              <div
                                key={state.id}
                                className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
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
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-gray-600">
                    City
                  </Label>
                  <Popover open={cityOpen} onOpenChange={setCityOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={cityOpen}
                        className="w-full justify-between"
                        disabled={!selectedStateId || isSaving}
                      >
                        {formData.cityId
                          ? cities.find((city) => city.id === formData.cityId)?.name
                          : "Select city..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="Search city..."
                          className="w-full px-2 py-1 border rounded"
                          value={citySearch}
                          onChange={(e) => setCitySearch(e.target.value)}
                        />
                        <div className="max-h-60 overflow-y-auto">
                          <div
                            className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              handleChange('cityId', null);
                              setCityOpen(false);
                              setCitySearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !formData.cityId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            None
                          </div>
                          {cities
                            .filter(city => city.name.toLowerCase().includes(citySearch.toLowerCase()))
                            .map((city) => (
                              <div
                                key={city.id}
                                className="flex items-center px-2 py-1 hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                  handleChange('cityId', city.id);
                                  setCityOpen(false);
                                  setCitySearch("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.cityId === city.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {city.name}
                              </div>
                            ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode" className="text-gray-600">
                    Postal Code
                  </Label>
                  <Input
                    id="postalCode"
                    placeholder="123456"
                    value={formData.postalCode || ''}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/teachers')}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
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