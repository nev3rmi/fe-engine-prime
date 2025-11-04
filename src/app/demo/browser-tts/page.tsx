"use client";

/**
 * Browser TTS Demo Page
 * Test Web Speech Synthesis API with Vietnamese support
 */

import { useState } from "react";
import { useBrowserTTS } from "@/lib/hooks/use-browser-tts";

export default function BrowserTTSDemo() {
  const [text, setText] = useState("Xin chào, tôi là trợ lý ảo của bạn");
  const [language, setLanguage] = useState("vi-VN");

  const {
    isSupported,
    isSpeaking,
    isPaused,
    availableVoices,
    selectedVoice,
    speak,
    pause,
    resume,
    cancel,
    setVoice,
  } = useBrowserTTS({
    language,
    onStart: () => console.log("Started speaking"),
    onEnd: () => console.log("Finished speaking"),
    onError: error => console.error("TTS Error:", error),
  });

  const vietnameseVoices = availableVoices.filter(v => v.lang.startsWith("vi"));
  const englishVoices = availableVoices.filter(v => v.lang.startsWith("en"));

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Browser TTS Demo</h1>

      {/* Not Supported Warning - Always rendered to avoid hydration error */}
      {!isSupported && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <strong>Error:</strong> Web Speech Synthesis API is not supported in your browser. Please
          use Chrome, Edge, or Safari.
        </div>
      )}

      {/* Main Content - Always rendered */}
      <div className={!isSupported ? "pointer-events-none opacity-50" : ""}>
        {/* Status */}
        <div className="mb-6 rounded border border-blue-400 bg-blue-100 px-4 py-3">
          <p>
            <strong>Status:</strong> {isSpeaking ? (isPaused ? "Paused" : "Speaking") : "Ready"}
          </p>
          <p>
            <strong>Selected Voice:</strong>{" "}
            {selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : "None"}
          </p>
          <p>
            <strong>Available Voices:</strong> {availableVoices.length}
          </p>
          {vietnameseVoices.length === 0 && (
            <p className="mt-2 text-red-600">
              <strong>⚠️ No Vietnamese voices found!</strong> See instructions below.
            </p>
          )}
          {vietnameseVoices.length === 1 && (
            <p className="mt-2 text-yellow-600">
              <strong>⚠️ Only 1 Vietnamese voice (male).</strong> To get female voice, see
              instructions below.
            </p>
          )}
        </div>

        {/* Text Input */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">Text to Speak</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            rows={4}
            placeholder="Enter text to speak..."
          />
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">Language</label>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="vi-VN">Vietnamese (vi-VN)</option>
            <option value="en-US">English (en-US)</option>
            <option value="zh-CN">Chinese (zh-CN)</option>
            <option value="ja-JP">Japanese (ja-JP)</option>
            <option value="ko-KR">Korean (ko-KR)</option>
          </select>
        </div>

        {/* Voice Selection */}
        {vietnameseVoices.length > 0 && language === "vi-VN" && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">
              Vietnamese Voices ({vietnameseVoices.length} available)
            </label>
            <select
              value={selectedVoice?.name || ""}
              onChange={e => setVoice(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            >
              {vietnameseVoices.map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang}) {voice.localService ? "📍" : "☁️"}
                  {voice.name.includes("Female") ||
                  voice.name.includes("Linh") ||
                  voice.name.includes("My")
                    ? " 👩 Female"
                    : ""}
                  {voice.name.includes("Male") ||
                  voice.name.includes("An") ||
                  voice.name.includes("Minh")
                    ? " 👨 Male"
                    : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              📍 = Local voice, ☁️ = Cloud voice, 👩 = Female, 👨 = Male
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => speak(text)}
            disabled={!text || isSpeaking}
            className="rounded-md bg-blue-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Speak
          </button>

          {isSpeaking && !isPaused && (
            <button onClick={pause} className="rounded-md bg-yellow-500 px-4 py-2 text-white">
              Pause
            </button>
          )}

          {isPaused && (
            <button onClick={resume} className="rounded-md bg-green-500 px-4 py-2 text-white">
              Resume
            </button>
          )}

          {isSpeaking && (
            <button onClick={cancel} className="rounded-md bg-red-500 px-4 py-2 text-white">
              Stop
            </button>
          )}
        </div>

        {/* Quick Test Phrases */}
        <div className="mb-6">
          <h2 className="mb-3 text-xl font-semibold">Quick Test Phrases</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setText("Xin chào, tôi là trợ lý ảo của bạn");
                setLanguage("vi-VN");
              }}
              className="rounded bg-gray-100 px-3 py-2 text-left hover:bg-gray-200"
            >
              🇻🇳 Xin chào, tôi là trợ lý ảo của bạn
            </button>
            <button
              onClick={() => {
                setText("Hôm nay bạn thế nào?");
                setLanguage("vi-VN");
              }}
              className="rounded bg-gray-100 px-3 py-2 text-left hover:bg-gray-200"
            >
              🇻🇳 Hôm nay bạn thế nào?
            </button>
            <button
              onClick={() => {
                setText("Hello, I am your virtual assistant");
                setLanguage("en-US");
              }}
              className="rounded bg-gray-100 px-3 py-2 text-left hover:bg-gray-200"
            >
              🇺🇸 Hello, I am your virtual assistant
            </button>
            <button
              onClick={() => {
                setText("How are you today?");
                setLanguage("en-US");
              }}
              className="rounded bg-gray-100 px-3 py-2 text-left hover:bg-gray-200"
            >
              🇺🇸 How are you today?
            </button>
          </div>
        </div>

        {/* All Available Voices */}
        <div className="mb-6">
          <h2 className="mb-3 text-xl font-semibold">
            All Available Voices ({availableVoices.length})
          </h2>
          <div className="max-h-96 overflow-y-auto rounded-md bg-gray-50 p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left">Name</th>
                  <th className="py-2 text-left">Language</th>
                  <th className="py-2 text-left">Type</th>
                </tr>
              </thead>
              <tbody>
                {availableVoices.map(voice => (
                  <tr key={voice.name} className="border-b">
                    <td className="py-2">{voice.name}</td>
                    <td className="py-2">{voice.lang}</td>
                    <td className="py-2">{voice.localService ? "📍 Local" : "☁️ Cloud"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded border border-yellow-300 bg-yellow-50 px-4 py-3">
          <h3 className="mb-2 font-semibold">ℹ️ How to Get Vietnamese Female Voice "Hoài My":</h3>
          <ul className="list-inside list-disc space-y-2 text-sm">
            <li>
              <strong>Windows 11:</strong>
              <ol className="mt-1 ml-4 list-inside list-decimal space-y-1">
                <li>Settings → Time & Language → Language & Region</li>
                <li>Click Vietnamese → Options → Add voices</li>
                <li>
                  Download <strong>Microsoft Hoài My Online (Natural)</strong> - Female voice
                </li>
                <li>Restart your browser</li>
              </ol>
            </li>
            <li>
              <strong>Windows 10:</strong> Vietnamese female voices not available by default. Use
              Azure Speech API instead (see below).
            </li>
            <li>
              <strong>Chrome with Google voices:</strong> Chrome may have cloud-based Vietnamese
              voices when connected to internet
            </li>
            <li>
              <strong>Current voice "An":</strong> This is a male voice. You need to download female
              voice pack.
            </li>
          </ul>
        </div>

        {/* Alternative: Azure Speech */}
        <div className="mt-4 rounded border border-blue-300 bg-blue-50 px-4 py-3">
          <h3 className="mb-2 font-semibold">
            🌟 Alternative: Azure Speech API (Best Quality Female Voice)
          </h3>
          <p className="mb-2 text-sm">
            <strong>Female voice:</strong> vi-VN-HoaiMyNeural (same name as Windows voice, but
            better quality)
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            <li>
              <strong>Free tier:</strong> 500,000 characters/month (enough for most uses)
            </li>
            <li>
              <strong>Quality:</strong> Neural voice, very natural
            </li>
            <li>
              <strong>Setup time:</strong> 10 minutes
            </li>
            <li>
              <strong>Get API key:</strong> https://portal.azure.com (free account)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
