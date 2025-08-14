import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Share2, Camera } from "lucide-react";
import type { AdWithCategory } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface AdCardProps {
  ad: AdWithCategory;
  variant?: "featured" | "regular";
}

export default function AdCard({ ad, variant = "regular" }: AdCardProps) {
  const formatPrice = (price: number | null, currency: string | null = "ريال") => {
    if (!price) return "متفق عليه";
    return `${price.toLocaleString()} ${currency || "ريال"}`;
  };

  const timeAgo = formatDistanceToNow(new Date(ad.createdAt), {
    addSuffix: true,
    locale: ar,
  });

  if (variant === "featured") {
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group" data-testid={`card-ad-${ad.id}`}>
        <Link href={`/ad/${ad.id}`}>
          <div className="relative">
            {ad.images && ad.images.length > 0 ? (
              <img
                src={ad.images[0]}
                alt={ad.title}
                className="w-full h-48 object-cover"
                data-testid={`img-ad-${ad.id}`}
              />
            ) : (
              <div className="w-full h-48 bg-muted flex items-center justify-center">
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            
            {ad.isFeatured && (
              <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-sm font-semibold text-white bg-category-${ad.category.nameEn}`}>
                مميز
              </div>
            )}
            
            {ad.images && ad.images.length > 0 && (
              <div className="absolute top-3 left-3 bg-white/90 text-slate-900 px-2 py-1 rounded-lg text-sm flex items-center">
                <Camera className="h-3 w-3 ml-1" />
                <span data-testid={`text-image-count-${ad.id}`}>{ad.images.length}</span>
              </div>
            )}
          </div>
        </Link>
        
        <CardContent className="p-4">
          <Link href={`/ad/${ad.id}`}>
            <h3 className="font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary transition-colors" data-testid={`text-title-${ad.id}`}>
              {ad.title}
            </h3>
          </Link>
          
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2" data-testid={`text-description-${ad.id}`}>
            {ad.description}
          </p>
          
          <div className="flex items-center justify-between mb-3">
            <span className={`text-2xl font-bold category-${ad.category.nameEn}`} data-testid={`text-price-${ad.id}`}>
              {formatPrice(ad.price, ad.currency)}
            </span>
            <span className="text-sm text-muted-foreground" data-testid={`text-location-${ad.id}`}>
              {ad.location}
            </span>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground" data-testid={`text-date-${ad.id}`}>
              {timeAgo}
            </span>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-destructive p-1"
                data-testid={`button-favorite-${ad.id}`}
              >
                <Heart className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-primary p-1"
                data-testid={`button-share-${ad.id}`}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Regular variant (compact horizontal layout)
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow group" data-testid={`card-ad-${ad.id}`}>
      <div className="flex">
        <Link href={`/ad/${ad.id}`} className="flex-shrink-0">
          <div className="w-32 h-24">
            {ad.images && ad.images.length > 0 ? (
              <img
                src={ad.images[0]}
                alt={ad.title}
                className="w-full h-full object-cover"
                data-testid={`img-ad-${ad.id}`}
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Camera className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
        </Link>
        
        <CardContent className="flex-1 p-4">
          <div className="flex items-start justify-between h-full">
            <div className="flex-1 space-y-1">
              <Link href={`/ad/${ad.id}`}>
                <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors" data-testid={`text-title-${ad.id}`}>
                  {ad.title}
                </h3>
              </Link>
              
              <p className="text-muted-foreground text-sm line-clamp-1" data-testid={`text-description-${ad.id}`}>
                {ad.description}
              </p>
              
              <div className="flex items-center justify-between pt-2">
                <span className={`text-lg font-bold category-${ad.category.nameEn}`} data-testid={`text-price-${ad.id}`}>
                  {formatPrice(ad.price, ad.currency)}
                </span>
                <span className="text-xs text-muted-foreground" data-testid={`text-date-${ad.id}`}>
                  {timeAgo}
                </span>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0 mr-2"
              data-testid={`button-favorite-${ad.id}`}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
