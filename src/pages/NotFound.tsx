import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-secondary">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <AlertTriangle className="h-16 w-16 text-accent" />
              <div className="absolute inset-0 bg-gradient-accent rounded-lg opacity-20 blur-sm"></div>
            </div>
          </div>
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">Página não encontrada</h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Oops! A página que você está procurando não existe ou foi movida.
          </p>
        </div>
        
        <Button asChild variant="gradient" size="lg">
          <a href="/" className="inline-flex items-center space-x-2">
            <Home className="h-4 w-4" />
            <span>Voltar ao Dashboard</span>
          </a>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
