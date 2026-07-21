/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2, ArrowRight, BrainCircuit } from 'lucide-react';
import { AI_PROVIDERS, AiProvider, DEFAULT_PROVIDER, getDefaultModelForProvider } from '../aiModels';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_PROMPTS = [
  { label: 'Resume Guide', query: 'Can you give me a template and checklist for a computer science resume?' },
  { label: 'Aptitude Secrets', query: 'What are the top aptitude short tricks and mathematical shortcuts for placement exams?' },
  { label: 'Behavioral Prep', query: 'How do I answer "Tell me about a time you faced a technical challenge" using the STAR method?' },
  { label: 'System Design Basic', query: 'What are the key topics I should study for entry-level system design rounds?' }
];

export function PlacementCoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am **Placement Coach Pro**, your digital career mentor. Ask me anything about engineering resume checklists, active company interview styles, mock tests, behavioral formats, or technical concepts. I'm here to help you secure your dream offer!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>(DEFAULT_PROVIDER);
  const [aiModel, setAiModel] = useState<string>(getDefaultModelForProvider(DEFAULT_PROVIDER));
  const [showModelPicker, setShowModelPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    setInput('');
    const updatedMessages: Message[] = [...messages, { role: 'user', content: query }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, provider: aiProvider, model: aiModel })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reply from server');
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I apologize, but I am having difficulty connecting to my servers right now. Please verify your connection or retry in a few seconds."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 p-4 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white/10 p-1.5 rounded-lg">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Placement Coach Pro</h4>
            <p className="text-[10px] text-indigo-100">
              Powered by {AI_PROVIDERS.find((p) => p.id === aiProvider)?.label} • Always Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowModelPicker((v) => !v)}
            title="Choose AI model"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <BrainCircuit className="h-4 w-4 text-white" />
          </button>
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
        </div>
      </div>

      {showModelPicker && (
        <div className="p-3 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">AI Provider</label>
            <select
              value={aiProvider}
              onChange={(e) => {
                const provider = e.target.value as AiProvider;
                setAiProvider(provider);
                setAiModel(getDefaultModelForProvider(provider));
              }}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Model</label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {AI_PROVIDERS.find((p) => p.id === aiProvider)?.models.map((m) => (
                <option key={m.id} value={m.id} title={m.description}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div className={`p-2 rounded-lg shrink-0 h-8 w-8 flex items-center justify-center ${
              m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-indigo-600'
            }`}>
              {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`rounded-2xl p-3.5 text-xs text-slate-700 leading-relaxed space-y-2 shadow-sm ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-tr-none'
                : 'bg-white border border-slate-100 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="p-2 rounded-lg bg-white border border-slate-100 text-indigo-600 h-8 w-8 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 text-xs text-slate-400 flex items-center gap-2 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Analyzing profile and brainstorming response...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick suggestions */}
      {messages.length === 1 && (
        <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Frequently Asked Prep Queries:</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp.query)}
                className="p-2 text-left bg-white hover:bg-indigo-50/50 border border-slate-100 rounded-xl text-[11px] text-slate-600 hover:text-indigo-700 transition-all font-medium flex items-center justify-between group"
              >
                <span className="truncate mr-1">{qp.label}</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 text-indigo-600 shrink-0 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question (e.g. 'How do I pass Google's technical round?')..."
          className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-700"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl transition-all shadow-sm"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
