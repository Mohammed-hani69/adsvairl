import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, User, Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary font-cairo">سوق الإعلانات</h1>
            </Link>
          </div>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="relative">
              <Input
                type="text"
                placeholder="ابحث في جميع الإعلانات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 text-right"
                data-testid="input-search"
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                data-testid="button-search"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </Button>
            </form>
          </div>

          {/* User Actions - Desktop */}
          <div className="hidden md:flex items-center space-x-4 space-x-reverse">
            <Button 
              asChild
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold"
              data-testid="button-add-ad"
            >
              <Link href="/add-ad">
                <Plus className="h-4 w-4 ml-2" />
                أضف إعلان
              </Link>
            </Button>
            
            <Button variant="ghost" size="icon" data-testid="button-user-menu">
              <User className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col space-y-4 mt-8">
                  {/* Mobile Search */}
                  <form onSubmit={handleSearch} className="relative">
                    <Input
                      type="text"
                      placeholder="ابحث في جميع الإعلانات..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-10 text-right"
                      data-testid="input-search-mobile"
                    />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"
                    >
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </form>

                  {/* Mobile Navigation */}
                  <div className="flex flex-col space-y-2">
                    <Button 
                      asChild
                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold w-full justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="button-add-ad-mobile"
                    >
                      <Link href="/add-ad">
                        <Plus className="h-4 w-4 ml-2" />
                        أضف إعلان
                      </Link>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      data-testid="button-profile-mobile"
                    >
                      <User className="h-4 w-4 ml-2" />
                      الملف الشخصي
                    </Button>

                    <Button 
                      asChild
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid="button-admin-mobile"
                    >
                      <Link href="/admin">لوحة الإدارة</Link>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
