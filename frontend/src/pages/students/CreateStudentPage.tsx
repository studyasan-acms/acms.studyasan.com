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
import { studentService, boardService, classService, locationService } from '@/services/api';
import type { Board, Class, Country, State, City } from '@/types';
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

export default function CreateStudentPage() {
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

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    class_id: null as number | null,
    board_id: null as number | null,
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
      console.log('Form data being sent:', formData);

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
  blood_group: formData.blood_group ? bloodGroupMap[formData.blood_group] : null,
  addressLine: formData.addressLine || '',
  school: formData.school || '',
  countryId: formData.countryId || 0, // ensure number
  stateId: formData.stateId || 0,     // ensure number
  cityId: formData.cityId || 0,       // ensure number
   postalCode: formData.postalCode || '',
};



      await studentService.create(transformedData);
      setSuccessOpen(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create student.';
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

      <div className="flex flex-col space-y-2">
        <Link
          to="/dashboard/students"
          className="flex items-center text-blue-600 text-sm hover:underline w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Students
        </Link>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-600">Add New Student</h1>
          <p className="text-muted-foreground mt-1 text-sm">Create a new student account with details</p>
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

          {/* Student Details */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="sm:text-xl text-xl text-gray-600">Student Details</CardTitle>
              <CardDescription>Additional student information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class" className="text-gray-600">
                  Class
                </Label>
                <Select
                  value={formData.class_id?.toString() || ''}
                  onValueChange={(value) => handleChange('class_id', parseInt(value))}
                  disabled={isLoading}
                >
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="board" className="text-gray-600">
                  Board
                </Label>
                <Select
                  value={formData.board_id?.toString() || ''}
                  onValueChange={(value) => handleChange('board_id', parseInt(value))}
                  disabled={isLoading}
                >
                  <SelectTrigger id="board">
                    <SelectValue placeholder="Select a board" />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id.toString()}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-gray-600">
                  Date of Birth
                </Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth || ''}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school" className="text-gray-600">
                  School
                </Label>
                <Input
                  id="school"
                  placeholder="ABC High School"
                  value={formData.school || ''}
                  onChange={(e) => handleChange('school', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blood_group" className="text-gray-600">
                  Blood Group
                </Label>
                <Select
                  value={formData.blood_group || ''}
                  onValueChange={(value) => handleChange('blood_group', value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="blood_group">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Address Section */}
          <Card className="w-full md:col-span-2">
            <CardHeader>
              <CardTitle className="sm:text-xl text-xl text-gray-600">Address</CardTitle>
              <CardDescription>Student address details</CardDescription>
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
            onClick={() => navigate('/dashboard/students')}
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
                Create Student
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
