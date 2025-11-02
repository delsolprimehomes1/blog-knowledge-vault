import { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackSearch } from "@/utils/analytics";
import { BlogHeader } from "@/components/blog-index/BlogHeader";
import { FilterBar } from "@/components/blog-index/FilterBar";
import { SearchBar } from "@/components/blog-index/SearchBar";
import { ArticleCard } from "@/components/blog-index/ArticleCard";
import { BlogPagination } from "@/components/blog-index/BlogPagination";
import { BlogFooter } from "@/components/blog-article/BlogFooter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { SchemaMeta } from "@/components/SchemaMeta";
import { generateAllBlogIndexSchemas } from "@/lib/blogIndexSchemaGenerator";
import { ORGANIZATION_SCHEMA } from "@/lib/schemaGenerator";

const ARTICLES_PER_PAGE = 9;

// Stagger animation delays for cards (reduced for faster perceived loading)
const getCardDelay = (index: number) => {
  return `${(index % 9) * 50}ms`;
};

const BlogIndex = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();
  const { category: categoryParam } = useParams<{ category?: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Use category from URL param if available, otherwise from search params
  const selectedCategory = categoryParam || searchParams.get("category") || "all";
  const selectedLanguage = searchParams.get("lang") || "all";

  // Sync URL param to search params
  useEffect(() => {
    if (categoryParam && selectedCategory !== categoryParam) {
      const params = new URLSearchParams(searchParams);
      params.set("category", categoryParam);
      setSearchParams(params, { replace: true });
    }
  }, [categoryParam]);
  
  const baseUrl = 'https://delsolprimehomes.com';

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      console.log('Fetching categories...');
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");
      if (error) {
        console.error('Categories error:', error);
        throw error;
      }
      console.log('Categories loaded:', data);
      return data;
    },
  });

  // Fetch articles with filters - optimized with pagination
  const { data: articlesData, isLoading: articlesLoading, error: articlesError } = useQuery({
    queryKey: ["blog-articles", selectedCategory, selectedLanguage, searchQuery, currentPage],
    queryFn: async () => {
      console.log('Fetching articles with filters:', { selectedCategory, selectedLanguage, searchQuery, currentPage });
      
      // Resolve category name on-the-fly if needed (eliminates sequential dependency)
      let categoryName = null;
      if (selectedCategory !== "all") {
        const { data: categoryData } = await supabase
          .from("categories")
          .select("name")
          .eq("id", selectedCategory)
          .single();
        categoryName = categoryData?.name;
        console.log('Resolved category name:', categoryName);
      }
      
      // Only fetch fields needed for article cards (90% size reduction)
      let query = supabase
        .from("blog_articles")
        .select(`
          id, 
          slug, 
          headline, 
          category, 
          featured_image_url, 
          featured_image_alt,
          date_published, 
          meta_description,
          language,
          funnel_stage,
          read_time,
          authors!blog_articles_author_id_fkey(name, photo_url)
        `, { count: 'exact' })
        .eq("status", "published")
        .order("date_published", { ascending: false });

      if (categoryName) {
        query = query.eq("category", categoryName);
      }

      if (selectedLanguage !== "all") {
        query = query.eq("language", selectedLanguage);
      }

      if (searchQuery) {
        query = query.or(`headline.ilike.%${searchQuery}%,meta_description.ilike.%${searchQuery}%`);
      }

      // Server-side pagination (98% reduction in data transfer)
      const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
      query = query.range(startIndex, startIndex + ARTICLES_PER_PAGE - 1);

      const { data, error, count } = await query;
      if (error) {
        console.error('Articles error:', error);
        throw error;
      }
      console.log('Articles loaded:', data?.length, 'articles');
      return { articles: data, total: count || data?.length || 0 };
    },
    // No dependency on categories - loads immediately, resolves category inline
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedLanguage, searchQuery]);

  // Track search queries with GA4
  useEffect(() => {
    if (searchQuery && articlesData?.articles) {
      trackSearch(searchQuery, articlesData.articles.length);
    }
  }, [searchQuery, articlesData]);

  const handleCategoryChange = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category === "all") {
      params.delete("category");
    } else {
      params.set("category", category);
    }
    setSearchParams(params);
  };

  const handleLanguageChange = (language: string) => {
    const params = new URLSearchParams(searchParams);
    if (language === "all") {
      params.delete("lang");
    } else {
      params.set("lang", language);
    }
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setSearchParams({});
    setSearchQuery("");
  };

  // Only show loading state for articles (categories load in background)
  const isLoading = articlesLoading;
  const hasError = categoriesError || articlesError;
  
  const totalArticles = articlesData?.total || 0;
  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE);
  const currentArticles = articlesData?.articles || [];

  // Generate schemas with article data
  const schemas = generateAllBlogIndexSchemas(currentArticles as any || [], baseUrl);

  if (hasError) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Unable to load articles</h2>
          <p className="text-muted-foreground">
            {categoriesError ? 'Failed to load categories' : 'Failed to load articles'}
          </p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SchemaMeta
        title="Costa del Sol Property Blog - Expert Real Estate Insights & Guides"
        description="Comprehensive guides on buying property in Costa del Sol, Spain. Expert insights on real estate market trends, legal procedures, investment opportunities, and lifestyle tips for international buyers."
        canonical={`${baseUrl}/blog`}
        ogTitle="Costa del Sol Property Blog - DelSol Prime Homes"
        ogDescription="Expert guides on buying property in Costa del Sol. Real estate market trends, legal advice, and lifestyle insights for UK and Irish buyers."
        ogImage={`${baseUrl}/costa-del-sol-bg.jpg`}
        robots="index, follow"
        schemas={[
          schemas.collection,
          schemas.breadcrumb,
          schemas.itemList,
          schemas.speakable,
          ORGANIZATION_SCHEMA,
        ].filter(Boolean)}
      />
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <BlogHeader totalCount={totalArticles} />

        <div className="container mx-auto px-4 sm:px-6 md:px-8 py-12">
          <div className="text-center mb-4 md:mb-8">
            <p className="text-sm md:text-base text-muted-foreground">
              {totalArticles} {totalArticles === 1 ? 'article' : 'articles'} available
            </p>
          </div>

      <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <FilterBar
        selectedCategory={selectedCategory}
        selectedLanguage={selectedLanguage}
        categories={categories || []}
        onCategoryChange={handleCategoryChange}
        onLanguageChange={handleLanguageChange}
        onClearFilters={handleClearFilters}
        resultCount={totalArticles}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="animate-pulse bg-muted h-48 w-full rounded-lg" />
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : currentArticles.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold">No articles found</h2>
          <p className="text-muted-foreground">
            Try adjusting your filters or search query
          </p>
          <Button onClick={handleClearFilters} variant="outline">
            Clear All Filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {currentArticles.map((article, index) => {
              const authorInfo = article.authors as any;
              return (
                <div 
                  key={article.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: getCardDelay(index) }}
                >
                  <ArticleCard
                    article={article}
                    author={authorInfo}
                    priority={index < 3}
                  />
                </div>
              );
            })}
          </div>

          <BlogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

          {/* Company Footer */}
          <BlogFooter />
        </div>
      </div>
    </>
  );
};

export default BlogIndex;
