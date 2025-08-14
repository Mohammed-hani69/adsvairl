import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Crown, Upload, Building, MapPin, User, Phone, Mail } from "lucide-react";

const vipStoreSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(1, "رقم الهاتف مطلوب"),
  address: z.string().min(1, "العنوان مطلوب"),
  countryId: z.string().min(1, "الدولة مطلوبة"),
  stateId: z.string().min(1, "المحافظة مطلوبة"),
  cityId: z.string().min(1, "المدينة مطلوبة"),
  brandName: z.string().min(1, "اسم العلامة التجارية مطلوب"),
  specialty: z.string().min(1, "التخصص مطلوب"),
  logo: z.string().optional(),
  banner: z.string().optional(),
});

type VipStoreFormData = z.infer<typeof vipStoreSchema>;

interface Country {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  currency: string;
  vipPrice: string;
  paymentMethods: string[];
  requiresTransferProof: boolean;
}

interface State {
  id: string;
  name: string;
  nameEn: string;
  countryId: string;
}

interface City {
  id: string;
  name: string;
  nameEn: string;
  stateId: string;
}

export default function BecomeVip() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<State | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const form = useForm<VipStoreFormData>({
    resolver: zodResolver(vipStoreSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      countryId: "",
      stateId: "",
      cityId: "",
      brandName: "",
      specialty: "",
      logo: "",
      banner: "",
    },
  });

  // Fetch countries
  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["/api/vip/countries"],
  });

  // Fetch states
  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["/api/vip/states", form.watch("countryId")],
    enabled: !!form.watch("countryId"),
  });

  // Fetch cities
  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ["/api/vip/cities", form.watch("stateId")],
    enabled: !!form.watch("stateId"),
  });

  const createStoreMutation = useMutation({
    mutationFn: async (data: VipStoreFormData) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      
      if (logoFile) formData.append("logoFile", logoFile);
      if (bannerFile) formData.append("bannerFile", bannerFile);

      return await apiRequest("POST", "/api/vip/stores", formData);
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء المتجر بنجاح!",
        description: "يرجى الانتقال لصفحة الدفع لتفعيل عضوية VIP",
      });
      setStep(3); // Move to payment step
    },
    onError: (error) => {
      toast({
        title: "خطأ في إنشاء المتجر",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCountrySelect = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    setSelectedCountry(country || null);
    form.setValue("countryId", countryId);
    form.setValue("stateId", "");
    form.setValue("cityId", "");
    setSelectedState(null);
  };

  const handleStateSelect = (stateId: string) => {
    const state = states.find(s => s.id === stateId);
    setSelectedState(state || null);
    form.setValue("stateId", stateId);
    form.setValue("cityId", "");
  };

  const handleSubmit = (data: VipStoreFormData) => {
    if (step === 1) {
      // Validate personal info and move to brand info
      setStep(2);
    } else if (step === 2) {
      // Submit the store creation
      createStoreMutation.mutate(data);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Crown className="h-16 w-16 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          اشترك في عضوية VIP
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          أنشئ متجرك الخاص واحصل على مميزات حصرية
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
            1
          </div>
          <div className={`h-1 w-16 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
            2
          </div>
          <div className={`h-1 w-16 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
            3
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {step === 1 && <><User className="h-5 w-5" /> المعلومات الشخصية والعنوان</>}
            {step === 2 && <><Building className="h-5 w-5" /> معلومات العلامة التجارية</>}
            {step === 3 && <><Crown className="h-5 w-5" /> الدفع وتفعيل VIP</>}
          </CardTitle>
          <CardDescription>
            {step === 1 && "أدخل اسمك ورقم هاتفك وعنوانك بالتفصيل"}
            {step === 2 && "أدخل معلومات علامتك التجارية واللوجو والبانر"}
            {step === 3 && "اختر طريقة الدفع واكمل عملية الاشتراك"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(step === 1 || step === 2) && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              الاسم الكامل
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="أدخل اسمك الكامل" {...field} data-testid="input-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              رقم الهاتف
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="05xxxxxxxx" {...field} data-testid="input-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="countryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الدولة</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleCountrySelect(value);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-country">
                                  <SelectValue placeholder="اختر الدولة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country.id} value={country.id}>
                                    {country.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stateId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المحافظة</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                field.onChange(value);
                                handleStateSelect(value);
                              }}
                              disabled={!form.watch("countryId")}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-state">
                                  <SelectValue placeholder="اختر المحافظة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {states.map((state) => (
                                  <SelectItem key={state.id} value={state.id}>
                                    {state.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cityId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>المدينة</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={!form.watch("stateId")}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-city">
                                  <SelectValue placeholder="اختر المدينة" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {cities.map((city) => (
                                  <SelectItem key={city.id} value={city.id}>
                                    {city.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            العنوان بالتفصيل
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="أدخل عنوانك الكامل (الشارع، رقم البيت، أرقام مرجعية)"
                              className="min-h-[80px]"
                              {...field}
                              data-testid="textarea-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedCountry && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>سعر اشتراك VIP في {selectedCountry.name}:</strong> {selectedCountry.vipPrice} {selectedCountry.currency}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="brandName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Building className="h-4 w-4" />
                              اسم العلامة التجارية
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="أدخل اسم علامتك التجارية" {...field} data-testid="input-brand-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="specialty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>التخصص</FormLabel>
                            <FormControl>
                              <Input placeholder="مثال: أزياء، إلكترونيات، طعام" {...field} data-testid="input-specialty" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          اللوجو (اختياري)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          data-testid="input-logo"
                        />
                        <p className="text-xs text-gray-500">JPG, PNG - الحد الأقصى 2MB</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          البانر (اختياري)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          data-testid="input-banner"
                        />
                        <p className="text-xs text-gray-500">JPG, PNG - الحد الأقصى 5MB</p>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  {step === 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      data-testid="button-back"
                    >
                      رجوع
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={createStoreMutation.isPending}
                    className="ml-auto"
                    data-testid="button-next"
                  >
                    {step === 1 ? "التالي" : createStoreMutation.isPending ? "جاري الإنشاء..." : "إنشاء المتجر"}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-700 dark:text-green-300 mb-2">
                  تم إنشاء متجرك بنجاح!
                </h3>
                <p className="text-green-600 dark:text-green-400">
                  الآن يجب عليك دفع رسوم الاشتراك لتفعيل عضوية VIP
                </p>
              </div>

              <Button
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                data-testid="button-payment"
              >
                <Crown className="h-5 w-5 mr-2" />
                انتقل لصفحة الدفع
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}