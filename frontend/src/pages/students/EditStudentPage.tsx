import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  studentService,
  boardService,
  classService,
  locationService,
} from "@/services/api";
import type {
  Board,
  Class,
  Student,
  UpdateStudentData,
  Country,
  State,
  City,
} from "@/types";
import { ArrowLeft, Loader2, Save, Check, ChevronsUpDown, Camera, User, Mail, Phone, BookOpen, Globe, School, MapPin } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SuccessModal from "@/components/ui/successModal";
import ErrorModal from "@/components/ui/errorModal";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function EditStudentPage() {
  usePageTitle("Edit Student");
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [boards, setBoards] = useState<Board[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [student, setStudent] = useState<Student | null>(null);

  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(
    null
  );
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);

  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);

  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [successOpen, setSuccessOpen] = useState(false);

  // Profile image state
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [formData, setFormData] = useState<UpdateStudentData & { name?: string; email?: string; phone?: string }>({
    class_id: null,
    board_id: null,
    date_of_birth: null,
    gender: null,
    school: null,
    blood_group: null,
    addressLine: undefined,
    countryId: undefined,
    stateId: undefined,
    cityId: undefined,
    postalCode: undefined,
    name: undefined,
    email: undefined,
    phone: undefined,
  });

  useEffect(() => {
    fetchBoards();
    fetchClasses();
    fetchCountries();
    if (id) {
      fetchStudent(parseInt(id));
    }
  }, [id]);

  const fetchStudent = async (studentId: number) => {
    setIsLoading(true);
    try {
      const response = await studentService.getById(studentId);
      setStudent(response.data);

      // FIX: Convert date_of_birth from ISO string to YYYY-MM-DD format for HTML date input
      let formattedDateOfBirth = null;
      if (response.data.date_of_birth) {
        const date = new Date(response.data.date_of_birth);
        if (!isNaN(date.getTime())) {
          // Get local date parts (not UTC)
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          formattedDateOfBirth = `${year}-${month}-${day}`;
        }
      }

      // Set initial form data from student
      const initialData: UpdateStudentData & { name?: string; email?: string; phone?: string } = {
        class_id: response.data.class_id,
        board_id: response.data.board_id,
        date_of_birth: formattedDateOfBirth, // Use the formatted date
        gender: response.data.gender,
        school: response.data.school,
        blood_group: response.data.blood_group || null,
        addressLine: undefined,
        countryId: undefined,
        stateId: undefined,
        cityId: undefined,
        postalCode: undefined,
        name: response.data.user.name,
        email: response.data.user.email,
        phone: response.data.user.phone,
      };

      // If student has address, load it
      if (response.data.address) {
        const address = response.data.address;
        initialData.addressLine = address.addressLine;
        initialData.countryId = address.country.id;
        initialData.stateId = address.state.id;
        initialData.cityId = address.city.id;
        initialData.postalCode = address.postalCode || "";

        // Set selected IDs for dropdowns
        setSelectedCountryId(address.country.id);
        setSelectedStateId(address.state.id);

        // Fetch states for this country
        if (address.country.id) {
          try {
            const statesData = await locationService.getStatesByCountry(
              address.country.id
            );
            setStates(statesData);
          } catch (error) {
            console.error("Failed to load states:", error);
          }
        }

        // Fetch cities for this state
        if (address.state.id) {
          try {
            const citiesData = await locationService.getCitiesByState(
              address.state.id
            );
            setCities(citiesData);
          } catch (error) {
            console.error("Failed to load cities:", error);
          }
        }
      }

      setFormData(initialData);
    } catch (error) {
      setErrorMessage("Failed to load student data.");
      setErrorOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoards = async () => {
    try {
      const response = await boardService.getAll({ limit: 100 });
      setBoards(response.data.data);
    } catch {
      setErrorMessage("Failed to load boards.");
      setErrorOpen(true);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await classService.getAll({ limit: 100 });
      setClasses(response.data.data);
    } catch {
      setErrorMessage("Failed to load classes.");
      setErrorOpen(true);
    }
  };

  const fetchCountries = async () => {
    try {
      const data = await locationService.getCountries();
      setCountries(data);
    } catch {
      console.error("Failed to load countries");
    }
  };

  const fetchStatesByCountry = async (countryId: number) => {
    try {
      const data = await locationService.getStatesByCountry(countryId);
      setStates(data);
    } catch {
      console.error("Failed to load states");
    }
  };

  const fetchCitiesByState = async (stateId: number) => {
    try {
      const data = await locationService.getCitiesByState(stateId);
      setCities(data);
    } catch {
      console.error("Failed to load cities");
    }
  };

  const handleCountryChange = (value: string) => {
    if (value === "none") {
      setSelectedCountryId(null);
      setSelectedStateId(null);
      handleChange("countryId", null);
      handleChange("stateId", null);
      handleChange("cityId", null);
      setStates([]);
      setCities([]);
    } else {
      const id = parseInt(value);
      setSelectedCountryId(id);
      setSelectedStateId(null);
      handleChange("countryId", id);
      handleChange("stateId", null);
      handleChange("cityId", null);
      setStates([]);
      setCities([]);

      if (id) {
        fetchStatesByCountry(id);
      }
    }
  };

  const handleStateChange = (value: string) => {
    if (value === "none") {
      setSelectedStateId(null);
      handleChange("stateId", null);
      handleChange("cityId", null);
      setCities([]);
    } else {
      const id = parseInt(value);
      setSelectedStateId(id);
      handleChange("stateId", id);
      handleChange("cityId", null);
      setCities([]);

      if (id) {
        fetchCitiesByState(id);
      }
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

      // Transform blood group from frontend format (A+) to backend format (A_POS)
      const transformedData = {
        ...formData,
        blood_group: formData.blood_group
          ? formData.blood_group.replace("+", "_POS").replace("-", "_NEG")
          : null,
      };

      // Remove undefined values
      const cleanData: UpdateStudentData = {};

      Object.entries(transformedData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          (cleanData as any)[key] = value ?? null;
        }
      });

      console.log("Updating student with data:", cleanData);

      // If there's a profile image, use FormData
      if (profileImage) {
        const formData = new FormData();
        Object.entries(cleanData).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            formData.append(key, value.toString());
          }
        });
        formData.append('profileImage', profileImage);

        await studentService.update(parseInt(id), formData);
      } else {
        await studentService.update(parseInt(id), cleanData);
      }
      setSuccessOpen(true);
    } catch (err: any) {
      console.error("Error updating student:", err);
      const msg = err.response?.data?.message || "Failed to update student.";
      setErrorMessage(msg);
      setErrorOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]:
        value === ""
          ? field === "addressLine" || field === "postalCode" || field === "name" || field === "email" || field === "phone"
            ? ""
            : null
          : value,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-saBlue" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg font-medium text-gray-700">Student not found</p>
        <Button
          onClick={() => navigate("/dashboard/students")}
          className="mt-4"
        >
          Back to Students
        </Button>
      </div>
    );
  }

  // Function to convert backend blood group format to frontend display format
  function formatBloodGroupForDisplay(bg: string | null): string | null {
    if (!bg) return null;
    return bg.replace("_POS", "+").replace("_NEG", "-");
  }

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
        title="Student Updated Successfully"
        description={`Details for ${student.user.name} have been updated.`}
        showButtons={true}
        okText="OK"
        cancelText="Go Back"
        onConfirm={() => setSuccessOpen(false)}
        onCancel={() => navigate("/dashboard/students")}
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
        <button
          onClick={() => navigate("/dashboard/students")}
          className="flex items-center text-muted-foreground hover:text-saBlue transition-colors w-fit text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Students
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              Edit Student
            </h1>
            <p className="text-gray-500 mt-1">
              Update details for <span className="font-semibold text-saBlue">{student.user.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* SECTION 1: USER INFO & PROFILE PHOTO */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Photo Card */}
          <Card className="md:col-span-1 rounded-3xl border-gray-100 shadow-sm h-full">
            <CardContent className="pt-6 flex flex-col items-center justify-center h-full">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-image-upload')?.click()}>
                <div className="w-32 h-32 rounded-full border-4 border-gray-50 shadow-inner overflow-hidden relative">
                  <img
                    src={imagePreview || student.user.profile_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.user.name)}&background=f97316&color=ffffff&size=128`}
                    alt={student.user.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-8 h-8" />
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
                <p className="text-[10px] text-gray-400 mt-1">
                  Max 5MB (JPEG, PNG, WebP)
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
              <CardDescription>Primary account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 col-span-2">
                  <FormLabel icon={User}>Full Name</FormLabel>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => handleChange("name", e.target.value)}
                    disabled={isSaving}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel icon={Mail}>Email Address</FormLabel>
                  <Input
                    value={formData.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    disabled={isSaving}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <FormLabel icon={Phone}>Phone Number</FormLabel>
                  <Input
                    value={formData.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    disabled={isSaving}
                    className="h-11 rounded-xl bg-gray-50 border-gray-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: ACADEMIC DETAILS */}
        <Card className="rounded-3xl border-gray-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-gray-700">Academic & Personal Details</CardTitle>
            <CardDescription>Update schooling and personal info</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <FormLabel icon={BookOpen}>Class</FormLabel>
                <Select
                  value={formData.class_id?.toString() || "none"}
                  onValueChange={(value) =>
                    handleChange("class_id", value === "none" ? null : parseInt(value))
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FormLabel icon={Globe}>Board</FormLabel>
                <Select
                  value={formData.board_id?.toString() || "none"}
                  onValueChange={(value) =>
                    handleChange("board_id", value === "none" ? null : parseInt(value))
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select board" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {boards.map((board) => (
                      <SelectItem key={board.id} value={board.id.toString()}>{board.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <FormLabel icon={School}>School Name</FormLabel>
                <Input
                  placeholder="School Name"
                  value={formData.school || ""}
                  onChange={(e) => handleChange("school", e.target.value)}
                  disabled={isSaving}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Gender</FormLabel>
                <Select
                  value={formData.gender || "none"}
                  onValueChange={(value) =>
                    handleChange("gender", value === "none" ? null : value)
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select Gender" />
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
                <FormLabel>Date of Birth</FormLabel>
                <Input
                  type="date"
                  value={formData.date_of_birth || ""}
                  onChange={(e) => handleChange("date_of_birth", e.target.value)}
                  disabled={isSaving}
                  max={new Date().toISOString().split("T")[0]}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Blood Group</FormLabel>
                <Select
                  value={formatBloodGroupForDisplay(formData.blood_group ?? null) ?? "none"}
                  onValueChange={(value) =>
                    handleChange("blood_group", value === "none" ? null : value)
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Select Blood Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
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
            <CardTitle className="text-xl text-gray-700 flex items-center justify-between">
              Residential Address
              {student.address && (
                <span className="text-xs bg-green-50 text-green-600 px-2.5 py-1 rounded-full border border-green-100">
                  ✓ Address Saved
                </span>
              )}
            </CardTitle>
            <CardDescription>
              All address fields are required if you wish to update the address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <FormLabel icon={MapPin}>Address</FormLabel>
              <Textarea
                placeholder="123 Main Street, Apartment, etc."
                value={formData.addressLine || ""}
                onChange={(e) => handleChange("addressLine", e.target.value)}
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
                        : "Select Country..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 rounded-xl" align="start">
                    <div className="p-2 space-y-2">
                      <input
                        className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-saBlue/20"
                        placeholder="Search..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                      />
                      <div className="max-h-[200px] overflow-y-auto space-y-1">
                        <div
                          className="flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer hover:bg-gray-100 text-red-500"
                          onClick={() => {
                            handleCountryChange("none");
                            setCountryOpen(false);
                            setCountrySearch("");
                          }}
                        >
                          <Check className={cn("mr-2 h-3 w-3", !formData.countryId ? "opacity-100" : "opacity-0")} />
                          None
                        </div>
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
                                handleCountryChange(country.id.toString());
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
                      disabled={!selectedCountryId || isSaving}
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
                        placeholder="Search..."
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
                                handleStateChange(state.id.toString());
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
                      disabled={!selectedStateId || isSaving}
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
                        placeholder="Search..."
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
                                handleChange("cityId", city.id);
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
                  value={formData.postalCode || ""}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
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
            onClick={() => navigate('/dashboard/students')}
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
