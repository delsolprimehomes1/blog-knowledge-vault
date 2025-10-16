# Schema Documentation - Blog CMS

## Overview

This document details the database schema structure for the Del Sol Prime Homes Blog CMS. All tables are in the `public` schema of the Supabase database.

## Tables

### 1. blog_articles

Main table containing all blog article content.

```sql
CREATE TABLE public.blog_articles (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  slug TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL,
  category TEXT NOT NULL,
  funnel_stage TEXT NOT NULL, -- 'TOFU', 'MOFU', 'BOFU'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
  
  -- SEO Fields
  headline TEXT NOT NULL,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  canonical_url TEXT,
  
  -- Content Fields
  speakable_answer TEXT NOT NULL,
  detailed_content TEXT NOT NULL,
  
  -- Media Fields
  featured_image_url TEXT NOT NULL,
  featured_image_alt TEXT NOT NULL,
  featured_image_caption TEXT,
  diagram_url TEXT,
  diagram_description TEXT,
  
  -- E-E-A-T Fields
  author_id UUID REFERENCES authors(id),
  reviewer_id UUID REFERENCES authors(id),
  date_published TIMESTAMP WITH TIME ZONE,
  date_modified TIMESTAMP WITH TIME ZONE,
  read_time INTEGER,
  
  -- Audit Fields (Phase 13)
  published_by UUID REFERENCES auth.users(id),
  last_edited_by UUID REFERENCES auth.users(id),
  
  -- JSON Fields
  internal_links JSONB DEFAULT '[]'::jsonb,
  external_citations JSONB DEFAULT '[]'::jsonb,
  faq_entities JSONB,
  translations JSONB DEFAULT '{}'::jsonb,
  
  -- Relations
  related_article_ids UUID[],
  cta_article_ids UUID[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### Field Descriptions

**id** - Unique identifier (UUID v4)

**slug** - URL-friendly unique identifier
- Format: lowercase-with-hyphens
- Example: `how-to-buy-property-costa-del-sol`
- Must be unique across all languages

**language** - ISO 639-1 language code
- Allowed: 'en', 'es', 'de', 'nl', 'fr', 'pl', 'sv', 'da', 'hu'

**category** - Article category
- Categories defined in `categories` table

**funnel_stage** - Marketing funnel position
- TOFU: Top of Funnel (Awareness)
- MOFU: Middle of Funnel (Consideration)
- BOFU: Bottom of Funnel (Decision)

**status** - Publication status
- draft: Not visible to public
- published: Live on website
- archived: Hidden but preserved

**headline** - Main article title (H1)
- SEO best practice: 50-70 characters
- Include main keyword

**meta_title** - SEO title tag
- Hard limit: 60 characters
- Displayed in search results

**meta_description** - SEO description tag
- Hard limit: 160 characters
- Displayed under title in search results

**canonical_url** - Canonical URL (optional)
- Auto-generated if blank
- Use for duplicate content

**speakable_answer** - Voice assistant answer
- Target: 40-60 words
- Conversational tone
- Action-oriented

**detailed_content** - Main article HTML content
- Target: 1500-2500 words
- Rich text with headings, lists, links

**featured_image_url** - Main article image
- Required field
- Recommended: 1200x675px (16:9)

**featured_image_alt** - Image alt text
- Required for accessibility
- Include relevant keywords

**featured_image_caption** - Image caption (optional)
- Shows below image

**diagram_url** - Supporting diagram (optional)
- Additional visual aid

**diagram_description** - Diagram caption (optional)

**author_id** - Author reference
- Links to `authors` table
- Required for E-E-A-T

**reviewer_id** - Reviewer reference (optional)
- Links to `authors` table
- Enhances E-E-A-T

**date_published** - First publication date
- Auto-set on first publish
- Used in schemas

**date_modified** - Last modification date
- Updates on every edit
- Used in schemas

**read_time** - Estimated reading time (minutes)
- Auto-calculated: word count / 200

**published_by** - User who published
- UUID of admin user
- Set on first publish

**last_edited_by** - User who last edited
- UUID of admin user
- Updates on every save

**internal_links** - Internal link array
```json
[
  {
    "text": "Anchor text",
    "url": "/blog/article-slug",
    "title": "Link title attribute"
  }
]
```

**external_citations** - External citation array
```json
[
  {
    "text": "Citation text",
    "url": "https://source.com/article",
    "source": "Source name"
  }
]
```
- Minimum 2, maximum 5
- At least one from .gov/.gob.es domain

**faq_entities** - FAQ question/answer array
```json
[
  {
    "question": "What is...?",
    "answer": "Answer text..."
  }
]
```
- Generates FAQPage schema

**translations** - Language version mapping
```json
{
  "en": "slug-in-english",
  "es": "slug-en-espanol",
  "de": "slug-auf-deutsch"
}
```
- Generates hreflang tags

**related_article_ids** - Related article UUIDs
- Array of article IDs
- Shows "People Also Read" section

**cta_article_ids** - CTA article UUIDs
- Array of article IDs
- Used in BOFU funnel CTAs

---

### 2. authors

Author/Expert profiles for E-E-A-T.

```sql
CREATE TABLE public.authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  bio TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  linkedin_url TEXT NOT NULL,
  credentials TEXT[] DEFAULT '{}',
  years_experience INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### Field Descriptions

**name** - Full name
- Example: "Maria García Lopez"

**job_title** - Professional title
- Example: "Senior Real Estate Advisor"

**bio** - Professional biography
- 150-300 words
- Highlight expertise and experience

**photo_url** - Profile photo URL
- Professional headshot
- Square aspect ratio preferred

**linkedin_url** - LinkedIn profile
- Full URL
- Example: "https://linkedin.com/in/username"

**credentials** - Array of credentials
```sql
'{"Real Estate Expert", "Licensed Broker", "MBA Finance"}'
```

**years_experience** - Years in industry
- Integer value
- Example: 15

---

### 3. categories

Article categorization.

```sql
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### Default Categories

1. Buying Guides
2. Investment Advice
3. Area Guides
4. Legal & Finance
5. Market Updates
6. Lifestyle

---

### 4. chatbot_conversations

Chatbot interaction logs (BOFU articles).

```sql
CREATE TABLE public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_slug TEXT,
  user_name TEXT,
  user_email TEXT,
  user_phone TEXT,
  property_type TEXT,
  budget_range TEXT,
  area TEXT,
  preferred_language TEXT,
  conversation_transcript JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### Field Descriptions

**article_slug** - Origin article
- Which article chatbot was on

**user_name** - Lead name
- Collected in contact form

**user_email** - Lead email
- Required for follow-up

**user_phone** - Lead phone (optional)

**property_type** - Property preference
- villa, apartment, beachfront, golf

**budget_range** - Budget category
- €500K-€1M, €1M-€2M, €2M-€5M, €5M+

**area** - Preferred location
- Marbella, Estepona, Fuengirola, Other

**preferred_language** - Communication preference
- ISO 639-1 code

**conversation_transcript** - Full chat log
```json
[
  {
    "role": "bot",
    "message": "Hello! How can I help?",
    "timestamp": "2025-01-15T10:30:00Z"
  },
  {
    "role": "user",
    "message": "I want to buy a villa",
    "timestamp": "2025-01-15T10:30:15Z"
  }
]
```

---

### 5. user_roles (Phase 13)

Admin user role management.

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);
```

#### Roles

**admin** - Full access
- Create, edit, delete all content
- Manage users
- Export data
- View analytics

**editor** - Content management
- Create, edit articles
- Cannot delete
- Cannot manage users

**viewer** - Read-only access
- View dashboard
- Export own content

---

## Triggers

### 1. update_updated_at_column

Auto-updates `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_articles_updated_at
BEFORE UPDATE ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### 2. track_article_changes (Phase 13)

Tracks who published/edited articles.

```sql
CREATE OR REPLACE FUNCTION public.track_article_changes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_edited_by = auth.uid();
  
  IF NEW.status = 'published' AND OLD.status != 'published' THEN
    NEW.published_by = auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_blog_article_changes
BEFORE UPDATE ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.track_article_changes();
```

---

## Functions

### 1. has_role

Checks if user has specific role (security definer).

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
```

### 2. is_admin

Checks if user is admin.

```sql
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;
```

---

## Row Level Security (RLS)

### blog_articles

```sql
-- Public read for published articles
CREATE POLICY "Public can view published articles"
ON public.blog_articles
FOR SELECT
USING (status = 'published');

-- Authenticated users can view all
CREATE POLICY "Authenticated users can view all"
ON public.blog_articles
FOR SELECT
TO authenticated
USING (true);

-- Admin/Editor can insert
CREATE POLICY "Admin can insert articles"
ON public.blog_articles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Admin/Editor can update
CREATE POLICY "Admin can update articles"
ON public.blog_articles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Only admin can delete
CREATE POLICY "Admin can delete articles"
ON public.blog_articles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));
```

### authors

```sql
-- Public read
CREATE POLICY "Public can view authors"
ON public.authors
FOR SELECT
USING (true);

-- Admin can manage
CREATE POLICY "Admin can manage authors"
ON public.authors
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));
```

### categories

```sql
-- Public read
CREATE POLICY "Public can view categories"
ON public.categories
FOR SELECT
USING (true);

-- Admin can manage
CREATE POLICY "Admin can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));
```

### chatbot_conversations

```sql
-- Public can insert (lead capture)
CREATE POLICY "Public can submit conversations"
ON public.chatbot_conversations
FOR INSERT
WITH CHECK (true);

-- Admin can view all
CREATE POLICY "Admin can view conversations"
ON public.chatbot_conversations
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
```

---

## Storage Buckets

### article-images

Public bucket for article media.

**Settings:**
- Public: Yes
- File size limit: 5MB
- Allowed file types: image/jpeg, image/png, image/webp

**RLS Policies:**
```sql
-- Anyone can view
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'article-images');

-- Authenticated can upload
CREATE POLICY "Authenticated can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'article-images');
```

---

## Indexes

```sql
-- Performance indexes
CREATE INDEX idx_articles_status ON blog_articles(status);
CREATE INDEX idx_articles_language ON blog_articles(language);
CREATE INDEX idx_articles_category ON blog_articles(category);
CREATE INDEX idx_articles_funnel_stage ON blog_articles(funnel_stage);
CREATE INDEX idx_articles_slug ON blog_articles(slug);
CREATE INDEX idx_articles_date_published ON blog_articles(date_published DESC);
CREATE INDEX idx_chatbot_article ON chatbot_conversations(article_slug);
CREATE INDEX idx_chatbot_created ON chatbot_conversations(created_at DESC);
```

---

## Data Validation Rules

### At Application Level

1. **meta_title**: Max 60 characters
2. **meta_description**: Max 160 characters
3. **external_citations**: Min 2, Max 5 (at least one .gov/.gob.es)
4. **speakable_answer**: 40-60 words optimal
5. **detailed_content**: 1500-2500 words optimal
6. **featured_image_alt**: Required if featured_image_url present

---

## Migration History

Located in: `supabase/migrations/`

Each migration is timestamped and version controlled.
