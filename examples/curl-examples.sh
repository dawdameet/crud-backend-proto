#!/bin/bash

# Secure Authentication Backend - cURL Examples
# Make sure your server is running on http://localhost:3000

BASE_URL="http://localhost:3000/api"

echo "🚀 Testing Secure Authentication Backend"
echo "========================================"

# Health Check
echo "📊 Health Check:"
curl -X GET http://localhost:3000/health | jq '.'
echo -e "\n"

# Register a new user
echo "👤 Registering new user:"
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+1234567890"
  }')

echo $REGISTER_RESPONSE | jq '.'

# Extract tokens from registration response
ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.accessToken // empty')
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.refreshToken // empty')

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Registration failed, trying to login instead..."
  
  # Try to login if registration failed (user might already exist)
  echo "🔐 Logging in:"
  LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "identifier": "testuser",
      "password": "TestPass123!"
    }')
  
  echo $LOGIN_RESPONSE | jq '.'
  
  # Extract tokens from login response
  ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken // empty')
  REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.refreshToken // empty')
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token. Exiting."
  exit 1
fi

echo -e "\n✅ Access Token obtained: ${ACCESS_TOKEN:0:50}..."
echo -e "\n"

# Check availability
echo "🔍 Checking username/email availability:"
curl -s -X GET "$BASE_URL/auth/check-availability?username=newuser&email=new@example.com" | jq '.'
echo -e "\n"

# Validate token
echo "✅ Validating token:"
curl -s -X GET $BASE_URL/auth/validate-token \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo -e "\n"

# Get user profile
echo "👤 Getting user profile:"
curl -s -X GET $BASE_URL/user/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo -e "\n"

# Update profile
echo "📝 Updating user profile:"
curl -s -X PUT $BASE_URL/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name",
    "phone": "+9876543210"
  }' | jq '.'
echo -e "\n"

# Get active sessions
echo "📱 Getting active sessions:"
curl -s -X GET $BASE_URL/user/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo -e "\n"

# Get auth logs
echo "📋 Getting authentication logs:"
curl -s -X GET "$BASE_URL/user/auth-logs?page=1&limit=5" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo -e "\n"

# Refresh token
echo "🔄 Refreshing access token:"
REFRESH_RESPONSE=$(curl -s -X POST $BASE_URL/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

echo $REFRESH_RESPONSE | jq '.'

# Extract new tokens
NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.accessToken // empty')
NEW_REFRESH_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.data.refreshToken // empty')

if [ ! -z "$NEW_ACCESS_TOKEN" ]; then
  ACCESS_TOKEN=$NEW_ACCESS_TOKEN
  REFRESH_TOKEN=$NEW_REFRESH_TOKEN
  echo "✅ Token refreshed successfully"
fi
echo -e "\n"

# Test rate limiting (uncomment to test)
# echo "⚡ Testing rate limiting (making 6 rapid requests):"
# for i in {1..6}; do
#   echo "Request $i:"
#   curl -s -X POST $BASE_URL/auth/login \
#     -H "Content-Type: application/json" \
#     -d '{"identifier": "wrong", "password": "wrong"}' | jq '.message'
# done
# echo -e "\n"

# Logout
echo "👋 Logging out:"
curl -s -X POST $BASE_URL/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq '.'
echo -e "\n"

# Try to use refresh token after logout (should fail)
echo "🚫 Trying to use refresh token after logout (should fail):"
curl -s -X POST $BASE_URL/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq '.'

echo -e "\n🎉 Testing completed!"

# Additional test scenarios (uncomment to run)

# Test password change
# echo "🔑 Testing password change:"
# curl -s -X PUT $BASE_URL/user/change-password \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer $ACCESS_TOKEN" \
#   -d '{
#     "currentPassword": "TestPass123!",
#     "newPassword": "NewPass123!"
#   }' | jq '.'

# Test account deletion (BE CAREFUL!)
# echo "⚠️  Testing account deletion:"
# curl -s -X DELETE $BASE_URL/user/account \
#   -H "Content-Type: application/json" \
#   -H "Authorization: Bearer $ACCESS_TOKEN" \
#   -d '{
#     "password": "TestPass123!"
#   }' | jq '.'
