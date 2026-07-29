#!/bin/bash
TOKEN="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"
REPO="enesa4276/NePa_Panel"

echo "1. Default branch'i master yapıyorum..."
curl -X PATCH "https://api.github.com/repos/${REPO}" \
  -H "Authorization: token ${TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{"default_branch":"master"}'

echo -e "\n\n2. Eski main dalını siliyorum..."
curl -X DELETE "https://api.github.com/repos/${REPO}/git/refs/heads/main" \
  -H "Authorization: token ${TOKEN}" \
  -H "Accept: application/vnd.github.v3+json"

echo -e "\n\n3. master dalını main olarak yeniden adlandırıyorum..."
curl -X POST "https://api.github.com/repos/${REPO}/branches/master/rename" \
  -H "Authorization: token ${TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  -d '{"new_name":"main"}'

echo -e "\n\n✅ Tamamlandı! Artık güncel kod 'main' dalında."
