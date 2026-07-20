/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, Cpu, ListOrdered, Calendar, UploadCloud, FileText, X } from 'lucide-react';
import { Test } from '../types';

interface AiTestGeneratorProps {
  onTestCreated: () => void;
}

const LOADING_STEPS = [
  'Contacting corporate recruitment advisor models...',
  'Generating realistic multiple-choice questions...',
  'Formulating clever distractor options and explanations...',
  'Checking answer keys for logical consistency...',
  'Structuring mock assessment and saving to university DB...'
];

export function AiTestGenerator({ onTestCreated }: AiTestGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('Technical');
  const [difficulty, setDifficulty] = useState('Medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [successTest, setSuccessTest] = useState<Test | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Document Upload States
  const [generationMode, setGenerationMode] = useState<'topic' | 'document'>('topic');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [base64Data, setBase64Data] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileChange = (file: File) => {
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.docx', '.pdf', '.xls', '.xlsx', '.json', '.txt', '.csv'];
    if (!allowed.includes(ext)) {
      setError('Invalid file format. Please upload .docx, .pdf, .xls, .xlsx, .json, .txt, or .csv.');
      setUploadedFile(null);
      setBase64Data('');
      return;
    }
    setError(null);
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        setBase64Data(base64);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setStepIdx(0);
    setError(null);
    setSuccessTest(null);

    try {
      const response = await fetch('/api/tests/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          category,
          difficulty,
          numQuestions
        })
      });

      if (!response.ok) {
        throw new Error('AI generation service returned an error. Try again.');
      }

      const data = await response.json();
      setSuccessTest(data.test);
      setTopic('');
      onTestCreated();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while generating the test.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile || !base64Data) return;

    setLoading(true);
    setStepIdx(0);
    setError(null);
    setSuccessTest(null);

    try {
      const response = await fetch('/api/tests/generate-from-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: uploadedFile.name,
          fileData: base64Data,
          category,
          difficulty,
          numQuestions
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate test from document.');
      }

      const data = await response.json();
      setSuccessTest(data.test);
      setUploadedFile(null);
      setBase64Data('');
      onTestCreated();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong while generating the test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-950 rounded-2xl shadow-xl p-6 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
        <Cpu className="h-44 w-44" />
      </div>

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-300">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-base">Gemini AI Test Builder</h4>
            <p className="text-indigo-200 text-xs">Instantly generate high-quality mcqs for placement preparation.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold tracking-wide text-indigo-100">Generating Questions...</p>
              <p className="text-xs text-indigo-300 animate-pulse">{LOADING_STEPS[stepIdx]}</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 max-w-xs mx-auto overflow-hidden">
              <div 
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" 
                style={{ width: `${((stepIdx + 1) / LOADING_STEPS.length) * 100}%` }}
              ></div>
            </div>
          </div>
        ) : successTest ? (
          <div className="bg-indigo-950/40 border border-indigo-800/50 p-5 rounded-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-sm text-green-300">Test Created Successfully!</h5>
                <p className="text-xs text-indigo-200 mt-1">Students can now take this assessment from their student dashboard tab.</p>
              </div>
            </div>

            <div className="p-3 bg-indigo-900/40 rounded-lg text-xs space-y-2 border border-indigo-800/30">
              <p className="font-semibold text-slate-100 text-sm">{successTest.title}</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">{successTest.description}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-indigo-300 pt-1 border-t border-indigo-800/40">
                <span className="flex items-center gap-1"><ListOrdered className="h-3 w-3" /> {successTest.questions.length} Questions</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Duration: {successTest.duration} mins</span>
                <span className="bg-indigo-800/80 px-2 py-0.5 rounded-full text-[10px] text-white font-medium">{successTest.category}</span>
              </div>
            </div>

            <button
              onClick={() => setSuccessTest(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-colors"
            >
              Generate Another Test
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode selection tabs */}
            <div className="flex border-b border-indigo-950/40 pb-4 mb-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGenerationMode('topic');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  generationMode === 'topic' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-slate-800/40 text-indigo-200 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                Assemble by Topic
              </button>
              <button
                type="button"
                onClick={() => {
                  setGenerationMode('document');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  generationMode === 'document' 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-slate-800/40 text-indigo-200 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                Extract from Document
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {generationMode === 'topic' ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-indigo-200">Topic / Focus Area</label>
                    <input
                      type="text"
                      required
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Python OOP, Aptitude Profit & Loss, Logic Puzzles"
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs text-white placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-indigo-200">Assessment Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs text-white"
                    >
                      <option value="Technical">Technical (Coding/Computer Science)</option>
                      <option value="Aptitude">Aptitude (Quantitative/Math)</option>
                      <option value="Verbal">Verbal (English/Communication)</option>
                      <option value="Logical">Logical (Puzzles/Reasoning)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-indigo-200">Difficulty Target</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs text-white"
                    >
                      <option value="Easy">Entry Level (Easy)</option>
                      <option value="Medium">Standard Assessment (Medium)</option>
                      <option value="Hard">Advanced / FAANG Drill (Hard)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-indigo-200">Number of Questions ({numQuestions})</label>
                    <input
                      type="range"
                      min="3"
                      max="100"
                      step="1"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400 mt-3"
                    />
                    <div className="flex justify-between text-[10px] text-indigo-300 px-1">
                      <span>3 MCQs</span>
                      <span>5 MCQs</span>
                      <span>10 MCQs</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!topic.trim()}
                  className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Cpu className="h-4 w-4" /> Assemble Test Questions
                </button>
              </form>
            ) : (
              <form onSubmit={handleFileUploadSubmit} className="space-y-4">
                {/* Drag and Drop area */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center relative ${
                    isDragging 
                      ? 'border-indigo-400 bg-indigo-950/50 scale-[1.01]' 
                      : uploadedFile 
                      ? 'border-green-500/40 bg-green-950/10' 
                      : 'border-indigo-800/60 hover:border-indigo-600 bg-slate-800/20'
                  }`}
                >
                  <input
                    type="file"
                    id="file-upload-input"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".docx,.pdf,.xls,.xlsx,.json,.txt,.csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                  
                  {uploadedFile ? (
                    <div className="flex flex-col items-center gap-2 relative z-10">
                      <div className="bg-green-500/20 p-2.5 rounded-xl text-green-400">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="max-w-[280px]">
                        <p className="text-xs font-bold text-slate-100 truncate">{uploadedFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setUploadedFile(null);
                          setBase64Data('');
                        }}
                        className="mt-1.5 px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 hover:border-red-700/60 rounded-lg text-[10px] font-bold text-red-200 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" /> Remove File
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">Drag & drop or <span className="text-indigo-400 hover:underline">browse</span></p>
                        <p className="text-[10px] text-indigo-300 mt-1">Accepts PDF, DOCX, XLS/XLSX, JSON, TXT, and CSV files</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-indigo-200">Assessment Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs text-white"
                    >
                      <option value="Technical">Technical (Coding/Computer Science)</option>
                      <option value="Aptitude">Aptitude (Quantitative/Math)</option>
                      <option value="Verbal">Verbal (English/Communication)</option>
                      <option value="Logical">Logical (Puzzles/Reasoning)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-indigo-200">Difficulty Target</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-xs text-white"
                    >
                      <option value="Easy">Entry Level (Easy)</option>
                      <option value="Medium">Standard Assessment (Medium)</option>
                      <option value="Hard">Advanced / FAANG Drill (Hard)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-indigo-200">Number of Questions ({numQuestions})</label>
                  <input
                    type="range"
                    min="3"
                    max="100"
                    step="1"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-400 mt-3"
                  />
                  <div className="flex justify-between text-[10px] text-indigo-300 px-1">
                    <span>3 MCQs</span>
                    <span>5 MCQs</span>
                    <span>10 MCQs</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!uploadedFile || !base64Data}
                  className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-950/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Cpu className="h-4 w-4" /> Extract & Build Assessment
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
