import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const adminLoginSchema = z.object({
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

interface AdminLoginProps {
  onLogin: (isAdmin: boolean) => void;
}

export default function AdminLogin({ onLogin }: AdminLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const handleSubmit = async (data: AdminLoginFormData) => {
    setIsLoading(true);
    setError("");
    
    try {
      // Simple admin login check (for demonstration)
      // In production, this should be proper authentication with backend
      if (data.username === "admin" && data.password === "admin123") {
        localStorage.setItem("isAdmin", "true");
        onLogin(true);
      } else {
        setError("اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch (error) {
      setError("حدث خطأ في تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">دخول الإدارة</CardTitle>
          <CardDescription>
            قم بتسجيل الدخول للوصول إلى لوحة التحكم
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستخدم</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="أدخل اسم المستخدم"
                        {...field}
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="أدخل كلمة المرور"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? "جاري تسجيل الدخول..." : "دخول"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>بيانات تجريبية:</p>
            <p>المستخدم: admin | كلمة المرور: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}