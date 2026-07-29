#!/bin/bash
# Base44 API ile düzeltilmiş dosyaları deploy et

API_KEY="0d2f509f4ecb4d85b04ea1c95c731773"
APP_ID="69ee8baf536bd6c6997d6538"
BASE_URL="https://ne-pa-panel.base44.app/api"

# generateImagePrompt fonksiyonunu güncelle
curl -X PUT "${BASE_URL}/functions/generateImagePrompt" \
  -H "api_key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  --data-binary @base44/functions/generateImagePrompt/entry.ts

echo "✓ generateImagePrompt güncellendi"

# Frontend dosyalarını güncelle (bu API desteklemiyorsa manual yükle)
echo "Frontend dosyaları manuel yüklenmeli - ZIP kullan"
