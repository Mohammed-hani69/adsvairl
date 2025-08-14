import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import AdminLogin from "./admin-login";
import { Check, X, Eye, BarChart3, Users, FileText, Star, Crown, Shield, Settings, LogOut, Building } from "lucide-react";
import type { AdWithCategory } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface AdminStats {
  totalAds: number;
  pendingAds: number;
  approvedAds: number;
  featuredAds: number;
}

interface VipStore {
  id: string;
  userId: string;
  storeName: string;
  brandName: string;
  specialty: string;
  logo: string | null;
  banner: string | null;
  address: string;
  phone: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  country: {
    name: string;
    currency: string;
    vipPrice: string;
  };
  state: {
    name: string;
  };
  city: {
    name: string;
  };
  user: {
    username: string;
    isVip: boolean;
  };
}

interface VipOrder {
  id: string;
  userId: string;
  storeId: string;
  countryId: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  transferProofImage: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

interface Country {
  id: string;
  name: string;
  currency: string;
  vipPrice: string;
  paymentMethods: string[];
  requiresTransferProof: boolean;
  isActive: boolean;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");

  useEffect(() => {
    const adminStatus = localStorage.getItem("isAdmin");
    if (adminStatus === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (isAdmin: boolean) => {
    setIsLoggedIn(isAdmin);
  };

  const handleLogout = () => {
    localStorage.removeItem("isAdmin");
    setIsLoggedIn(false);
    toast({
      title: "تم تسجيل الخروج",
      description: "تم تسجيل خروجك من لوحة الإدارة",
    });
  };

  // Fetch admin stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isLoggedIn,
  });

  // Fetch pending ads
  const { data: pendingAds, isLoading: pendingLoading } = useQuery<AdWithCategory[]>({
    queryKey: ["/api/admin/ads/pending"],
    enabled: isLoggedIn,
  });

  // Fetch VIP stores
  const { data: vipStores, isLoading: vipStoresLoading } = useQuery<VipStore[]>({
    queryKey: ["/api/admin/vip/stores"],
    enabled: isLoggedIn,
  });

  // Fetch VIP orders
  const { data: vipOrders, isLoading: vipOrdersLoading } = useQuery<VipOrder[]>({
    queryKey: ["/api/admin/vip/orders"],
    enabled: isLoggedIn,
  });

  // Fetch countries
  const { data: countries, isLoading: countriesLoading } = useQuery<Country[]>({
    queryKey: ["/api/admin/countries"],
    enabled: isLoggedIn,
  });

  // Approve ad mutation
  const approveAdMutation = useMutation({
    mutationFn: async (adId: string) => {
      return apiRequest('PATCH', `/api/admin/ads/${adId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "تم اعتماد الإعلان",
        description: "تم اعتماد الإعلان ونشره بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    },
    onError: () => {
      toast({
        title: "خطأ في اعتماد الإعلان",
        description: "حدث خطأ أثناء اعتماد الإعلان",
        variant: "destructive",
      });
    },
  });

  // Reject ad mutation
  const rejectAdMutation = useMutation({
    mutationFn: async (adId: string) => {
      return apiRequest('PATCH', `/api/admin/ads/${adId}/reject`, {});
    },
    onSuccess: () => {
      toast({
        title: "تم رفض الإعلان",
        description: "تم رفض الإعلان وإزالته",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    },
    onError: () => {
      toast({
        title: "خطأ في رفض الإعلان",
        description: "حدث خطأ أثناء رفض الإعلان",
        variant: "destructive",
      });
    },
  });

  // Approve VIP store mutation
  const approveVipStoreMutation = useMutation({
    mutationFn: async (storeId: string) => {
      return apiRequest('PATCH', `/api/admin/vip/stores/${storeId}/approve`, {});
    },
    onSuccess: () => {
      toast({
        title: "تم اعتماد المتجر",
        description: "تم اعتماد المتجر وتفعيل عضوية VIP",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vip'] });
    },
    onError: () => {
      toast({
        title: "خطأ في اعتماد المتجر",
        description: "حدث خطأ أثناء اعتماد المتجر",
        variant: "destructive",
      });
    },
  });

  // Update VIP order mutation
  const updateVipOrderMutation = useMutation({
    mutationFn: async ({ orderId, status, adminNotes }: { orderId: string; status: string; adminNotes: string }) => {
      return apiRequest('PATCH', `/api/admin/vip/orders/${orderId}`, { status, adminNotes });
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث الطلب",
        description: "تم تحديث حالة الطلب بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/vip/orders'] });
    },
    onError: () => {
      toast({
        title: "خطأ في تحديث الطلب",
        description: "حدث خطأ أثناء تحديث الطلب",
        variant: "destructive",
      });
    },
  });

  // Update country mutation
  const updateCountryMutation = useMutation({
    mutationFn: async ({ countryId, updates }: { countryId: string; updates: Partial<Country> }) => {
      return apiRequest('PATCH', `/api/admin/countries/${countryId}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "تم تحديث الدولة",
        description: "تم تحديث إعدادات الدولة بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/countries'] });
    },
    onError: () => {
      toast({
        title: "خطأ في تحديث الدولة",
        description: "حدث خطأ أثناء تحديث الدولة",
        variant: "destructive",
      });
    },
  });

  if (!isLoggedIn) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background font-cairo">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">لوحة تحكم الإدارة</h1>
              <p className="text-muted-foreground">إدارة الإعلانات والمستخدمين VIP</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-4 w-4 mr-2" />
            تسجيل الخروج
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stats" data-testid="tab-stats">
              <BarChart3 className="h-4 w-4 mr-2" />
              الإحصائيات
            </TabsTrigger>
            <TabsTrigger value="ads" data-testid="tab-ads">
              <FileText className="h-4 w-4 mr-2" />
              الإعلانات
            </TabsTrigger>
            <TabsTrigger value="vip-stores" data-testid="tab-vip-stores">
              <Crown className="h-4 w-4 mr-2" />
              متاجر VIP
            </TabsTrigger>
            <TabsTrigger value="vip-orders" data-testid="tab-vip-orders">
              <Building className="h-4 w-4 mr-2" />
              طلبات VIP
            </TabsTrigger>
            <TabsTrigger value="countries" data-testid="tab-countries">
              <Settings className="h-4 w-4 mr-2" />
              الدول
            </TabsTrigger>
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي الإعلانات</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-ads">{stats?.totalAds || 0}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الإعلانات المعتمدة</CardTitle>
                  <Check className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-approved-ads">{stats?.approvedAds || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الإعلانات المعلقة</CardTitle>
                  <Eye className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600" data-testid="text-pending-ads">{stats?.pendingAds || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">الإعلانات المميزة</CardTitle>
                  <Star className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600" data-testid="text-featured-ads">{stats?.featuredAds || 0}</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ads Management Tab */}
          <TabsContent value="ads" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>الإعلانات المعلقة</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingLoading ? (
                  <p>جاري تحميل الإعلانات...</p>
                ) : pendingAds && pendingAds.length > 0 ? (
                  <div className="space-y-4">
                    {pendingAds.map((ad) => (
                      <div key={ad.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold" data-testid={`text-ad-title-${ad.id}`}>{ad.title}</h3>
                            <p className="text-sm text-muted-foreground">{ad.description}</p>
                            <div className="flex items-center gap-2 mt-2 text-sm">
                              <Badge variant="secondary">{ad.category.name}</Badge>
                              <span>{ad.price} {ad.currency}</span>
                              <span>•</span>
                              <span>{ad.location}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              منذ {formatDistanceToNow(new Date(ad.createdAt), { locale: ar, addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveAdMutation.mutate(ad.id)}
                              disabled={approveAdMutation.isPending}
                              data-testid={`button-approve-${ad.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              اعتماد
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectAdMutation.mutate(ad.id)}
                              disabled={rejectAdMutation.isPending}
                              data-testid={`button-reject-${ad.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              رفض
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد إعلانات معلقة</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VIP Stores Tab */}
          <TabsContent value="vip-stores" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  طلبات متاجر VIP
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vipStoresLoading ? (
                  <p>جاري تحميل المتاجر...</p>
                ) : vipStores && vipStores.length > 0 ? (
                  <div className="space-y-4">
                    {vipStores.map((store) => (
                      <div key={store.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold" data-testid={`text-store-name-${store.id}`}>{store.brandName}</h3>
                              <Badge variant={store.isApproved ? "default" : "secondary"}>
                                {store.isApproved ? "معتمد" : "معلق"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{store.specialty}</p>
                            <div className="text-sm mt-2 space-y-1">
                              <p><strong>المالك:</strong> {store.user.username}</p>
                              <p><strong>الهاتف:</strong> {store.phone}</p>
                              <p><strong>العنوان:</strong> {store.address}</p>
                              <p><strong>الموقع:</strong> {store.city.name}, {store.state.name}, {store.country.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              منذ {formatDistanceToNow(new Date(store.createdAt), { locale: ar, addSuffix: true })}
                            </p>
                          </div>
                          {!store.isApproved && (
                            <Button
                              size="sm"
                              onClick={() => approveVipStoreMutation.mutate(store.id)}
                              disabled={approveVipStoreMutation.isPending}
                              data-testid={`button-approve-store-${store.id}`}
                            >
                              <Crown className="h-4 w-4 mr-1" />
                              اعتماد VIP
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد طلبات متاجر VIP</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* VIP Orders Tab */}
          <TabsContent value="vip-orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  طلبات الدفع VIP
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vipOrdersLoading ? (
                  <p>جاري تحميل الطلبات...</p>
                ) : vipOrders && vipOrders.length > 0 ? (
                  <div className="space-y-4">
                    {vipOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">طلب رقم {order.id.substring(0, 8)}</h3>
                              <Badge variant={
                                order.status === "approved" ? "default" :
                                order.status === "rejected" ? "destructive" : "secondary"
                              }>
                                {order.status === "pending" ? "معلق" : 
                                 order.status === "approved" ? "معتمد" : 
                                 order.status === "rejected" ? "مرفوض" : order.status}
                              </Badge>
                            </div>
                            <div className="text-sm mt-2 space-y-1">
                              <p><strong>المبلغ:</strong> {order.amount} {order.currency}</p>
                              <p><strong>طريقة الدفع:</strong> {order.paymentMethod}</p>
                              {order.transferProofImage && (
                                <p><strong>صورة الحوالة:</strong> 
                                  <a href={order.transferProofImage} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                                    عرض الصورة
                                  </a>
                                </p>
                              )}
                              {order.adminNotes && (
                                <p><strong>ملاحظات الإدارة:</strong> {order.adminNotes}</p>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              منذ {formatDistanceToNow(new Date(order.createdAt), { locale: ar, addSuffix: true })}
                            </p>
                          </div>
                          {order.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updateVipOrderMutation.mutate({
                                  orderId: order.id,
                                  status: "approved",
                                  adminNotes: "تم اعتماد الدفع"
                                })}
                                disabled={updateVipOrderMutation.isPending}
                                data-testid={`button-approve-order-${order.id}`}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                اعتماد
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateVipOrderMutation.mutate({
                                  orderId: order.id,
                                  status: "rejected", 
                                  adminNotes: "تم رفض الدفع"
                                })}
                                disabled={updateVipOrderMutation.isPending}
                                data-testid={`button-reject-order-${order.id}`}
                              >
                                <X className="h-4 w-4 mr-1" />
                                رفض
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد طلبات دفع VIP</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Countries Management Tab */}
          <TabsContent value="countries" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  إدارة إعدادات الدول
                </CardTitle>
              </CardHeader>
              <CardContent>
                {countriesLoading ? (
                  <p>جاري تحميل الدول...</p>
                ) : countries && countries.length > 0 ? (
                  <div className="space-y-4">
                    {countries.map((country) => (
                      <div key={country.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{country.name}</h3>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <label className="text-sm font-medium">سعر VIP ({country.currency})</label>
                                <Input
                                  type="number"
                                  defaultValue={country.vipPrice}
                                  onBlur={(e) => {
                                    if (e.target.value !== country.vipPrice) {
                                      updateCountryMutation.mutate({
                                        countryId: country.id,
                                        updates: { vipPrice: e.target.value }
                                      });
                                    }
                                  }}
                                  data-testid={`input-price-${country.id}`}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`active-${country.id}`}
                                  defaultChecked={country.isActive}
                                  onChange={(e) => {
                                    updateCountryMutation.mutate({
                                      countryId: country.id,
                                      updates: { isActive: e.target.checked }
                                    });
                                  }}
                                  data-testid={`checkbox-active-${country.id}`}
                                />
                                <label htmlFor={`active-${country.id}`} className="text-sm">فعال</label>
                              </div>
                            </div>
                            <div className="mt-2">
                              <span className="text-sm text-muted-foreground">
                                طرق الدفع: {country.paymentMethods.join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">لا توجد دول مُعرَّفة</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}