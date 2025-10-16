import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/admin/Dashboard";
import Articles from "./pages/admin/Articles";
import Authors from "./pages/admin/Authors";
import Settings from "./pages/admin/Settings";
import ArticleEditor from "./pages/admin/ArticleEditor";
import BlogArticle from "./pages/BlogArticle";
import BlogIndex from "./pages/BlogIndex";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/articles" element={<Articles />} />
          <Route path="/admin/articles/new" element={<ArticleEditor />} />
          <Route path="/admin/articles/:id/edit" element={<ArticleEditor />} />
          <Route path="/admin/authors" element={<Authors />} />
          <Route path="/admin/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
