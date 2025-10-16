# Complete Testing Checklist - Phase 13

## Pre-Deployment Testing

### 🔐 Authentication & Access Control

#### Sign Up Flow
- [ ] Navigate to `/auth`
- [ ] Click "Sign Up" tab
- [ ] Try weak password (< 8 chars) - should show error
- [ ] Try invalid email - should show error
- [ ] Sign up with valid credentials
- [ ] Verify success message appears
- [ ] Check email for verification link (if email confirmation enabled)

#### Sign In Flow
- [ ] Navigate to `/auth` in new incognito window
- [ ] Try wrong password - should show error
- [ ] Try non-existent email - should show error
- [ ] Sign in with correct credentials
- [ ] Verify redirect to `/admin`

#### Protected Routes
- [ ] Try accessing `/admin` while logged out - should redirect to `/auth`
- [ ] Try accessing `/admin/articles` while logged out - should redirect
- [ ] Log in and verify access granted
- [ ] Test "back" button doesn't return to auth page when logged in

#### Logout
- [ ] Find logout button in admin panel
- [ ] Click logout
- [ ] Verify redirect to auth page
- [ ] Try accessing admin - should redirect to auth

---

### 📝 Content Creation

#### Create Article (All Languages)

For each language (EN, ES, DE, NL, FR, PL, SV, DA, HU):

##### Basic Info
- [ ] Fill headline with language-specific text
- [ ] Verify slug auto-generates correctly
- [ ] Select language
- [ ] Select category
- [ ] Select funnel stage (test all: TOFU, MOFU, BOFU)

##### SEO Meta
- [ ] Enter meta title (50-60 chars)
- [ ] Verify character counter works
- [ ] Enter meta description (150-160 chars)
- [ ] Verify character counter works
- [ ] Check SEO Preview section appears
- [ ] Verify Google search preview looks correct

##### Content
- [ ] Enter speakable answer (40-60 words)
- [ ] Verify word counter works
- [ ] Enter detailed content (1500+ words)
- [ ] Verify word counter works
- [ ] Add H2 headings
- [ ] Add H3 headings
- [ ] Add bullet list
- [ ] Add numbered list
- [ ] Add bold text
- [ ] Add italic text
- [ ] Add a table

##### Media
- [ ] Upload featured image (< 5MB)
- [ ] Verify preview appears
- [ ] Enter alt text
- [ ] Enter caption (optional)
- [ ] Upload diagram (optional)
- [ ] Enter diagram description

##### E-E-A-T
- [ ] Select author
- [ ] Select reviewer (optional)
- [ ] Verify both display in preview

##### External Citations
- [ ] Add citation 1 (non-gov)
- [ ] Add citation 2 (.gov or .gob.es)
- [ ] Try adding 6th citation - should prevent/warn
- [ ] Try saving without gov domain - should show error
- [ ] Remove one citation, save - should show error (min 2)

##### Internal Links
- [ ] Add 3 internal links
- [ ] Verify link titles
- [ ] Test URLs are correct format

##### Related Articles
- [ ] Select 3-4 related articles
- [ ] Verify they display in preview

##### Funnel CTA (BOFU only)
- [ ] Select 2-3 CTA articles
- [ ] Verify they're conversion-focused

##### FAQ
- [ ] Add FAQ question 1
- [ ] Add FAQ answer 1
- [ ] Add FAQ question 2
- [ ] Add FAQ answer 2
- [ ] Add FAQ question 3
- [ ] Add FAQ answer 3
- [ ] Verify FAQ schema appears in Schema Preview

##### Translations
- [ ] Create article in EN (publish first)
- [ ] Create same article in ES
- [ ] Link EN ↔ ES in translations section
- [ ] Verify bidirectional linking
- [ ] Repeat for DE, NL, FR, PL, SV, DA, HU

##### Save & Publish
- [ ] Save as draft first
- [ ] Verify success message
- [ ] Verify article appears in articles list as "draft"
- [ ] Edit article
- [ ] Click "Publish"
- [ ] Verify success message
- [ ] Verify status changes to "published"
- [ ] Check who published (published_by field)
- [ ] Edit again
- [ ] Check who last edited (last_edited_by field)

---

### 📰 Blog Index Page

#### Filters
- [ ] Load `/blog`
- [ ] Verify initial article count shows all published
- [ ] Filter by category: Buying Guides
- [ ] Verify count updates
- [ ] Filter by category: Investment Advice
- [ ] Filter by category: Area Guides
- [ ] Filter by category: Legal & Finance
- [ ] Filter by category: Market Updates
- [ ] Filter by category: Lifestyle
- [ ] Clear category filter
- [ ] Filter by language: EN
- [ ] Filter by language: ES
- [ ] Filter by language: DE
- [ ] Filter by language: NL
- [ ] Filter by language: FR
- [ ] Filter by language: PL
- [ ] Filter by language: SV
- [ ] Filter by language: DA
- [ ] Filter by language: HU
- [ ] Clear language filter
- [ ] Combine: Category=Buying Guides + Language=ES
- [ ] Verify both filters active
- [ ] Clear all filters

#### Search
- [ ] Type in search box
- [ ] Verify live filtering works
- [ ] Try search with no results
- [ ] Verify "No articles found" message
- [ ] Clear search

#### Article Cards
- [ ] Hover over article card
- [ ] Verify lift/shadow effect
- [ ] Verify image zooms slightly
- [ ] Check category badge displays
- [ ] Check language flag displays
- [ ] Check headline truncates at 2 lines
- [ ] Check author photo displays
- [ ] Check date displays correctly
- [ ] Check read time displays
- [ ] Check excerpt truncates at 100 chars
- [ ] Click "Read Article" button
- [ ] Verify navigates to article

#### Pagination
- [ ] If >20 articles: verify pagination appears
- [ ] Click page 2
- [ ] Verify URL updates with ?page=2
- [ ] Verify different articles show
- [ ] Click "Previous"
- [ ] Click "Next"
- [ ] Click last page number
- [ ] Verify current page highlighted

#### Responsive Design
- [ ] View on mobile (< 640px)
- [ ] Verify 1 column layout
- [ ] View on tablet (768px)
- [ ] Verify 2 column layout
- [ ] View on desktop (1024px+)
- [ ] Verify 3 column layout

---

### 📄 Article Page

#### Content Display
- [ ] Navigate to published article
- [ ] Verify headline (H1) displays
- [ ] Verify breadcrumbs show
- [ ] Check language selector (if translations exist)
- [ ] Verify author bio card displays
- [ ] Check author photo loads
- [ ] Check author LinkedIn link works
- [ ] Verify reviewer badge (if present)
- [ ] Check publication date
- [ ] Check last modified date (if different)
- [ ] Check read time

#### Featured Image
- [ ] Verify featured image loads
- [ ] Check image has proper dimensions
- [ ] Verify alt text (inspect element)
- [ ] Check caption displays (if present)
- [ ] Verify image is lazy-loaded (below fold)

#### Table of Contents
- [ ] Verify TOC shows all H2 headings
- [ ] Click TOC link
- [ ] Verify smooth scroll to section
- [ ] Verify correct heading highlighted
- [ ] Check sticky TOC on desktop

#### Article Content
- [ ] Verify speakable box displays
- [ ] Check content renders correctly
- [ ] Verify H2 headings styled properly
- [ ] Verify H3 headings styled properly
- [ ] Check bullet lists formatted
- [ ] Check numbered lists formatted
- [ ] Verify internal links have correct styling
- [ ] Click internal link
- [ ] Verify navigates correctly
- [ ] Go back
- [ ] Verify external links have icon
- [ ] Click external link
- [ ] Verify opens in new tab
- [ ] Verify has rel="noopener noreferrer"
- [ ] Check diagram displays (if present)

#### Trust Signals
- [ ] Verify reviewer badge shows (if present)
- [ ] Check last modified date
- [ ] Verify external citations display
- [ ] Click citation link
- [ ] Verify opens in new tab

#### Related Articles
- [ ] Scroll to "People Also Read"
- [ ] Verify 2-4 articles show
- [ ] Hover over article card
- [ ] Verify prefetch occurs (check Network tab)
- [ ] Click related article
- [ ] Verify navigates correctly

#### Funnel CTA (BOFU only)
- [ ] On BOFU article, verify CTA section shows
- [ ] Check CTA articles display
- [ ] Click CTA article
- [ ] Verify navigates correctly

#### FAQ Section
- [ ] If article has FAQs, verify section displays
- [ ] Click FAQ accordion
- [ ] Verify expands/collapses
- [ ] Check all questions render

#### Responsive Design
- [ ] View on mobile
- [ ] Verify single column layout
- [ ] Check TOC accessible via button
- [ ] Verify images scale properly
- [ ] View on tablet
- [ ] View on desktop
- [ ] Verify TOC sidebar shows

---

### 🤖 Chatbot (BOFU Articles Only)

#### Widget Display
- [ ] Navigate to BOFU article
- [ ] Verify chatbot button appears (bottom-right)
- [ ] Verify pulse animation
- [ ] On TOFU article: verify NO chatbot
- [ ] On MOFU article: verify NO chatbot

#### Opening Conversation
- [ ] Click chatbot button
- [ ] Verify chat window opens
- [ ] Check window size (400px desktop, full mobile)
- [ ] Verify header shows "Chat with Del Sol Homes Expert"
- [ ] Check close button (X) present
- [ ] Verify welcome message appears
- [ ] Check quick reply buttons show

#### Conversation Flow
- [ ] Click "📅 Schedule a viewing"
- [ ] Verify property type options show
- [ ] Click "🏡 Villa"
- [ ] Verify budget options show
- [ ] Click "€1M - €2M"
- [ ] Verify area options show
- [ ] Click "Marbella"
- [ ] Verify contact form shows
- [ ] Enter name
- [ ] Enter email
- [ ] Enter phone
- [ ] Select preferred language
- [ ] Click submit
- [ ] Verify success message
- [ ] Check data in Supabase `chatbot_conversations` table

#### Alternative Flows
- [ ] Click "💰 Discuss financing"
- [ ] Verify appropriate response
- [ ] Click "📍 Learn about areas"
- [ ] Verify appropriate response
- [ ] Click "❓ Ask a question"
- [ ] Type custom question
- [ ] Verify bot responds

#### Chat Functionality
- [ ] Type message in text input
- [ ] Click send button
- [ ] Verify message appears right-aligned
- [ ] Verify bot response appears left-aligned
- [ ] Check timestamps display
- [ ] Verify chat scrolls automatically
- [ ] Test close button
- [ ] Reopen chat
- [ ] Verify conversation persists

#### Multilingual
- [ ] On ES article, verify chatbot in Spanish
- [ ] On DE article, verify chatbot in German
- [ ] On FR article, verify chatbot in French

---

### 🔍 SEO & Schema Validation

#### Meta Tags
- [ ] View page source of article
- [ ] Verify `<title>` includes meta_title + " | Del Sol Prime Homes"
- [ ] Verify meta description present
- [ ] Verify canonical URL present
- [ ] Check Open Graph tags:
  - [ ] og:title
  - [ ] og:description
  - [ ] og:image
  - [ ] og:url
  - [ ] og:type = "article"
  - [ ] og:site_name
  - [ ] article:published_time
  - [ ] article:modified_time
  - [ ] article:author
- [ ] Check Twitter Card tags:
  - [ ] twitter:card = "summary_large_image"
  - [ ] twitter:title
  - [ ] twitter:description
  - [ ] twitter:image

#### Hreflang Tags
- [ ] On article with translations
- [ ] View page source
- [ ] Verify hreflang tags present for each language:
  - [ ] en-GB
  - [ ] es-ES
  - [ ] de-DE
  - [ ] nl-NL
  - [ ] fr-FR
  - [ ] pl-PL
  - [ ] sv-SE
  - [ ] da-DK
  - [ ] hu-HU
  - [ ] x-default (pointing to EN)

#### Schema Validation

For 3 different articles:

- [ ] Article 1: Copy page URL
- [ ] Go to https://search.google.com/test/rich-results
- [ ] Paste URL
- [ ] Click "Test URL"
- [ ] Verify "Rich results can be displayed"
- [ ] Verify ArticleSchema valid
- [ ] Verify SpeakableSchema valid
- [ ] Verify BreadcrumbSchema valid
- [ ] If FAQ present: Verify FAQSchema valid
- [ ] Verify OrganizationSchema valid
- [ ] Check no errors
- [ ] Repeat for Article 2
- [ ] Repeat for Article 3

#### robots.txt
- [ ] Navigate to /robots.txt
- [ ] Verify file loads
- [ ] Check allows /blog/
- [ ] Check disallows /admin/
- [ ] Check AI crawlers listed (GPTBot, Claude-Web, etc.)
- [ ] Verify sitemap URL listed

#### Sitemap
- [ ] Navigate to `/sitemap`
- [ ] Verify sitemap generates
- [ ] Check downloads as sitemap.xml
- [ ] Open sitemap.xml
- [ ] Verify includes homepage
- [ ] Verify includes /blog
- [ ] Verify includes all published articles
- [ ] Check lastmod dates present
- [ ] Verify changefreq present
- [ ] Verify priority values correct

---

### ⚡ Performance Testing

Run on 10 sample articles:

For each article:

#### Lighthouse Audit
- [ ] Open Chrome DevTools
- [ ] Go to Lighthouse tab
- [ ] Select "Desktop"
- [ ] Check all categories
- [ ] Click "Analyze page load"
- [ ] Record Performance score (target: 95+)
- [ ] Record Accessibility score (target: 95+)
- [ ] Record Best Practices score (target: 95+)
- [ ] Record SEO score (target: 100)

#### Core Web Vitals
- [ ] Check LCP (target: < 2.5s)
- [ ] Check FID (target: < 100ms)
- [ ] Check CLS (target: < 0.1)
- [ ] Verify all metrics "Good" (green)

#### Image Loading
- [ ] Check Network tab
- [ ] Verify featured image loads
- [ ] Check lazy loading works for below-fold images
- [ ] Verify images have width/height attributes
- [ ] Check no CLS from image loading

#### Code Splitting
- [ ] Check Network tab
- [ ] Verify RichTextEditor only loads on /admin/articles
- [ ] Verify Chatbot only loads on BOFU articles
- [ ] Check bundle size reasonable

#### Mobile Performance
- [ ] Switch to mobile in Lighthouse
- [ ] Run audit again
- [ ] Verify Performance 90+ on mobile
- [ ] Check all Core Web Vitals pass

---

### 📱 Responsive Testing

Test on real devices (not just Chrome DevTools):

#### iPhone (iOS)
- [ ] Safari browser
- [ ] Blog index loads
- [ ] Article loads
- [ ] Images display
- [ ] Chatbot works (BOFU)
- [ ] Admin login works
- [ ] No horizontal scroll
- [ ] Touch targets large enough

#### Android Phone
- [ ] Chrome browser
- [ ] Repeat iPhone tests

#### iPad (Tablet)
- [ ] Safari browser
- [ ] 2-column layout on blog index
- [ ] Article displays properly
- [ ] TOC accessible

#### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

---

### 👥 Admin Panel Testing

#### Dashboard
- [ ] Log in to /admin
- [ ] Verify dashboard loads
- [ ] Check total articles count
- [ ] Verify recent articles list
- [ ] Check all navigation links work

#### Articles List
- [ ] Navigate to /admin/articles
- [ ] Verify all articles show
- [ ] Check status badges (draft/published)
- [ ] Check language flags
- [ ] Check category badges
- [ ] Sort by date
- [ ] Search for article
- [ ] Click "Edit" button
- [ ] Verify editor opens

#### Create Article
- [ ] Click "Create New Article"
- [ ] Fill all required fields
- [ ] Upload image (test file size limits)
- [ ] Save as draft
- [ ] Verify appears in list
- [ ] Edit and publish
- [ ] Verify status changes
- [ ] Check published_by field in database

#### Authors Management
- [ ] Navigate to /admin/authors
- [ ] Click "Add New Author"
- [ ] Fill all fields
- [ ] Upload photo
- [ ] Add credentials
- [ ] Save author
- [ ] Verify appears in list
- [ ] Edit author
- [ ] Delete author
- [ ] Verify removed from list

#### Settings
- [ ] Navigate to /admin/settings
- [ ] Check current configuration
- [ ] Make a setting change
- [ ] Save
- [ ] Verify persists after refresh

#### Export/Backup
- [ ] Navigate to /admin/export
- [ ] Click "Export Complete Backup"
- [ ] Verify JSON downloads
- [ ] Check filename has date
- [ ] Open JSON file
- [ ] Verify contains articles, authors, categories
- [ ] Export articles only
- [ ] Export authors only
- [ ] Export categories only
- [ ] Verify all exports work

---

### 🔗 Link Testing

#### Internal Links
Test 5 random articles:

- [ ] Article 1: Click internal link
- [ ] Verify navigates to correct article
- [ ] Use browser back button
- [ ] Verify returns correctly
- [ ] Repeat for Articles 2-5

#### External Links
- [ ] Click external citation link
- [ ] Verify opens in new tab
- [ ] Check has rel="noopener noreferrer" (inspect element)
- [ ] Verify link works
- [ ] Test 5 different external links

#### Navigation Links
- [ ] Blog index → Article
- [ ] Article → Related Article
- [ ] Article → Home (breadcrumb)
- [ ] Article → Blog index (breadcrumb)
- [ ] Admin nav links all work

---

### 🔒 Security Testing

#### Authentication
- [ ] Try SQL injection in email field
- [ ] Try XSS in password field
- [ ] Verify both sanitized/rejected
- [ ] Test password reset (if implemented)

#### RLS Policies
- [ ] Log out
- [ ] Try accessing draft article URL directly
- [ ] Verify not accessible
- [ ] Log in
- [ ] Verify accessible

#### Role-Based Access
- [ ] Create viewer role user
- [ ] Log in as viewer
- [ ] Verify can't create articles
- [ ] Create editor role user
- [ ] Log in as editor
- [ ] Verify can create but not delete
- [ ] Log in as admin
- [ ] Verify full access

---

### 💾 Data Validation

#### Required Fields
- [ ] Try publishing without headline - should fail
- [ ] Try publishing without meta title - should fail
- [ ] Try publishing without featured image - should fail
- [ ] Try publishing without author - should fail
- [ ] Verify validation messages clear

#### Character Limits
- [ ] Enter 70-char meta title
- [ ] Verify warning shows
- [ ] Enter 180-char meta description
- [ ] Verify warning shows

#### Citation Validation
- [ ] Try 1 citation - should fail
- [ ] Try 6 citations - should fail
- [ ] Try 2 non-gov citations - should fail
- [ ] Try 2 citations (1 .gov) - should pass

---

## Post-Deployment Testing

### 🌐 Production Environment

#### DNS & Routing
- [ ] Navigate to delsolprimehomes.com
- [ ] Verify Webflow site loads
- [ ] Navigate to delsolprimehomes.com/blog
- [ ] Verify React app loads
- [ ] Navigate to delsolprimehomes.com/admin
- [ ] Verify requires auth
- [ ] Check SSL certificate valid
- [ ] Test www redirect works

#### Cloudflare Worker
- [ ] Check /blog routes to React app
- [ ] Check / routes to Webflow
- [ ] Verify no CORS errors in console
- [ ] Test caching works

#### Search Console
- [ ] Submit sitemap to Google Search Console
- [ ] Check for crawl errors
- [ ] Request indexing for 10 key articles
- [ ] Monitor coverage report

---

## Monitoring Checklist

### First 24 Hours
- [ ] Check error logs every 2 hours
- [ ] Monitor Supabase database activity
- [ ] Review chatbot conversations
- [ ] Check page load times
- [ ] Verify no 404 errors

### First Week
- [ ] Daily Lighthouse audits
- [ ] Search Console error check
- [ ] Monitor sitemap indexing
- [ ] Review user feedback
- [ ] Check backup ran successfully

---

## Success Criteria

✅ All tests must pass before production launch:

- [ ] All authentication flows work
- [ ] Articles in all 9 languages created
- [ ] All filters on blog index work
- [ ] Funnel progression tested (TOFU→MOFU→BOFU)
- [ ] Chatbot works on BOFU articles
- [ ] All JSON-LD schemas valid (Google Rich Results Test)
- [ ] Hreflang switching works
- [ ] Mobile responsive on real devices
- [ ] Lighthouse 95+ on 10 articles
- [ ] All internal links work
- [ ] All external links work
- [ ] Speakable answer displays
- [ ] Author bio cards work
- [ ] SEO Preview shows correctly
- [ ] Admin authentication works
- [ ] Export functionality works
- [ ] No security vulnerabilities
- [ ] No console errors
- [ ] Backup configured

---

**Test Status: READY FOR TESTING** ✅

Document any failures and retest after fixes.
