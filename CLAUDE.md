# Sutton Movers — Workspace

This directory serves as the primary workspace for Sutton Movers operations, including the company website and business development tasks.

## Website

Static HTML/CSS/JS site. Primary goal: maximize SEO and local search visibility.

### Stack
- Plain HTML pages (no framework, no build step)
- Static hosting on Netlify (netlify.toml for config)
- SEO files: robots.txt, sitemap.xml, llms.txt

### Structure
- `index.html` — Homepage
- `*-movers.html` — City-specific landing pages (San Diego, Coronado, Oceanside, Temecula, LA)
- `blog-*.html` — Blog posts for content marketing / SEO
- `contact.html`, `faq.html`, `review.html` — Supporting pages
- `images/` — Static assets

### SEO Rules
- Every page needs unique title tag, meta description, and H1
- City pages should target "[city] movers" and "[city] moving company" keywords
- Blog posts should target long-tail informational queries
- Maintain consistent NAP (Name, Address, Phone) across all pages
- sitemap.xml must stay current when pages are added/removed
- Use semantic HTML (header, main, article, section, footer)
- Images need descriptive alt text with relevant keywords

## Business Development
- Research property managers, apartment complexes, and partnership leads
- Draft and send outreach emails via Gmail (contactsuttonmovers@gmail.com)
- Design marketing materials (business cards, flyers) as printable HTML/CSS

## Integrations
- Gmail MCP server connected for email access (contactsuttonmovers@gmail.com)

## Don't
- Don't add JavaScript frameworks or build tools
- Don't restructure the flat file layout — it works for this scale
- Don't remove or rename existing URLs (breaks SEO / existing backlinks)
