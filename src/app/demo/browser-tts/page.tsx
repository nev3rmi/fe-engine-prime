'use client';

/**
 * Browser TTS Demo Page
 * Test Web Speech Synthesis API with Vietnamese support
 */

import { useState } from 'react';
import { useBrowserTTS } from '@/lib/hooks/use-browser-tts';

export default function BrowserTTSDemo() {
  const [text, setText] = useState('Xin chào, tôi là trợ lý ảo của bạn');
  const [language, setLanguage] = useState('vi-VN');

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
    onStart: () => console.log('Started speaking'),
    onEnd: () => console.log('Finished speaking'),
    onError: (error) => console.error('TTS Error:', error),
  });

  const vietnameseVoices = availableVoices.filter((v) =>
    v.lang.startsWith('vi')
  );
  const englishVoices = availableVoices.filter((v) =>
    v.lang.startsWith('en')
  );

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Browser TTS Demo</h1>

      {/* Not Supported Warning - Always rendered to avoid hydration error */}
      {!isSupported && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> Web Speech Synthesis API is not supported in
          your browser. Please use Chrome, Edge, or Safari.
        </div>
      )}

      {/* Main Content - Always rendered */}
      <div className={!isSupported ? 'opacity-50 pointer-events-none' : ''}>
        {/* Status */}
        <div className="bg-blue-100 border border-blue-400 px-4 py-3 rounded mb-6">
          <p>
            <strong>Status:</strong>{' '}
            {isSpeaking ? (isPaused ? 'Paused' : 'Speaking') : 'Ready'}
          </p>
          <p>
            <strong>Selected Voice:</strong>{' '}
            {selectedVoice ? `${selectedVoice.name} (${selectedVoice.lang})` : 'None'}
          </p>
          <p>
            <strong>Available Voices:</strong> {availableVoices.length}
          </p>
          {vietnameseVoices.length === 0 && (
            <p className="text-red-600 mt-2">
              <strong>⚠️ No Vietnamese voices found!</strong> See instructions below.
            </p>
          )}
          {vietnameseVoices.length === 1 && (
            <p className="text-yellow-600 mt-2">
              <strong>⚠️ Only 1 Vietnamese voice (male).</strong> To get female voice, see instructions below.
            </p>
          )}
        </div>

        {/* Text Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Text to Speak</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={4}
            placeholder="Enter text to speak..."
          />
        </div>

        {/* Language Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="vi-VN">Vietnamese (vi-VN)</option>
            <option value="en-US">English (en-US)</option>
            <option value="zh-CN">Chinese (zh-CN)</option>
            <option value="ja-JP">Japanese (ja-JP)</option>
            <option value="ko-KR">Korean (ko-KR)</option>
          </select>
        </div>

        {/* Voice Selection */}
        {vietnameseVoices.length > 0 && language === 'vi-VN' && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Vietnamese Voices ({vietnameseVoices.length} available)
            </label>
            <select
              value={selectedVoice?.name || ''}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              {vietnameseVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang}) {voice.localService ? '📍' : '☁️'}
                  {voice.name.includes('Female') || voice.name.includes('Linh') || voice.name.includes('My') ? ' 👩 Female' : ''}
                  {voice.name.includes('Male') || voice.name.includes('An') || voice.name.includes('Minh') ? ' 👨 Male' : ''}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              📍 = Local voice, ☁️ = Cloud voice, 👩 = Female, 👨 = Male
            </p>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => speak(text)}
            disabled={!text || isSpeaking}
            className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Speak
          </button>

          {isSpeaking && !isPaused && (
            <button
              onClick={pause}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md"
            >
              Pause
            </button>
          )}

          {isPaused && (
            <button
              onClick={resume}
              className="px-4 py-2 bg-green-500 text-white rounded-md"
            >
              Resume
            </button>
          )}

          {isSpeaking && (
            <button
              onClick={cancel}
              className="px-4 py-2 bg-red-500 text-white rounded-md"
            >
              Stop
            </button>
          )}
        </div>

        {/* Quick Test Phrases */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Quick Test Phrases</h2>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setText('Xin chào, tôi là trợ lý ảo của bạn');
                setLanguage('vi-VN');
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-left"
            >
              🇻🇳 Xin chào, tôi là trợ lý ảo của bạn
            </button>
            <button
              onClick={() => {
                setText('Hôm nay bạn thế nào?');
                setLanguage('vi-VN');
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-left"
            >
              🇻🇳 Hôm nay bạn thế nào?
            </button>
            <button
              onClick={() => {
                setText('Hello, I am your virtual assistant');
                setLanguage('en-US');
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-left"
            >
              🇺🇸 Hello, I am your virtual assistant
            </button>
            <button
              onClick={() => {
                setText('How are you today?');
                setLanguage('en-US');
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-left"
            >
              🇺🇸 How are you today?
            </button>
          </div>
        </div>

        {/* All Available Voices */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">
            All Available Voices ({availableVoices.length})
          </h2>
          <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Language</th>
                  <th className="text-left py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {availableVoices.map((voice) => (
                  <tr key={voice.name} className="border-b">
                    <td className="py-2">{voice.name}</td>
                    <td className="py-2">{voice.lang}</td>
                    <td className="py-2">
                      {voice.localService ? '📍 Local' : '☁️ Cloud'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-300 px-4 py-3 rounded">
          <h3 className="font-semibold mb-2">ℹ️ How to Get Vietnamese Female Voice "Hoài My":</h3>
          <ul className="list-disc list-inside text-sm space-y-2">
            <li>
              <strong>Windows 11:</strong>
              <ol className="list-decimal list-inside ml-4 mt-1 space-y-1">
                <li>Settings → Time & Language → Language & Region</li>
                <li>Click Vietnamese → Options → Add voices</li>
                <li>Download <strong>Microsoft Hoài My Online (Natural)</strong> - Female voice</li>
                <li>Restart your browser</li>
              </ol>
            </li>
            <li>
              <strong>Windows 10:</strong> Vietnamese female voices not available by default. Use Azure Speech API instead (see below).
            </li>
            <li>
              <strong>Chrome with Google voices:</strong> Chrome may have cloud-based Vietnamese voices when connected to internet
            </li>
            <li>
              <strong>Current voice "An":</strong> This is a male voice. You need to download female voice pack.
            </li>
          </ul>
        </div>

        {/* Alternative: Azure Speech */}
        <div className="bg-blue-50 border border-blue-300 px-4 py-3 rounded mt-4">
          <h3 className="font-semibold mb-2">🌟 Alternative: Azure Speech API (Best Quality Female Voice)</h3>
          <p className="text-sm mb-2">
            <strong>Female voice:</strong> vi-VN-HoaiMyNeural (same name as Windows voice, but better quality)
          </p>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li><strong>Free tier:</strong> 500,000 characters/month (enough for most uses)</li>
            <li><strong>Quality:</strong> Neural voice, very natural</li>
            <li><strong>Setup time:</strong> 10 minutes</li>
            <li><strong>Get API key:</strong> https://portal.azure.com (free account)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
