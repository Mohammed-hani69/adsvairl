import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AddAd from "@/pages/add-ad";
import AdDetails from "@/pages/ad-details";
import Category from "@/pages/category";
import Admin from "@/pages/admin";
import BecomeVip from "@/pages/become-vip";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/add-ad" component={AddAd} />
      <Route path="/ad/:id" component={AdDetails} />
      <Route path="/category/:categoryId" component={Category} />
      <Route path="/admin" component={Admin} />
      <Route path="/become-vip" component={BecomeVip} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
