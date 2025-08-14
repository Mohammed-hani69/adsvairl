import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Check, X, Eye, BarChart3, Users, FileText, Star } from "lucide-react";
import type { AdWithCategory } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface AdminStats {
  totalAds: number;
  pendingAds: number;
  approvedAds: number;
  featuredAds: number;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch admin stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  // Fetch pending ads
  const { data: pendingAds, isLoading: pendingLoading } = useQuery<AdWithCategory[]>({
    queryKey: ["/api/admin/ads/pending"],
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
      queryClient.invalidateQueries({ queryKey: ['/api/ads'] });
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
        description: "تم رفض الإعلان وإزالته من القائمة",
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

  const formatPrice = (price: number | null, currency: string | null = "ريال") => {
    if (!price) return "متفق عليه";
    return `${price.toLocaleString()} ${currency || "ريال"}`;
  };

  return (
    <div className="min-h-screen bg-background font-cairo">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground font-cairo">لوحة الإدارة</h1>
          <p className="text-muted-foreground mt-2">إدارة الإعلانات والمحتوى</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إجمالي الإعلانات</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-ads">
                      {stats.totalAds}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">في انتظار المراجعة</p>
                    <p className="text-2xl font-bold text-yellow-600" data-testid="text-pending-ads">
                      {stats.pendingAds}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إعلانات معتمدة</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-approved-ads">
                      {stats.approvedAds}
                    </p>
                  </div>
                  <Check className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">إعلانات مميزة</p>
                    <p className="text-2xl font-bold text-purple-600" data-testid="text-featured-ads">
                      {stats.featuredAds}
                    </p>
                  </div>
                  <Star className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending" data-testid="tab-pending">
              الإعلانات المعلقة ({pendingAds?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">الإعلانات المعتمدة</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">الإعدادات</TabsTrigger>
          </TabsList>

          {/* Pending Ads */}
          <TabsContent value="pending" className="space-y-6">
            {pendingLoading ? (
              <div>جاري التحميل...</div>
            ) : (
              <>
                {pendingAds && pendingAds.length > 0 ? (
                  <div className="space-y-4" data-testid="list-pending-ads">
                    {pendingAds.map((ad) => (
                      <Card key={ad.id} className="overflow-hidden">
                        <div className="flex">
                          {/* Image */}
                          <div className="w-32 h-24 flex-shrink-0">
                            {ad.images && ad.images.length > 0 ? (
                              <img
                                src={ad.images[0]}
                                alt={ad.title}
                                className="w-full h-full object-cover"
                                data-testid={`img-pending-ad-${ad.id}`}
                              />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <CardContent className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <h3 className="font-semibold text-foreground" data-testid={`text-pending-ad-title-${ad.id}`}>
                                  {ad.title}
                                </h3>
                                
                                <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground">
                                  <Badge variant="secondary" className={`category-${ad.category.nameEn}`}>
                                    {ad.category.name}
                                  </Badge>
                                  <span>{ad.location}</span>
                                  <span>{formatDistanceToNow(new Date(ad.createdAt), { addSuffix: true, locale: ar })}</span>
                                </div>

                                <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-pending-ad-description-${ad.id}`}>
                                  {ad.description}
                                </p>

                                <div className={`font-bold category-${ad.category.nameEn}`} data-testid={`text-pending-ad-price-${ad.id}`}>
                                  {formatPrice(ad.price, ad.currency)}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-2 space-x-reverse mr-4">
                                <Button
                                  size="sm"
                                  onClick={() => approveAdMutation.mutate(ad.id)}
                                  disabled={approveAdMutation.isPending}
                                  className="bg-green-600 hover:bg-green-700"
                                  data-testid={`button-approve-${ad.id}`}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectAdMutation.mutate(ad.id)}
                                  disabled={rejectAdMutation.isPending}
                                  data-testid={`button-reject-${ad.id}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center" data-testid="empty-state-pending-ads">
                      <Check className="h-16 w-16 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">لا توجد إعلانات معلقة</h3>
                      <p className="text-muted-foreground">جميع الإعلانات تمت مراجعتها واعتمادها</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* Approved Ads */}
          <TabsContent value="approved">
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">الإعلانات المعتمدة</h3>
                <p className="text-muted-foreground">هنا يمكنك مراجعة وإدارة الإعلانات المعتمدة</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings">
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">إعدادات النظام</h3>
                <p className="text-muted-foreground">إدارة إعدادات الموقع والمستخدمين</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
