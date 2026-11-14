#!/bin/bash

# Test the /api/data endpoint locally
API_URL="http://localhost:3000/api/data"
TEST_PASSCODE="test-passcode-123"

echo "Testing API endpoints..."
echo ""

# Test 1: No passcode (should get 401)
echo "Test 1: GET without passcode (expect 401)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$API_URL"
echo ""

# Test 2: Wrong passcode (should get 401)
echo "Test 2: GET with wrong passcode (expect 401)"
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -H "X-Allotly-Passcode: wrong-passcode" \
  "$API_URL"
echo ""

# Test 3: GET with correct passcode (should get 200 with empty or data)
echo "Test 3: GET with correct passcode (expect 200)"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "X-Allotly-Passcode: $TEST_PASSCODE" \
  "$API_URL")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")
echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

# Test 4: PUT with correct passcode (should get 200)
echo "Test 4: PUT with correct passcode (expect 200)"
TEST_DATA='{
  "settings": {"weight":"190","ft":"5","inch":"9","age":"33","goal":"2","activity":"1.375"},
  "logs": {"Mon":{"food":"2630","burn":"0"}},
  "weighins": [{"date":"2026-11-10","weight":"190"}],
  "plan": null,
  "shifts": {}
}'

PUT_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X PUT \
  -H "Content-Type: application/json" \
  -H "X-Allotly-Passcode: $TEST_PASSCODE" \
  -d "$TEST_DATA" \
  "$API_URL")
PUT_HTTP_CODE=$(echo "$PUT_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
PUT_BODY=$(echo "$PUT_RESPONSE" | grep -v "HTTP_CODE")
echo "Status: $PUT_HTTP_CODE"
echo "Response: $PUT_BODY"
echo ""

# Test 5: GET again to verify round-trip (should get 200 with data)
echo "Test 5: GET again to verify round-trip (expect 200 with data)"
VERIFY_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "X-Allotly-Passcode: $TEST_PASSCODE" \
  "$API_URL")
VERIFY_HTTP_CODE=$(echo "$VERIFY_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
VERIFY_BODY=$(echo "$VERIFY_RESPONSE" | grep -v "HTTP_CODE")
echo "Status: $VERIFY_HTTP_CODE"
echo "Response: $VERIFY_BODY"
echo ""

echo "Tests complete!"
