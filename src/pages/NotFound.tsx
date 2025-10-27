import React from "react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Home, Search } from "lucide-react";

const NotFound = () => {
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | DelSol Prime Homes</title>
        <meta name="robots" content="noindex, follow" />
        <meta name="description" content="The page you're looking for doesn't exist. Return to our homepage to find Costa del Sol properties." />
      </Helmet>
      
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-6 px-4">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <a href="/">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/blog">
                <Search className="w-4 h-4 mr-2" />
                Browse Blog
              </a>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
