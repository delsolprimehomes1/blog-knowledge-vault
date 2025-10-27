import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { CookieConsent } from "@/components/CookieConsent";
import Dashboard from "./pages/admin/Dashboard";
import Articles from "./pages/admin/Articles";
import Authors from "./pages/admin/Authors";
import Settings from "./pages/admin/Settings";
import ArticleEditor from "./pages/admin/ArticleEditor";
import Export from "./pages/admin/Export";
import AITools from "./pages/admin/AITools";
import SystemCheck from "./pages/admin/SystemCheck";
import ClusterGenerator from "./pages/admin/ClusterGenerator";
import AEOGuide from "./pages/admin/AEOGuide";
import BatchImageGeneration from "./pages/admin/BatchImageGeneration";
import CitationHealth from "./pages/admin/CitationHealth";
import Auth from "./pages/Auth";
import BlogArticle from "./pages/BlogArticle";
import BlogIndex from "./pages/BlogIndex";
import Sitemap from "./pages/Sitemap";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Analytics tracking - MUST be inside BrowserRouter */}
        <AnalyticsProvider />
        <CookieConsent />
        
        <Routes>
          <Route path="/" element={<Navigate to="/blog" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/blog" element={<BlogIndex />} />
          <Route path="/blog/:slug" element={<BlogArticle />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/admin/articles" element={<ProtectedRoute><Articles /></ProtectedRoute>} />
          <Route path="/admin/articles/new" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
          <Route path="/admin/articles/:id/edit" element={<ProtectedRoute><ArticleEditor /></ProtectedRoute>} />
          <Route path="/admin/authors" element={<ProtectedRoute><Authors /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
          <Route path="/admin/ai-tools" element={<ProtectedRoute><AITools /></ProtectedRoute>} />
          <Route path="/admin/cluster-generator" element={<ProtectedRoute><ClusterGenerator /></ProtectedRoute>} />
          <Route path="/admin/system-check" element={<ProtectedRoute><SystemCheck /></ProtectedRoute>} />
          <Route path="/admin/tools/batch-image-generation" element={<ProtectedRoute><BatchImageGeneration /></ProtectedRoute>} />
          <Route path="/admin/citation-health" element={<ProtectedRoute><CitationHealth /></ProtectedRoute>} />
          <Route path="/admin/docs/aeo-sge-guide" element={<ProtectedRoute><AEOGuide /></ProtectedRoute>} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
