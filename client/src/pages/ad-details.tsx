import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Heart, Share2, Phone, Mail, Eye, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { AdWithCategory } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useState } from "react";

export default function AdDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: ad, isLoading, error } = useQuery<AdWithCategory>({
    queryKey: ["/api/ads", id],
    enabled: !!id,
  });

  if (error) {
    return (
      <div className="min-h-screen bg-background font-cairo">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-6xl text-muted-foreground mb-4">❌</div>
              <h2 className="text-xl font-semibold mb-2">الإعلان غير موجود</h2>
              <p className="text-muted-foreground mb-4">لم يتم العثور على الإعلان المطلوب</p>
              <Button onClick={() => setLocation("/")}>العودة للرئيسية</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background font-cairo">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!ad) return null;

  const formatPrice = (price: number | null, currency: string | null = "ريال") => {
    if (!price) return "متفق عليه";
    return `${price.toLocaleString()} ${currency || "ريال"}`;
  };

  const timeAgo = formatDistanceToNow(new Date(ad.createdAt), {
    addSuffix: true,
    locale: ar,
  });

  const nextImage = () => {
    if (ad.images && ad.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % ad.images!.length);
    }
  };

  const prevImage = () => {
    if (ad.images && ad.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + ad.images!.length) % ad.images!.length);
    }
  };

  return (
    <div className="min-h-screen bg-background font-cairo">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation("/")}
            className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"
            data-testid="button-home"
          >
            الرئيسية
          </Button>
          <ArrowRight className="h-4 w-4" />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setLocation(`/category/${ad.categoryId}`)}
            className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"
            data-testid="button-category"
          >
            {ad.category.name}
          </Button>
          <ArrowRight className="h-4 w-4" />
          <span className="text-foreground">{ad.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {ad.images && ad.images.length > 0 ? (
                  <div className="relative">
                    <img
                      src={ad.images[currentImageIndex]}
                      alt={ad.title}
                      className="w-full h-64 md:h-96 object-cover"
                      data-testid={`img-ad-main`}
                    />
                    
                    {ad.images.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 opacity-80 hover:opacity-100"
                          onClick={prevImage}
                          data-testid="button-prev-image"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 opacity-80 hover:opacity-100"
                          onClick={nextImage}
                          data-testid="button-next-image"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 space-x-reverse">
                          {ad.images.map((_, index) => (
                            <button
                              key={index}
                              className={`w-2 h-2 rounded-full ${
                                index === currentImageIndex ? "bg-white" : "bg-white/50"
                              }`}
                              onClick={() => setCurrentImageIndex(index)}
                              data-testid={`button-image-dot-${index}`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Image Counter */}
                    <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      {currentImageIndex + 1} / {ad.images.length}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 md:h-96 bg-muted flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl text-muted-foreground mb-2">📷</div>
                      <p className="text-muted-foreground">لا توجد صور</p>
                    </div>
                  </div>
                )}

                {/* Thumbnail Gallery */}
                {ad.images && ad.images.length > 1 && (
                  <div className="p-4 border-t">
                    <div className="flex space-x-2 space-x-reverse overflow-x-auto">
                      {ad.images.map((image, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                            index === currentImageIndex ? "border-primary" : "border-transparent"
                          }`}
                          data-testid={`button-thumbnail-${index}`}
                        >
                          <img
                            src={image}
                            alt={`${ad.title} ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ad Details */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 font-cairo" data-testid="text-ad-title">
                      {ad.title}
                    </h1>
                    
                    <div className="flex items-center space-x-4 space-x-reverse text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 ml-1" />
                        <span data-testid="text-ad-views">{ad.views || 0} مشاهدة</span>
                      </div>
                      <span data-testid="text-ad-date">{timeAgo}</span>
                      <Badge variant="secondary" className={`category-${ad.category.nameEn}`}>
                        {ad.category.name}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Button variant="outline" size="icon" data-testid="button-favorite-ad">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" data-testid="button-share-ad">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className={`text-3xl font-bold category-${ad.category.nameEn}`} data-testid="text-ad-price">
                    {formatPrice(ad.price, ad.currency)}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 font-cairo">الوصف</h3>
                  <p className="text-foreground leading-relaxed whitespace-pre-line" data-testid="text-ad-description">
                    {ad.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 font-cairo">معلومات التواصل</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المعلن</span>
                    <span className="font-medium" data-testid="text-advertiser-name">{ad.user.username}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المنطقة</span>
                    <span className="font-medium" data-testid="text-ad-location">{ad.location}</span>
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <Button className="w-full" size="lg" data-testid="button-call">
                      <Phone className="h-4 w-4 ml-2" />
                      <span dir="ltr">{ad.phone}</span>
                    </Button>
                    
                    {ad.email && (
                      <Button variant="outline" className="w-full" data-testid="button-email">
                        <Mail className="h-4 w-4 ml-2" />
                        إرسال رسالة
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Safety Tips */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3 text-amber-800 font-cairo">نصائح للأمان</h3>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li>• تأكد من هوية البائع قبل الشراء</li>
                  <li>• قم بفحص المنتج قبل الدفع</li>
                  <li>• التقي في مكان عام وآمن</li>
                  <li>• لا تحول أموال قبل رؤية المنتج</li>
                  <li>• احذر من العروض المشبوهة</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
