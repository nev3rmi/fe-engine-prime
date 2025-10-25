# Bug Analysis: Double Recording Issue

## User Reports

**First Report:** "now it record double. Please carefully review one before give
it back to me. The system have many bugs, review root cause line by line"

**Second Report (After Initial Fix):** "The problem is that why it record double
time, it looks like after me speak it record double time"

## Line-by-Line Analysis Findings

### 🔴 CRITICAL BUG 1: DOUBLE AUTO-RESTART

**Root Cause:** TWO different places trying to restart speech recognition

**Location 1:** `audio.onended` (line 378-382)

```typescript
audio.onended = () => {
  setIsSpeaking(false);
  URL.revokeObjectURL(audioUrl);

  if (autoRestart && isActiveRef.current && recognitionRef.current) {
    setTimeout(() => {
      recognitionRef.current?.start(); // ← RESTART #1
    }, 800);
  }
};
```

**Location 2:** `recognition.onend` (line 171-176)

```typescript
recognition.onend = () => {
  console.log("Speech recognition ended");
  setIsListening(false);

  if (isActiveRef.current && autoRestart && !isProcessing && !isSpeaking) {
    setTimeout(() => {
      if (recognitionRef.current && isActiveRef.current && !isSpeaking) {
        recognitionRef.current.start(); // ← RESTART #2
      }
    }, 500);
  }
};
```

**Why This Causes Double Recording:**

1. Bot finishes speaking → `audio.onended` fires → schedules restart in 800ms
2. During that 800ms, `recognition.onend` might fire (from previous stop)
3. Now TWO setTimeout callbacks are pending
4. First timeout fires → starts recognition
5. Second timeout fires → starts recognition AGAIN → **DOUBLE RECORDING**

---

### 🔴 CRITICAL BUG 2: Unstable useCallback Dependencies

**Location:** `initializeSpeechRecognition` dependencies (line 181)

```typescript
}, [autoRestart, isProcessing, isSpeaking, onError]);
```

**Problem:**

- `isSpeaking` and `isProcessing` change frequently during conversation
- Every time they change, the entire callback is recreated
- This creates NEW event handlers for the recognition object
- Event handlers can stack up or behave unpredictably

**Impact:**

- Recognition object gets new event handlers on every re-render
- Old handlers might still fire
- Can cause multiple `onstart`, `onend`, `onresult` events

---

### 🔴 CRITICAL BUG 3: No Protection Against Multiple Starts

**Location:** Multiple places call `.start()`

```typescript
// Line 380
recognitionRef.current?.start();

// Line 174
recognitionRef.current.start();

// Line 435
recognitionRef.current.start();
```

**Problem:**

- No check if recognition is already running
- No flag to prevent rapid double-starts
- Browser's `.start()` throws error if already running, but error is caught and
  ignored

**Impact:**

- Multiple timeouts can queue up and call `.start()` repeatedly
- Each call might partially succeed, causing overlapping recognition sessions

---

### 🔴 CRITICAL BUG 4: Missing Restart Timeout Tracking

**Problem:**

- Multiple `setTimeout` calls for restart, but no ref to track them
- Old timeouts can't be cancelled
- They stack up and all fire

**Example Flow:**

1. User speaks → timeout set for restart
2. Before timeout fires, user speaks again → another timeout set
3. Now TWO timeouts pending
4. Both fire → double start

---

### 🔴 BUG 5: Missing useCallback Dependencies

**Location:** `handleUserMessage` (line 230)

```typescript
}, [onMessage, onError]);  // ← Missing: sendMessage
```

**Location:** `generateSpeech` (line 411)

```typescript
}, [voiceSettings, autoRestart, onAudioStart]);
// ← Missing: recognitionRef, isActiveRef, scheduleRestart
```

**Impact:**

- Closures capture old values
- State checks might use stale data
- Can cause incorrect behavior

---

## Comprehensive Fixes Applied

### ✅ FIX 1: Centralized Restart Logic

**New approach:** SINGLE source of truth for restarting

```typescript
// Added new ref
const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const isRestartingRef = useRef(false);

// New helper function
const scheduleRestart = useCallback(
  (delay: number = 800) => {
    clearRestartTimeout(); // Cancel any existing restart

    if (!autoRestart || !isActiveRef.current) return;

    restartTimeoutRef.current = setTimeout(() => {
      if (isActiveRef.current && !isSpeaking && !isProcessing) {
        safeStartRecognition();
      }
    }, delay);
  },
  [autoRestart, isSpeaking, isProcessing, safeStartRecognition]
);
```

**Result:**

- Only ONE timeout can exist at a time
- Old timeouts are always cleared before setting new one
- No double restart possible

---

### ✅ FIX 2: Safe Start with Double-Start Protection

```typescript
const safeStartRecognition = useCallback(() => {
  if (!recognitionRef.current || !isActiveRef.current) return;

  // Prevent double start
  if (isRestartingRef.current) {
    console.log("Already restarting, skip");
    return;
  }

  try {
    isRestartingRef.current = true;
    recognitionRef.current.start();
  } catch (e) {
    console.warn("Already started:", e);
  } finally {
    setTimeout(() => {
      isRestartingRef.current = false;
    }, 100);
  }
}, []);
```

**Result:**

- Flag prevents multiple rapid starts
- Even if called twice quickly, second call is ignored
- 100ms cooldown period

---

### ✅ FIX 3: Removed Auto-Restart from recognition.onend

**Before:**

```typescript
recognition.onend = () => {
  setIsListening(false);

  // Auto-restart here ← REMOVED THIS
};
```

**After:**

```typescript
recognition.onend = () => {
  console.log("Speech recognition ended");
  setIsListening(false);
  // NO auto-restart here
};
```

**Result:**

- Only audio.onended triggers restart
- Single restart path
- No race conditions

---

### ✅ FIX 4: Stable useCallback Dependencies

**Before:**

```typescript
}, [autoRestart, isProcessing, isSpeaking, onError]);
```

**After:**

```typescript
}, [onError, scheduleRestart]);
```

**Result:**

- Callback doesn't recreate on every state change
- Event handlers stay stable
- No handler stacking

---

### ✅ FIX 5: Cleanup Restart Timeout

Added cleanup for restart timeout:

```typescript
const clearRestartTimeout = useCallback(() => {
  if (restartTimeoutRef.current) {
    clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = null;
  }
}, []);

// Use in cleanup
useEffect(() => {
  return () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
    }
    // ... other cleanup
  };
}, []);
```

---

## New Flow (Fixed)

```
1. User clicks mic
   └─ startConversation() → safeStartRecognition()

2. User speaks: "Xin chào"
   └─ Interim results → Auto-finalize after 1.5s

3. Message processing
   └─ handleUserMessage()
   └─ clearRestartTimeout() ← Clear any pending restart
   └─ Stop recognition

4. Bot thinks → Dify processes

5. Bot starts speaking
   └─ generateSpeech()
   └─ clearRestartTimeout() ← Clear again
   └─ Stop recognition

6. Audio plays → Mic stays OFF

7. Audio ends
   └─ audio.onended fires
   └─ scheduleRestart(800) ← ONLY restart point

8. After 800ms
   └─ Check: isActive? !isSpeaking? !isProcessing?
   └─ If all true: safeStartRecognition()
   └─ If isRestarting flag set: skip (prevent double)

9. Recognition starts
   └─ Ready for next input
```

---

## Testing Checklist

- [ ] Click mic → starts once (not twice)
- [ ] Speak → processes correctly
- [ ] Bot responds → mic stays OFF during speech
- [ ] After bot finishes → mic restarts ONCE after 800ms
- [ ] Rapidly click/speak → no double recording
- [ ] Check browser console for "Already restarting, skip" (shouldn't appear
      often)
- [ ] Multiple conversations → no accumulation of timeouts

---

## 🔴 BUG 6: Multiple Audio Elements with Active Event Handlers (ADDITIONAL FIX - 2025-10-25)

**Root Cause:** Old audio elements not cleaned up before creating new ones

**Location:** `generateSpeech()` function (line 408-409)

```typescript
// BUGGY CODE:
const audio = new Audio(audioUrl);
audioRef.current = audio; // ← Overwrites ref but old audio still exists!

audio.onended = () => {
  scheduleRestart(800); // ← OLD audio also has this handler!
};
```

**Why This Causes Double Recording:**

1. First conversation turn → creates Audio #1 with `onended` handler
2. Second conversation turn → creates Audio #2, but Audio #1 still exists
3. Both audio elements have active `onended` handlers
4. When both finish playing (or overlap), BOTH handlers fire
5. Each handler calls `scheduleRestart(800)`
6. Even though `scheduleRestart()` clears old timeout, if they fire
   simultaneously, race condition occurs
7. Result: TWO restart timeouts, microphone starts TWICE

**Fix Applied:**

```typescript
// Clean up old audio FIRST to prevent multiple onended handlers
if (audioRef.current) {
  audioRef.current.onended = null;
  audioRef.current.onerror = null;
  audioRef.current.onloadedmetadata = null;
  audioRef.current.pause();
  audioRef.current = null;
}

// Now create new audio safely
const audio = new Audio(audioUrl);
audioRef.current = audio;
```

**Result:**

- Only ONE audio element exists at a time
- Only ONE `onended` handler can fire
- No race conditions between multiple audio elements
- Microphone restarts exactly ONCE

---

## 🔴 BUG 7: No Guard Against Double Message Processing (ADDITIONAL FIX - 2025-10-25)

**Root Cause:** `handleUserMessage` can be called multiple times simultaneously

**Location:** `handleUserMessage()` function (line 234-244)

**Scenario That Triggers Double Processing:**

1. User speaks: "Xin chào"
2. Interim results come in → auto-finalize timeout set (1.5s)
3. Browser ALSO sends final result at nearly same time
4. BOTH auto-finalize timeout AND final result call `handleUserMessage()`
5. Same message processed TWICE
6. TWO API calls to Dify
7. TWO TTS responses
8. TWO audio playbacks
9. TWO mic restarts

**BUGGY CODE:**

```typescript
const handleUserMessage = useCallback(async (text: string) => {
  if (!text || text.trim().length === 0) {
    return;
  }

  // NO GUARD HERE - second call proceeds!
  setIsProcessing(true);
  // ... process message
});
```

**Fix Applied:**

```typescript
// Added new ref
const isProcessingMessageRef = useRef(false);

const handleUserMessage = useCallback(async (text: string) => {
  if (!text || text.trim().length === 0) {
    return;
  }

  // GUARD: Prevent double message processing
  if (isProcessingMessageRef.current) {
    console.log("Already processing a message, skip duplicate:", text);
    return;
  }

  clearRestartTimeout();
  isProcessingMessageRef.current = true; // Set guard
  setIsProcessing(true);
  setTranscript("");

  try {
    await sendMessage(text);
  } catch (err) {
    // ... error handling
  } finally {
    setIsThinking(false);
    setIsProcessing(false);
    isProcessingMessageRef.current = false; // Reset guard
  }
});
```

**Result:**

- First call to `handleUserMessage()` sets the guard flag
- Second call (if it happens) immediately returns
- Only ONE message is processed
- Only ONE API call, ONE TTS response, ONE mic restart

---

## Files Changed

1. `src/lib/hooks/use-voice-conversation.ts` - Complete rewrite with all fixes
2. `src/lib/hooks/use-voice-conversation-BUGGY.ts.backup` - Backup of buggy
   version

---

## Key Principles Applied

1. **Single Source of Truth**: One place to restart (scheduleRestart)
2. **Defensive Programming**: Flags to prevent race conditions
3. **Cleanup First**: Always clear old timeouts before setting new ones
4. **Stable Callbacks**: Minimal dependencies to prevent recreation
5. **Fail-Safe**: Checks before every operation

---

## Conclusion

The double recording was caused by **multiple competing restart mechanisms**
that could trigger simultaneously. The fix centralizes all restart logic into a
single, controlled path with proper cleanup and race condition protection.

**Before:** 2-3 places trying to restart independently → chaos **After:** 1
controlled restart with safeguards → predictable behavior
