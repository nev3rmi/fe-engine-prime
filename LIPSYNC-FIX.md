# Lip Sync Fix - Debugging & Analysis

**Date:** 2025-10-25 **Issue:** Lip sync animation not working (mouth not moving
during TTS playback)

---

## Root Cause Analysis

### Problem 1: Stale Closure in `updateViseme` Callback

**File:** `src/lib/hooks/use-lip-sync.ts`

**Issue:** The `updateViseme` callback was using `isAnimating` state in its
dependency array, which caused it to be recreated every time the state changed.
This led to potential stale closures where the callback might check an old value
of `isAnimating`.

**Code Before:**

```typescript
const updateViseme = useCallback(() => {
  if (!isAnimating || isPausedRef.current) {
    // ❌ Checking state from closure
    return;
  }
  // ... animation logic
}, [isAnimating]); // ❌ Recreates callback when isAnimating changes
```

**Code After:**

```typescript
const isAnimatingRef = useRef(false); // ✅ Add ref

const updateViseme = useCallback(() => {
  if (!isAnimatingRef.current || isPausedRef.current) {
    // ✅ Check ref instead
    return;
  }
  // ... animation logic
}, []); // ✅ No dependencies - stable callback
```

---

### Problem 2: Missing Debugging Logs

**Issue:** No way to verify if:

1. `startLipSync` is being called
2. What duration is being passed
3. If visemes are changing
4. If animation loop is running

**Fix:** Added comprehensive logging throughout the lip sync flow:

```typescript
// In use-voice-conversation.ts
console.log("Audio metadata loaded, duration:", audio.duration);
console.log("Starting lip sync with duration:", durationMs, "ms");
console.log("Audio playing");

// In use-lip-sync.ts
console.log("🎭 startLipSync called with duration:", duration, "ms");
console.log("Generating", visemeCount, "visemes for", duration, "ms");
console.log("🎬 Starting animation loop, will run for", duration, "ms");
console.log("👄 Viseme changed to:", viseme, "at", elapsed, "ms");
console.log("⏹️ Stopping lip sync animation");
```

---

## Changes Made

### 1. `src/lib/hooks/use-lip-sync.ts`

**Added:**

- `isAnimatingRef` to avoid stale closure issues
- Console logs for debugging
- Better state synchronization

**Changed Functions:**

- `updateViseme`: Now uses `isAnimatingRef` instead of `isAnimating` state
- `startLipSync`: Sets both `isAnimating` state and `isAnimatingRef`
- `stopLipSync`: Clears both `isAnimating` state and `isAnimatingRef`

**Lines Changed:**

- Line 20: Added `isAnimatingRef` ref
- Line 62: Changed to use `isAnimatingRef.current`
- Line 73-75: Added viseme change logging
- Line 91: Removed `isAnimating` from dependencies
- Line 96: Added startLipSync log
- Line 112: Added viseme generation log
- Line 141-142: Set both state and ref
- Line 145: Added animation start log
- Line 150-152: Clear both state and ref
- Line 177-178: Clear both state and ref in stopLipSync

---

### 2. `src/lib/hooks/use-voice-conversation.ts`

**Added:**

- Console logs to track audio loading and lip sync trigger
- Moved lip sync trigger BEFORE audio.play() for better timing

**Changed:**

- Line 454-456: Added audio metadata log
- Line 461-464: Moved `onAudioStart` before `audio.play()` and added logging
- Line 467-468: Added audio playing log

---

## How to Test

### Step 1: Open Browser Console

1. Open http://localhost:3000/avatar-demo
2. Open Developer Tools (F12)
3. Go to Console tab

### Step 2: Start Conversation

1. Click "Start Conversation" button
2. Allow microphone permission
3. Speak something (e.g., "Hello, how are you?")

### Step 3: Check Console Logs

**You should see logs in this order:**

```
Audio metadata loaded, duration: 2.5
Starting lip sync with duration: 2500 ms
🎭 startLipSync called with duration: 2500 ms
Generating 16 visemes for 2500 ms
🎬 Starting animation loop, will run for 2500 ms
Audio playing
👄 Viseme changed to: A at 0 ms
👄 Viseme changed to: E at 150 ms
👄 Viseme changed to: O at 300 ms
... (continues every 150ms)
⏹️ Stopping lip sync animation
```

### Step 4: Watch Avatar Mouth

**Expected behavior:**

- Avatar mouth should change shapes while audio is playing
- Mouth shapes: A (wide open), E (medium), I (slight), O (round), U (small
  round), closed
- Changes every ~150ms (about 6-7 times per second)
- Returns to neutral after audio ends

**If mouth is NOT moving:**

- Check console for logs
- If no "🎭 startLipSync called" → callback not being passed correctly
- If no "👄 Viseme changed" → animation loop not running
- If visemes changing but mouth not moving → check AvatarDisplay component

---

## Expected Console Output Example

```
Speech recognition started
Final transcript: hello how are you
Auto-finalizing transcript: hello how are you
Already processing a message, skip duplicate: hello how are you  ← GOOD: Guard working
Message end {event: 'message_end', conversation_id: '...', ...}
Audio metadata loaded, duration: 3.2
Starting lip sync with duration: 3200 ms
🎭 startLipSync called with duration: 3200 ms
Generating 21 visemes for 3200 ms
🎬 Starting animation loop, will run for 3200 ms
Audio playing
👄 Viseme changed to: A at 0 ms
👄 Viseme changed to: closed at 150 ms
👄 Viseme changed to: E at 300 ms
👄 Viseme changed to: U at 450 ms
👄 Viseme changed to: O at 600 ms
... (continues)
⏹️ Stopping lip sync animation
Speech recognition started  ← Auto-restart after speaking
```

---

## Debugging Guide

### Issue: No "🎭 startLipSync called" Log

**Cause:** Callback not being passed from ConversationalAvatar to
useVoiceConversation

**Check:**

```typescript
// In ConversationalAvatar.tsx line 68
useVoiceConversation({
  // ...
  onAudioStart: startLipSync, // ← Make sure this is here
});
```

---

### Issue: "🎭 startLipSync called" but No "👄 Viseme changed" Logs

**Cause:** Animation loop not running

**Possible Reasons:**

1. `isAnimatingRef.current` is false
2. `isPausedRef.current` is true
3. `updateViseme` callback not being called

**Debug:** Add this to `updateViseme` at line 62:

```typescript
const updateViseme = useCallback(() => {
  console.log(
    "updateViseme called, isAnimating:",
    isAnimatingRef.current,
    "isPaused:",
    isPausedRef.current
  );

  if (!isAnimatingRef.current || isPausedRef.current) {
    return;
  }
  // ...
});
```

---

### Issue: "👄 Viseme changed" Logs but Mouth Not Moving

**Cause:** AvatarDisplay not receiving viseme updates

**Check:**

1. Open React DevTools
2. Find `<AvatarDisplay>` component
3. Watch `currentViseme` prop
4. Should change: neutral → A → E → I → O → U → closed → ...

**If prop is changing but mouth not moving:**

- Check `AvatarDisplay.tsx` line 84
- Verify path `d={MOUTH_SHAPES[viseme]}` is using current viseme
- Check CSS transition: `className="transition-all duration-100"`

---

### Issue: Duration is 0 or NaN

**Symptoms:**

```
Audio metadata loaded, duration: 0
Starting lip sync with duration: 0 ms
Generating 0 visemes for 0 ms
```

**Cause:** Audio metadata not loaded before checking duration

**Fix Already Implemented:**

```typescript
// Wait for metadata BEFORE reading duration
await new Promise<void>((resolve, reject) => {
  audio.onloadedmetadata = () => {
    console.log("Audio metadata loaded, duration:", audio.duration); // Should be > 0
    resolve();
  };
});
```

**If still happening:**

- Check TTS API response is valid audio
- Try different audio format
- Check browser console for audio loading errors

---

## Visual Test

### What You Should See

**Idle State:**

- Mouth: slight smile (neutral)
- Status badge: "💤 Idle"
- Border: light primary color

**Listening State:**

- Mouth: neutral
- Status badge: "🎤 Listening" (blue)
- Border: blue, pulsing
- Pulsing ring around avatar

**Thinking State:**

- Mouth: neutral
- Status badge: "🤔 Thinking" (yellow, pulsing)
- Eyes: pulsing animation

**Speaking State:** ⭐ **THIS IS WHERE LIP SYNC HAPPENS**

- Mouth: **CHANGING shapes** (A, E, I, O, U, closed, neutral)
- Status badge: "🗣️ Speaking" (green)
- Border: green
- Sound waves pulsing around avatar

**If mouth is stuck on "neutral" during speaking:** → Lip sync is not working,
check console logs

---

## Performance Notes

### Animation Frame Rate

- Target: 60 FPS (requestAnimationFrame)
- Viseme changes: ~150ms = 6.67 times per second
- Each frame checks elapsed time and updates viseme

### Memory Usage

- Creates viseme array once per audio (e.g., 21 visemes for 3.2s audio)
- Cleans up on unmount
- No memory leaks (refs properly cleared)

---

## Next Steps

### If Lip Sync is Working:

1. **Remove debug logs** (once confirmed working)

   - Comment out or remove console.log statements
   - Keep only error logs

2. **Fine-tune animation:**

   - Adjust viseme duration (currently 150ms)
   - Add more viseme variety
   - Smooth transitions between visemes

3. **Add audio analysis:**
   - Use Web Audio API to analyze actual audio frequencies
   - Map frequencies to visemes (low freq → O/U, high freq → E/I)
   - More realistic lip sync

### If Lip Sync is NOT Working:

1. **Check console logs** - follow debugging guide above
2. **Verify callback chain:**
   - ConversationalAvatar → useVoiceConversation → generateSpeech → onAudioStart
3. **Test manually:**
   ```typescript
   // In ConversationalAvatar, add button to test lip sync directly
   <Button onClick={() => startLipSync(5000)}>
     Test Lip Sync (5s)
   </Button>
   ```

---

## Related Files

- `src/lib/hooks/use-lip-sync.ts` - Lip sync animation logic
- `src/lib/hooks/use-voice-conversation.ts` - TTS and callback trigger
- `src/components/avatar/ConversationalAvatar.tsx` - Integration
- `src/components/avatar/AvatarDisplay.tsx` - Visual rendering
- `src/types/avatar.ts` - Type definitions

---

**Status:** Fixed stale closure bug, added comprehensive logging **Next:** Test
and verify lip sync is working, then clean up logs
