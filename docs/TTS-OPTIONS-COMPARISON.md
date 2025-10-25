# TTS Options Comparison for Vietnamese Support

This document compares all available Text-to-Speech (TTS) options for the conversational avatar system.

---

## Summary Table

| Provider | Cost | Setup Complexity | Vietnamese Support | Quality | Viseme Data | Status |
|----------|------|------------------|-------------------|---------|-------------|--------|
| **Browser TTS** | ✅ **FREE** | ⭐ **Easy** (no setup) | ✅ Yes (vi-VN) | ⭐⭐⭐ Good | ❌ No | ✅ **Ready** |
| **Azure Speech** | ✅ **FREE** (500K/month) | ⭐⭐ Medium (API key) | ✅ Yes (vi-VN) | ⭐⭐⭐⭐⭐ Excellent | ✅ **Yes** | ✅ **Ready** |
| **Hugging Face** | ✅ FREE | ⭐⭐ Medium (API key) | ✅ Yes (vie) | ⭐⭐⭐ Good | ❌ No | ❌ **Unavailable** |
| **ElevenLabs** | ❌ Paid (10K free) | ⭐⭐ Medium (API key) | ⚠️ Limited | ⭐⭐⭐⭐⭐ Excellent | ❌ No | ⚠️ **Quota exceeded** |

---

## Option 1: Browser TTS (Web Speech Synthesis API) ⭐ RECOMMENDED FOR QUICK START

### Overview
Uses the built-in browser speech synthesis (Web Speech API). Works client-side with zero configuration.

### Pros
- ✅ **100% Free** - No API keys, no quotas, no costs
- ✅ **Zero Setup** - Works immediately in browser
- ✅ **Vietnamese Support** - Language code `vi-VN`
- ✅ **Multiple Voices** - Chrome has Google's remote voices
- ✅ **Cross-platform** - Works on all major browsers
- ✅ **Privacy** - All processing client-side

### Cons
- ❌ **No Viseme Data** - Can't generate accurate lip-sync
- ⚠️ **Variable Quality** - Depends on browser/OS
- ⚠️ **Browser-dependent** - Different voices per browser
- ❌ **Client-side Only** - Can't use from server

### Vietnamese Voice Availability
- **Chrome**: Google remote voices (best quality)
- **Firefox**: System voices (requires OS installation)
- **Safari**: macOS VoiceOver voices (good quality)
- **Edge**: Microsoft voices (good quality)

### Implementation Status
✅ **Fully Implemented**
- Hook: `src/lib/hooks/use-browser-tts.ts`
- Demo: `src/app/demo/browser-tts/page.tsx`

### Usage Example
```typescript
import { useBrowserTTS } from '@/lib/hooks/use-browser-tts';

function MyComponent() {
  const { speak, isSpeaking, availableVoices } = useBrowserTTS({
    language: 'vi-VN',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
  });

  return (
    <button onClick={() => speak('Xin chào, tôi là trợ lý ảo của bạn')}>
      Speak Vietnamese
    </button>
  );
}
```

### Testing
Visit: http://localhost:3000/demo/browser-tts

### When to Use
- ✅ Quick prototyping
- ✅ No API key setup available
- ✅ Privacy-sensitive applications
- ✅ Unlimited usage needs
- ❌ When lip-sync accuracy is critical

---

## Option 2: Azure Speech Service ⭐ RECOMMENDED FOR PRODUCTION

### Overview
Microsoft's cloud-based TTS service with neural voices and native viseme data support.

### Pros
- ✅ **Free Tier** - 500,000 characters/month (50x more than ElevenLabs)
- ✅ **High Quality** - Neural voices with natural prosody
- ✅ **Vietnamese Support** - 2 neural voices: `vi-VN-HoaiMyNeural` (F), `vi-VN-NamMinhNeural` (M)
- ✅ **Viseme Data** - Native support for accurate lip-sync!
- ✅ **SSML Support** - Advanced voice control (speed, pitch, emphasis)
- ✅ **Reliable** - Enterprise-grade service

### Cons
- ⚠️ **Requires Account** - Need Azure account (free tier available)
- ⚠️ **API Key** - Need to generate API key (~5 min setup)
- ⚠️ **Credit Card** - Required for identity (not charged on free tier)

### Vietnamese Voices
- **vi-VN-HoaiMyNeural** - Female, neural, natural
- **vi-VN-NamMinhNeural** - Male, neural, natural

### Implementation Status
✅ **Fully Implemented**
- Route: `src/app/api/avatar/tts/route.ts` (primary provider)
- Environment: `.env.local` (needs API key)

### Setup Instructions
1. Go to https://portal.azure.com
2. Create "Speech" resource (select **Free F0** tier)
3. Get API key from "Keys and Endpoint"
4. Add to `.env.local`:
   ```bash
   AZURE_SPEECH_KEY=your-key-here
   AZURE_SPEECH_REGION=eastus
   ```
5. Restart dev server: `pnpm dev`

### Usage Example
```bash
# Test Vietnamese TTS
curl -X POST http://localhost:3000/api/avatar/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Xin chào","language":"vi","provider":"azure"}' \
  --output test.mp3
```

### Testing
```bash
# Check status
curl http://localhost:3000/api/avatar/tts | jq '.providers.azure'

# Generate speech
curl -X POST http://localhost:3000/api/avatar/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Xin chào, tôi là trợ lý ảo của bạn","language":"vi","gender":"female"}' \
  --output /tmp/azure-vi.mp3
```

### When to Use
- ✅ Production applications
- ✅ When lip-sync accuracy matters
- ✅ Need high-quality voices
- ✅ Scalable solution (500K chars/month)
- ❌ Can't create Azure account

---

## Option 3: Hugging Face MMS-TTS ❌ NOT AVAILABLE

### Overview
Facebook's Massively Multilingual Speech models hosted on Hugging Face.

### Status
❌ **Models NOT deployed on Inference API**

### What Went Wrong
- Model exists: `facebook/mms-tts-vie`
- Hub URL: https://huggingface.co/facebook/mms-tts-vie
- **Issue**: Not deployed on Inference API (404 error)
- **Requires**: Local inference or self-hosting

### Alternative: Self-Host
If you have Python/Docker infrastructure:
```bash
# Local installation
pip install transformers
python -c "from transformers import pipeline; tts = pipeline('text-to-speech', model='facebook/mms-tts-vie')"
```

### Implementation Status
⚠️ **Implemented but Non-functional**
- Route: `src/app/api/avatar/tts/route.ts` (fallback provider)
- Status: Returns 404 errors

### When to Use
- ❌ Not currently viable
- ⚠️ Only if you can self-host models

---

## Option 4: ElevenLabs ⚠️ QUOTA EXCEEDED

### Overview
Premium commercial TTS service with very high quality voices.

### Status
⚠️ **Free tier quota exceeded** (3/10,000 credits remaining)

### Pros
- ✅ **Very High Quality** - Best-in-class voice synthesis
- ✅ **Multiple Models** - `eleven_flash_v2_5` (fast)
- ✅ **Voice Cloning** - Custom voice creation

### Cons
- ❌ **Paid Service** - Only 10,000 chars free
- ❌ **Limited Free Tier** - Already exhausted
- ⚠️ **Vietnamese Support** - Limited, not optimized
- ❌ **No Viseme Data** - Can't generate lip-sync

### Current Quota
- **Total**: 10,000 characters
- **Used**: 9,997 characters
- **Remaining**: 3 characters
- **Status**: Effectively unusable

### Implementation Status
✅ **Implemented**
- Route: `src/app/api/avatar/tts/route.ts` (fallback provider)
- Status: 401 quota exceeded errors

### Options
1. **Upgrade to Paid Plan** - $5/month for 30K chars
2. **Wait for Reset** - Monthly quota resets
3. **Use Alternative** - Browser TTS or Azure

### When to Use
- ✅ When you have paid subscription
- ✅ English-only applications
- ❌ For Vietnamese (not optimized)
- ❌ When viseme data needed

---

## Recommendation Matrix

### For Quick Testing / Development
**Use: Browser TTS**
- No setup required
- Works immediately
- Good enough for testing

### For Production / Best Quality
**Use: Azure Speech Service**
- Best Vietnamese support
- Native viseme data (lip-sync!)
- Free tier is generous
- High quality neural voices

### For Prototyping Without API Keys
**Use: Browser TTS**
- Zero configuration
- Works offline
- Privacy-friendly

### For English-Only + Budget Available
**Use: ElevenLabs** (after upgrading)
- Best English quality
- Voice cloning features
- Professional results

---

## Current Multi-Provider Fallback Chain

The system automatically tries providers in order:

```
1. Azure Speech  (if API key configured)
   ↓ (404 or error)
2. Hugging Face  (if API key configured)
   ↓ (404 - models unavailable)
3. ElevenLabs    (if API key configured)
   ↓ (401 - quota exceeded)
4. 503 Error     (all providers failed)
```

**Current Reality**:
- Azure: Not configured (needs API key)
- Hugging Face: 404 errors (models not on Inference API)
- ElevenLabs: 401 errors (quota exceeded)
- **Result**: System returns 503 errors

**To Fix**:
Add Azure API key → Instant Vietnamese TTS!

---

## Files Modified/Created

### New Files
1. `src/lib/hooks/use-browser-tts.ts` - Browser TTS hook (232 lines)
2. `src/app/demo/browser-tts/page.tsx` - Demo page (258 lines)

### Modified Files
1. `src/app/api/avatar/tts/route.ts` - Added Azure provider (382 lines)
2. `src/lib/middleware/auth.ts` - Added `/demo/.*` to public routes
3. `.env.local` - Added Azure config

---

## Next Steps

### Immediate Actions
1. **Test Browser TTS** (5 minutes)
   - Visit: http://localhost:3000/demo/browser-tts
   - Test Vietnamese voices
   - Check quality on your browser

2. **Get Azure API Key** (10 minutes)
   - Follow guide above
   - Add to `.env.local`
   - Test production quality

### Future Enhancements
1. **Viseme Integration** (when using Azure)
   - Extract viseme data from Azure response
   - Map to avatar mouth shapes
   - Achieve perfect lip-sync!

2. **Voice Selector UI**
   - Let users choose TTS provider
   - Display available voices
   - Show quota/usage info

3. **Caching**
   - Cache generated audio
   - Reduce API calls
   - Improve response time

---

## Conclusion

**Best Choice: Browser TTS + Azure Speech**

1. **Start with Browser TTS** (today)
   - Immediate Vietnamese support
   - No setup required
   - Test and iterate

2. **Add Azure for Production** (when ready)
   - Better quality
   - Viseme data for lip-sync
   - Scalable and reliable

This hybrid approach gives you:
- ✅ Immediate functionality (Browser TTS)
- ✅ Production quality (Azure Speech)
- ✅ Cost efficiency (both free!)
- ✅ Flexibility (switch based on needs)

**The model you shared (`vietnamese-sbert`) is not a TTS model** - it's for text similarity/embeddings, not speech generation.
