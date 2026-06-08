curl https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{
    "model": "gpt-5.4-mini",
    "input": "write a haiku about ai",
    "store": true
  }'
