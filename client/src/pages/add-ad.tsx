import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Upload, X, Camera } from "lucide-react";
import type { Category } from "@shared/schema";
import { LOCATIONS } from "@/lib/types";

const addAdSchema = z.object({
  title: z.string().min(5, "عنوان الإعلان يجب أن يكون على الأقل 5 أحرف"),
  description: z.string().min(20, "الوصف يجب أن يكون على الأقل 20 حرف"),
  price: z.string().optional(),
  currency: z.string().default("ريال"),
  categoryId: z.string().min(1, "يرجى اختيار الفئة"),
  location: z.string().min(1, "يرجى اختيار المنطقة"),
  phone: z.string().min(10, "رقم الهاتف يجب أن يكون على الأقل 10 أرقام"),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  userId: z.string().default("temp-user"), // Temporary until we implement auth
});

type AddAdForm = z.infer<typeof addAdSchema>;

export default function AddAd() {
  const [, setLocation] = useLocation();
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<AddAdForm>({
    resolver: zodResolver(addAdSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      currency: "ريال",
      categoryId: "",
      location: "",
      phone: "",
      email: "",
      userId: "temp-user",
    },
  });

  const addAdMutation = useMutation({
    mutationFn: async (data: AddAdForm) => {
      const formData = new FormData();
      
      // Add text fields
      Object.entries(data).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value.toString());
        }
      });

      // Add images
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      return apiRequest('POST', '/api/ads', formData);
    },
    onSuccess: () => {
      toast({
        title: "تم إنشاء الإعلان بنجاح",
        description: "سيتم مراجعة الإعلان ونشره خلال 24 ساعة",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ads'] });
      setLocation('/');
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في إنشاء الإعلان",
        description: error.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    if (selectedImages.length + files.length > 5) {
      toast({
        title: "تجاوز الحد المسموح",
        description: "يمكن رفع 5 صور كحد أقصى",
        variant: "destructive",
      });
      return;
    }

    const newImages = [...selectedImages, ...files];
    setSelectedImages(newImages);

    // Create preview URLs
    const newPreviewUrls = [...imagePreviewUrls];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviewUrls.push(e.target?.result as string);
        setImagePreviewUrls([...newPreviewUrls]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviewUrls = imagePreviewUrls.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
  };

  const onSubmit = (data: AddAdForm) => {
    addAdMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background font-cairo">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card data-testid="card-add-ad-form">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center font-cairo">
              إضافة إعلان جديد
            </CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان الإعلان *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="أدخل عنواناً واضحاً ومفصلاً لإعلانك"
                          className="text-right"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category and Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الفئة *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="اختر الفئة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المنطقة *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-location">
                              <SelectValue placeholder="اختر المنطقة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOCATIONS.map((location) => (
                              <SelectItem key={location} value={location}>
                                {location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Price */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السعر (اختياري)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          placeholder="أدخل السعر أو اتركه فارغاً إذا كان متفق عليه"
                          className="text-right"
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف مفصل *</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          rows={5}
                          placeholder="اكتب وصفاً مفصلاً عن الإعلان يتضمن جميع المعلومات المهمة"
                          className="text-right resize-none"
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الهاتف *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="05xxxxxxxx"
                            className="text-right"
                            data-testid="input-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني (اختياري)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email"
                            placeholder="example@email.com"
                            className="text-right"
                            data-testid="input-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label className="text-sm font-medium">الصور (اختياري - حتى 5 صور)</Label>
                  
                  <div className="mt-2 space-y-4">
                    {/* Upload Button */}
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
                      <input
                        type="file"
                        id="images"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        data-testid="input-images"
                      />
                      <label
                        htmlFor="images"
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          اضغط لاختيار الصور أو اسحب الملفات هنا
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PNG, JPG, JPEG, WebP (حد أقصى 5MB لكل صورة)
                        </span>
                      </label>
                    </div>

                    {/* Image Previews */}
                    {imagePreviewUrls.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg"
                              data-testid={`img-preview-${index}`}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={() => removeImage(index)}
                              data-testid={`button-remove-image-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="px-8"
                    disabled={addAdMutation.isPending}
                    data-testid="button-submit-ad"
                  >
                    {addAdMutation.isPending ? "جاري النشر..." : "نشر الإعلان"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
