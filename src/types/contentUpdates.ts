export interface ContentUpdate {
  id: string;
  article_id: string;
  update_type: 'statistics' | 'citations' | 'faq' | 'content' | 'translations' | 'bulk_refresh';
  updated_fields: string[];
  previous_date_modified?: string;
  new_date_modified: string;
  updated_by?: string;
  update_notes?: string;
  created_at: string;
}

export interface ContentFreshnessReport {
  id: string;
  slug: string;
  headline: string;
  language: string;
  status: string;
  date_published?: string;
  date_modified?: string;
  freshness_status: 'never_updated' | 'stale' | 'needs_refresh' | 'fresh';
  days_since_update: number;
  update_count: number;
}
