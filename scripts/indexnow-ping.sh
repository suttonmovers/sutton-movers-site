#!/usr/bin/env bash
# Submit all sitemap URLs to IndexNow (Bing, Yandex, etc.) on each Netlify deploy.
# Key is public and hosted at https://suttonmovers.com/<key>.txt
set -euo pipefail

HOST="suttonmovers.com"
KEY="8d2cae5f72f64bc18c199b52350e30ae"
SITEMAP="sitemap.xml"

# Pull <loc> values out of the sitemap
urls=$(grep -o 'https://suttonmovers.com/[^<]*' "$SITEMAP")

# Build the JSON urlList array
json_urls=$(printf '%s\n' "$urls" | sed 's/.*/"&"/' | paste -sd, -)

payload=$(cat <<EOF
{"host":"$HOST","key":"$KEY","keyLocation":"https://$HOST/$KEY.txt","urlList":[$json_urls]}
EOF
)

echo "IndexNow: submitting $(printf '%s\n' "$urls" | wc -l | tr -d ' ') URLs..."
curl -fsS -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$payload" && echo "IndexNow: submitted OK" || echo "IndexNow: ping failed (non-fatal)"
