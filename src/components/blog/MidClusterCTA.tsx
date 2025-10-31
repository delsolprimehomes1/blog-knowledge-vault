import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";

interface RelatedArticle {
  id: string;
  slug: string;
  headline: string;
  stage: "TOFU" | "MOFU" | "BOFU";
}

interface MidClusterCTAProps {
  relatedArticles: RelatedArticle[];
  stage: "TOFU" | "MOFU" | "BOFU";
  currentArticleId: string;
}

export const MidClusterCTA = ({ relatedArticles, stage, currentArticleId }: MidClusterCTAProps) => {
  const [cta, setCta] = useState<RelatedArticle | null>(null);

  useEffect(() => {
    if (!relatedArticles?.length) return;

    // Funnel-stage-aware filtering
    let filtered: RelatedArticle[] = [];
    
    if (stage === "TOFU") {
      // TOFU → Show MOFU/BOFU articles (encourage deeper exploration)
      filtered = relatedArticles.filter(a => a.stage !== "TOFU");
    } else if (stage === "MOFU") {
      // MOFU → Show BOFU articles (guide toward conversion)
      filtered = relatedArticles.filter(a => a.stage === "BOFU");
    }
    // BOFU → Show nothing (already at conversion point)
    
    if (filtered.length === 0) {
      setCta(null);
      return;
    }

    // Randomly select 1 article from filtered list
    const randomIndex = Math.floor(Math.random() * filtered.length);
    setCta(filtered[randomIndex]);
  }, [relatedArticles, stage]);

  if (!cta) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="my-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <p className="text-sm uppercase text-primary font-semibold tracking-wide">
          Learn More Within This Guide
        </p>
      </div>
      
      <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-3 leading-tight">
        {cta.headline}
      </h3>
      
      <p className="text-muted-foreground mb-5">
        Explore this related article from the same expert cluster.
      </p>
      
      <a
        href={`/blog/${cta.slug}`}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-all font-medium shadow-md hover:shadow-lg"
        onClick={() => {
          // Track CTA click
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'mid_cluster_cta_click', {
              article_id: currentArticleId,
              target_slug: cta.slug,
              target_article_id: cta.id,
              funnel_stage: stage,
              target_stage: cta.stage
            });
          }
        }}
      >
        Learn More <ArrowRight className="w-4 h-4" />
      </a>
    </motion.div>
  );
};
