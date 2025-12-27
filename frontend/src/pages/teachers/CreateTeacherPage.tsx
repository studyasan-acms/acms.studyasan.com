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
import { teacherService, locationService, currencyService } from '@/services/api';
import type { Country, State, City, Currency } from '@/types';
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

export default function CreateTeacherPage() {
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Form data being sent:', formData);

      const transformedData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        salary: formData.salary,
        salary_currency_id: formData.salary_currency_id,
        qualification: formData.qualification,
        gender: formData.gender,
        experience: formData.experience,
        address: {
          addressLine: formData.addressLine || '',
          countryId: formData.countryId || 0,
          stateId: formData.stateId || 0,
          cityId: formData.cityId || 0,
          postalCode: formData.postalCode || '',
        }
      };

      await teacherService.create(transformedData);
      setSuccessOpen(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create teacher.';
      setErrorMessage(msg);
      setErrorOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // ================= RENDER =================
  return (
    <div className="space-y-6">
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

      <div className="flex flex-col space-y-2">
        <Link
          to="/dashboard/teachers"
          className="flex items-center text-blue-600 text-sm hover:underline w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Teachers
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Add New Teacher</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create a new teacher account with details</p>
        </div>
      </div>

      <p className="text-sm text-gray-500">All fields required.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* User Information */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="sm:text-xl text-xl text-gray-600">User Information</CardTitle>
              <CardDescription>Basic account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-600">
                  Full Name <span className="text-saVividOrange">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-600">
                  Email <span className="text-saVividOrange">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-600">
                  Phone <span className="text-saVividOrange">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="1234567890"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-600">
                  Password <span className="text-saVividOrange">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>
            </CardContent>
          </Card>

          {/* Teacher Details */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="sm:text-xl text-xl text-gray-600">Teacher Details</CardTitle>
              <CardDescription>Professional information</CardDescription>
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
                  disabled={isLoading}
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
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-gray-600">
                  Gender
                </Label>
                <Select
                  value={formData.gender || ''}
                  onValueChange={(value) => handleChange('gender', value as Gender)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
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
                      disabled={isLoading}
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
                        disabled={isLoading}
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

          {/* Address Section */}
          <Card className="w-full md:col-span-2">
            <CardHeader>
              <CardTitle className="sm:text-xl text-xl text-gray-600">Address</CardTitle>
              <CardDescription>Teacher address details</CardDescription>
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
                  disabled={isLoading}
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
                        disabled={!selectedCountryId}
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
                        disabled={!selectedStateId}
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
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/teachers')}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
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