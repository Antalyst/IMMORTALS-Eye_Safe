# Veritas Scan - URL Verification Enhancement

## Overview

Enhanced the verified source authentication system to require **BOTH** source name matching **AND** official account URL verification before auto-classifying posts as "Likely True". This prevents false positives where posts mention trusted source names but don't actually come from official accounts.

---

## ✅ Key Changes

### 1. **Updated `trustedSources.json` Structure** ✅

**Before**: Simple string array
```json
["Bago Component City Police Station", "PNP", ...]
```

**After**: Object array with `officialAccounts`
```json
[
  {
    "name": "Bago Component City Police Station",
    "officialAccounts": [
      "https://web.facebook.com/bago.advocacyprograms",
      "facebook.com/bago.advocacyprograms",
      "bago.advocacyprograms",
      "/bago.advocacyprograms"
    ]
  },
  ...
]
```

**Benefits**:
- Each trusted source can have multiple official account URLs
- Supports various URL formats (full URLs, paths, account names)
- Backward compatible with sources that have no official accounts defined

---

### 2. **Enhanced `verifiedSourceAuthenticator.ts`** ✅

**New Verification Logic**:

1. **Extract source name** from text (fuzzy matching allowed)
2. **Find matching trusted source** in the list
3. **Check if source has official accounts** defined
   - If no accounts defined → Use source name matching only (backward compatible)
   - If accounts defined → Require URL verification
4. **Extract URL** from text or use provided `postUrl` parameter
5. **Match URL** against official accounts (normalized comparison)
6. **Auto-verify** only if BOTH conditions met

**URL Extraction Patterns**:
- Full Facebook URLs: `https://web.facebook.com/bago.advocacyprograms`
- Facebook paths: `facebook.com/bago.advocacyprograms`
- Account paths: `/bago.advocacyprograms`
- Account names: `bago.advocacyprograms`

**URL Matching**:
- Normalizes URLs (removes protocol, www, trailing slashes)
- Case-insensitive comparison
- Checks for account identifier matches
- Supports partial matches (e.g., `facebook.com/bago.advocacyprograms` matches `bago.advocacyprograms`)

---

### 3. **Rejection Logic** ✅

**Rejection Reasons**:
1. **"Source name not in trusted list"**: Source name doesn't match any trusted source
2. **"No URL found in post"**: Source name matches, but no URL detected in post
3. **"URL mismatch"**: Source name matches, but URL doesn't match any official account

**Rejection Behavior**:
- Logs rejection reason clearly
- Returns `isVerified: false` with detailed reasoning
- Falls through to normal AI + internet fact-check pipeline
- Does NOT auto-classify as "True"

---

### 4. **Updated API and Composables** ✅

**`factCheck.post.ts`**:
- Added `postUrl` parameter to request type
- Passes `postUrl` to `checkVerifiedSourceAuthenticity()`
- Logs URL verification status
- Logs rejection reasons when verification fails

**`useVeritasScan.ts`**:
- Extracts URL from text using regex pattern
- Passes extracted URL to verification function
- Logs rejection reasons for debugging

**`hybridVerifier.ts`**:
- Added `postUrl` parameter to options
- Passes URL to verification function

---

## 📊 Verification Flow

### Scenario 1: Verified Source (Both Conditions Met)
```
Text: "Bago Component City Police Station - Official announcement..."
URL: "https://web.facebook.com/bago.advocacyprograms"

1. Extract source name: "Bago Component City Police Station" ✅
2. Find trusted source: ✅ Found
3. Check official accounts: ✅ Has accounts defined
4. Extract URL: ✅ "https://web.facebook.com/bago.advocacyprograms"
5. Match URL: ✅ Matches official account
6. Result: ✅ VERIFIED - Auto-classify as "Likely True" (confidence 0.95-0.98)
```

### Scenario 2: Rejected - No URL Found
```
Text: "Bago Component City Police Station - Breaking news..."
URL: (not found in post)

1. Extract source name: "Bago Component City Police Station" ✅
2. Find trusted source: ✅ Found
3. Check official accounts: ✅ Has accounts defined
4. Extract URL: ❌ No URL found
5. Result: ❌ REJECTED - Reason: "No URL found in post"
6. Fallback: Runs full AI + internet fact-check pipeline
```

### Scenario 3: Rejected - URL Mismatch
```
Text: "Bago Component City Police Station - Update..."
URL: "https://web.facebook.com/some-random-account"

1. Extract source name: "Bago Component City Police Station" ✅
2. Find trusted source: ✅ Found
3. Check official accounts: ✅ Has accounts defined
4. Extract URL: ✅ "https://web.facebook.com/some-random-account"
5. Match URL: ❌ Doesn't match official account
6. Result: ❌ REJECTED - Reason: "URL mismatch"
7. Fallback: Runs full AI + internet fact-check pipeline
```

### Scenario 4: Backward Compatible (No Official Accounts Defined)
```
Text: "Negros Occidental Police Provincial Office - Announcement..."
URL: (not required)

1. Extract source name: "Negros Occidental Police Provincial Office" ✅
2. Find trusted source: ✅ Found
3. Check official accounts: ⚠️ No accounts defined
4. Result: ✅ VERIFIED - Uses source name matching only (backward compatible)
```

---

## 🔍 Logging Examples

### Successful Verification
```
[SourceVerifier] ✅ VERIFIED: Source name "Bago Component City Police Station" matches trusted source AND URL "https://web.facebook.com/bago.advocacyprograms" matches official account.
[SourceVerifier] Matched against: Bago Component City Police Station
[SourceVerifier] Source match score: 95% similarity
[FactCheck] ✅ Verified institutional source detected: Bago Component City Police Station
[FactCheck] URL verified: https://web.facebook.com/bago.advocacyprograms
```

### Rejection - No URL
```
[SourceVerifier] ❌ REJECTED: Source name "Bago Component City Police Station" matches trusted source, but no URL found in post.
[SourceVerifier] Post will be processed through normal AI + internet fact-check pipeline.
[FactCheck] ⚠️ Source verification rejected: No URL found in post
[FactCheck] Source: "Bago Component City Police Station", URL: "not found"
[FactCheck] Running full AI + internet fact-check pipeline as fallback.
```

### Rejection - URL Mismatch
```
[SourceVerifier] ❌ REJECTED: Source name "Bago Component City Police Station" matches trusted source, but URL "https://web.facebook.com/fake-account" does not match official accounts.
[SourceVerifier] Expected official accounts: https://web.facebook.com/bago.advocacyprograms, facebook.com/bago.advocacyprograms, bago.advocacyprograms
[SourceVerifier] Post will be processed through normal AI + internet fact-check pipeline.
[FactCheck] ⚠️ Source verification rejected: URL mismatch
[FactCheck] Source: "Bago Component City Police Station", URL: "https://web.facebook.com/fake-account"
[FactCheck] Running full AI + internet fact-check pipeline as fallback.
```

---

## 📝 API Usage

### Request Format
```typescript
POST /api/factCheck
{
  "text": "Bago Component City Police Station - Official announcement...",
  "postUrl": "https://web.facebook.com/bago.advocacyprograms", // Optional
  "postId": "post-123", // Optional
  "engagement": {
    "likes": 100,
    "shares": 50,
    "comments": 20
  }
}
```

### Response Format (Verified)
```json
{
  "verified": true,
  "confidence": 0.95,
  "verdict": "Likely True",
  "reasoning": "Content originates from a verified public safety institution: \"Bago Component City Police Station\". Post URL \"https://web.facebook.com/bago.advocacyprograms\" verified against official account...",
  "meta_verified": true,
  "platform": "Institutional Source",
  "badge": "verified",
  "verifiedSource": "Bago Component City Police Station"
}
```

### Response Format (Rejected)
```json
{
  "verified": false,
  "confidence": 0.5,
  "verdict": "Unverified",
  "reasoning": "Source name \"Bago Component City Police Station\" matches a trusted source, but the post URL \"https://web.facebook.com/fake-account\" does not match any official account. This post will be analyzed through the full AI + internet fact-check pipeline.",
  "meta_verified": false,
  "platform": "Social Media",
  "badge": "unverified"
}
```

---

## 🎯 Benefits

✅ **Prevents False Positives**: Posts mentioning trusted source names but from unofficial accounts are not auto-verified  
✅ **Maintains Security**: Only official accounts are trusted  
✅ **Backward Compatible**: Sources without official accounts defined still work  
✅ **Detailed Logging**: Clear rejection reasons for debugging  
✅ **Flexible URL Matching**: Supports various URL formats and partial matches  
✅ **Graceful Fallback**: Rejected posts go through full AI + internet fact-check  

---

## 🔧 Configuration

### Adding New Official Accounts

Edit `front/server/utils/trustedSources.json`:

```json
{
  "name": "Bago Component City Police Station",
  "officialAccounts": [
    "https://web.facebook.com/bago.advocacyprograms",
    "facebook.com/bago.advocacyprograms",
    "bago.advocacyprograms",
    "/bago.advocacyprograms",
    "https://www.facebook.com/pages/Bago-Component-City-Police-Station/123456789" // Add more
  ]
}
```

### Sources Without Official Accounts

If a source doesn't have official accounts defined, it will use source name matching only (backward compatible):

```json
{
  "name": "Negros Occidental Police Provincial Office",
  "officialAccounts": [] // Empty array = no URL verification required
}
```

---

## 📚 Files Modified

1. **`front/server/utils/trustedSources.json`** - Added `officialAccounts` arrays
2. **`front/server/utils/verifiedSourceAuthenticator.ts`** - Enhanced with URL verification logic
3. **`front/server/api/factCheck.post.ts`** - Added `postUrl` parameter and rejection logging
4. **`front/composables/useVeritasScan.ts`** - URL extraction and passing
5. **`front/server/utils/hybridVerifier.ts`** - Added `postUrl` parameter support

---

## 🚀 Testing

### Test Case 1: Verified Source with Matching URL
```typescript
const result = await checkVerifiedSourceAuthenticity(
  "Bago Component City Police Station - Official announcement...",
  "https://web.facebook.com/bago.advocacyprograms"
)
// Expected: isVerified = true, confidence = 0.95
```

### Test Case 2: Source Name Match but No URL
```typescript
const result = await checkVerifiedSourceAuthenticity(
  "Bago Component City Police Station - Breaking news...",
  undefined
)
// Expected: isVerified = false, rejectionReason = "No URL found in post"
```

### Test Case 3: Source Name Match but URL Mismatch
```typescript
const result = await checkVerifiedSourceAuthenticity(
  "Bago Component City Police Station - Update...",
  "https://web.facebook.com/fake-account"
)
// Expected: isVerified = false, rejectionReason = "URL mismatch"
```

---

**Last Updated**: 2024  
**Version**: 2.2 (URL Verification Enhanced)  
**Status**: Production Ready ✅

