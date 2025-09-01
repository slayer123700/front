// frontend/src/App.jsx
import React, { useState, useRef, useEffect } from 'react';

export default function App() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I’m your AI assistant. I can search, read files, and listen to your voice. Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = '';

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data:') && !line.includes('[DONE]')) {
            try {
              const json = JSON.parse(line.slice(5));
              const token = json.choices[0]?.delta?.content || '';
              reply += token;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].content = reply;
                return updated;
              });
            } catch (e) { }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Failed to connect. Check backend or API key.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      const msg = `I've read your file: ${file.name}. Here's what it says:\n\n"${data.text}"\n\nAsk me questions about it!`;
      setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '❌ Failed to read file.' }
      ]);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
      {/* Header */}
      <header className={`p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-500">AI Assistant</h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
          >
            {darkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl px-4 py-2 rounded-lg shadow ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : darkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className={`px-4 py-2 rounded-lg shadow ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className="text-gray-500">🧠 Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 border-t`}>
        <div className="flex flex-col space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className={`flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white'
              }`}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>

          <div className="flex space-x-2">
            <label className="flex-1">
              <input type="file" onChange={handleFileUpload} className="hidden" />
              <button
                type="button"
                className="w-full py-2 text-sm border rounded bg-gray-100 hover:bg-gray-200"
              >
                📎 Upload File (PDF/DOCX/TXT)
              </button>
            </label>

            <button
              type="button"
              onClick={startListening}
              disabled={isListening}
              className={`px-4 py-2 text-sm rounded ${isListening ? 'bg-red-500' : 'bg-green-500'} text-white`}
            >
              {isListening ? '🔴 Listening...' : '🎤 Speak'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
