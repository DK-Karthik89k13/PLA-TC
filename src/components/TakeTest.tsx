/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Check, X, Award, BarChart2, Calendar, CornerDownLeft, Eye } from 'lucide-react';
import { Test, User, TestResult } from '../types';

interface TakeTestProps {
  test: Test;
  user: User;
  onCompleted: () => void;
  onClose: () => void;
}

export function TakeTest({ test, user, onCompleted, onClose }: TakeTestProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(test.duration * 60); // in seconds
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState<Array<{ id: string, correctAnswer: number }>>([]);
  const [reviewMode, setReviewMode] = useState(false);

  const [isVm, setIsVm] = useState(false);
  const [vmDetails, setVmDetails] = useState('');

  const answersRef = useRef(answers);
  answersRef.current = answers;
  
  const submittingRef = useRef(submitting);
  submittingRef.current = submitting;

  const resultRef = useRef(result);
  resultRef.current = result;

  const isVmRef = useRef(isVm);
  isVmRef.current = isVm;

  // VM check
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '').toLowerCase();
          const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
          
          const vmKeywords = [
            'virtualbox',
            'vmware',
            'swiftshader',
            'software',
            'mesa',
            'llvmpipe',
            'citrix',
            'hyper-v',
            'parallels',
            'virtual',
            'qemu',
            'xen',
            'microsoft basic render driver'
          ];
          
          const foundKeyword = vmKeywords.find(keyword => vendor.includes(keyword) || renderer.includes(keyword));
          if (foundKeyword) {
            setIsVm(true);
            setVmDetails(`${vendor} / ${renderer}`);
            console.warn('Virtual Machine detected:', vendor, renderer);
          }
        }
      }
    } catch (e) {
      console.error('Error during WebGL VM check:', e);
    }
  }, []);

  // Anti-cheat: auto-submit on tab switch or blur
  useEffect(() => {
    if (result || isVm) return;

    const handleTabViolation = () => {
      if (resultRef.current || submittingRef.current || isVmRef.current) return;
      
      console.warn('Tab switch detected! Auto-submitting the test.');
      alert('Security Violation: Tab switch or window focus loss detected! Your exam is being automatically submitted.');
      
      if (!submittingRef.current) {
        setSubmitting(true);
        setShowConfirmSubmit(false);
        
        fetch(`/api/tests/${test.id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            studentName: user.name,
            username: user.username,
            answers: answersRef.current
          })
        })
        .then(response => {
          if (!response.ok) throw new Error('Failed to submit');
          return response.json();
        })
        .then(data => {
          setResult(data.result);
          setCorrectAnswers(data.correctAnswers);
        })
        .catch(err => {
          console.error('Error on auto-submit:', err);
          alert('Error auto-submitting. The exam session is terminated.');
          onClose();
        })
        .finally(() => {
          setSubmitting(false);
        });
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        handleTabViolation();
      }
    };

    const handleBlur = () => {
      handleTabViolation();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [test.id, user.id, user.name, user.username, result, isVm]);

  // Timer logic
  useEffect(() => {
    if (result) return; // Stop timer if submitted

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, result]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (result) return; // Prevent editing once submitted
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx
    }));
  };

  const handleAutoSubmit = () => {
    console.log('Timer expired! Auto-submitting the test.');
    handleSubmitExam(true);
  };

  const handleSubmitExam = async (forced = false) => {
    if (submitting) return;
    setSubmitting(true);
    setShowConfirmSubmit(false);

    try {
      const response = await fetch(`/api/tests/${test.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          studentName: user.name,
          username: user.username,
          answers
        })
      });

      if (!response.ok) {
        throw new Error('Test submission failed.');
      }

      const data = await response.json();
      setResult(data.result);
      setCorrectAnswers(data.correctAnswers);
    } catch (error) {
      console.error(error);
      alert('Error submitting test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const unattemptedCount = test.questions.length - Object.keys(answers).length;

  // Render Virtual Machine blocking screen if detected
  if (isVm) {
    return (
      <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in fade-in duration-300 my-8">
        <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto text-red-500">
          <AlertTriangle className="h-8 w-8 animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900">Virtual Machine Detected</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            For security and exam integrity, mock placement assessments and prep drills **cannot** be started or taken inside a Virtual Machine or virtualized sandbox environment.
          </p>
        </div>
        
        <div className="p-4 bg-red-50/50 border border-red-100/40 rounded-2xl text-left space-y-1.5 text-xs text-red-800">
          <p className="font-bold uppercase tracking-wider text-[9px] text-red-700">Hardware Detection Log:</p>
          <div className="flex justify-between border-b border-red-100/20 pb-1">
            <span className="opacity-80">Device/Renderer</span>
            <span className="font-semibold truncate max-w-[180px]" title={vmDetails}>{vmDetails || 'Software Graphics'}</span>
          </div>
          <p className="text-[10px] opacity-80 pt-1 leading-normal">
            Please close any hypervisors (VirtualBox, VMware, Parallels, Hyper-V, Windows Sandbox) or disable software-rendering overrides and use your physical device to proceed.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Render Result View
  if (result) {
    const percentage = Math.round((result.score / result.totalQuestions) * 100);
    const passed = percentage >= 60;

    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        {/* Performance Header Card */}
        <div className={`rounded-3xl p-8 border text-white text-center space-y-4 relative overflow-hidden shadow-lg ${
          passed 
            ? 'bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 border-green-500' 
            : 'bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 border-slate-800'
        }`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Award className="h-44 w-44" />
          </div>

          <div className="inline-flex p-3 bg-white/15 rounded-full text-white mb-2">
            <Award className="h-8 w-8" />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-emerald-100 uppercase">Assessment Complete</p>
            <h3 className="text-2xl font-bold font-sans">{test.title}</h3>
            <p className="text-sm opacity-80 max-w-md mx-auto">{test.description}</p>
          </div>

          <div className="py-4 flex items-center justify-center gap-10">
            <div className="text-center">
              <span className="text-4xl font-extrabold block">{result.score} / {result.totalQuestions}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Total Score</span>
            </div>
            <div className="h-10 w-px bg-white/20"></div>
            <div className="text-center">
              <span className="text-4xl font-extrabold block">{percentage}%</span>
              <span className="text-[10px] uppercase tracking-wider text-white/70 font-semibold">Passing (60%)</span>
            </div>
          </div>

          <div className="pt-2">
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
              passed ? 'bg-white text-green-700' : 'bg-white/10 text-slate-100'
            }`}>
              {passed ? 'PROFILED AS READY' : 'PREPARATION SUGGESTED'}
            </span>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-blue-600" /> Question Wise Evaluation & Explanations
            </h4>
            <button
              onClick={() => {
                onCompleted();
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
            >
              Back to Dashboard
            </button>
          </div>

          {test.questions.map((q, idx) => {
            const chosenAnswer = result.answers[q.id];
            const answerKey = correctAnswers.find((k) => k.id === q.id);
            const correctIdx = answerKey ? answerKey.correctAnswer : q.correctAnswer;
            const isCorrect = chosenAnswer !== undefined && chosenAnswer === correctIdx;

            return (
              <div key={q.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question {idx + 1}</span>
                    <p className="text-xs font-bold text-slate-800 leading-relaxed">{q.question}</p>
                  </div>
                  <div className={`p-1 rounded-full ${isCorrect ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, oIdx) => {
                    const isChosen = chosenAnswer !== undefined && chosenAnswer === oIdx;
                    const isAnswerKey = oIdx === correctIdx;

                    let optionStyle = 'border-slate-100 bg-slate-50 text-slate-600';
                    if (isAnswerKey) {
                      optionStyle = 'border-green-200 bg-green-50/70 text-green-800 font-medium';
                    } else if (isChosen && !isCorrect) {
                      optionStyle = 'border-red-200 bg-red-50/70 text-red-800 font-medium';
                    }

                    return (
                      <div key={oIdx} className={`px-3 py-2.5 border rounded-xl flex items-center justify-between ${optionStyle}`}>
                        <span>{opt}</span>
                        {isAnswerKey && <span className="text-[10px] font-bold text-green-700 uppercase">Correct Answer</span>}
                        {isChosen && !isAnswerKey && <span className="text-[10px] font-bold text-red-700 uppercase">Your Choice</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQuestion = test.questions[currentIdx];
  const timerRatio = timeLeft / (test.duration * 60);

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 p-4">
      {/* Question Active Panel */}
      <div className="md:col-span-8 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">{test.category}</span>
              <h4 className="font-bold text-slate-800 text-sm mt-1">{test.title}</h4>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs font-semibold bg-slate-100 px-3 py-1.5 rounded-xl">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className={timeLeft < 60 ? 'text-red-600 animate-pulse' : ''}>{formatTime(timeLeft)}</span>
            </div>
          </div>

          {/* Question Description */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question {currentIdx + 1} of {test.questions.length}</span>
            <p className="text-sm font-bold text-slate-800 leading-relaxed">{currentQuestion.question}</p>
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = answers[currentQuestion.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(currentQuestion.id, idx)}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900 font-medium'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-5 w-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-300 text-slate-400 group-hover:border-slate-400'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Stepper Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-6">
          <button
            onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1 shrink-0"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          {currentIdx === test.questions.length - 1 ? (
            <button
              onClick={() => setShowConfirmSubmit(true)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm shadow-indigo-500/10 shrink-0"
            >
              Submit Exam
            </button>
          ) : (
            <button
              onClick={() => setCurrentIdx((prev) => Math.min(test.questions.length - 1, prev + 1))}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1 shrink-0"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Navigation Details */}
      <div className="md:col-span-4 space-y-6">
        {/* Progress Grid Card */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-4">
          <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Exam Progress</h5>

          {/* Grid list of question index bubbles */}
          <div className="grid grid-cols-5 gap-2">
            {test.questions.map((q, idx) => {
              const isCurrent = currentIdx === idx;
              const isAnswered = answers[q.id] !== undefined;

              let style = 'border-slate-200 text-slate-600 bg-white hover:border-slate-300';
              if (isCurrent) {
                style = 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold';
              } else if (isAnswered) {
                style = 'border-indigo-600 bg-indigo-600 text-white font-medium';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 rounded-xl border text-xs flex items-center justify-center transition-all ${style}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 bg-indigo-600 rounded"></span>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 border border-indigo-600 bg-indigo-50 rounded"></span>
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 border border-slate-200 rounded"></span>
              <span>Unattempted</span>
            </div>
          </div>
        </div>

        {/* Security / Guidance Note */}
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs space-y-2.5 text-amber-800">
          <h6 className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /> Exam Rules & Integrity
          </h6>
          <ul className="list-disc list-inside space-y-1 opacity-90 pl-1">
            <li>Do not switch browser tabs or minimize this window.</li>
            <li>The assessment will auto-submit when the countdown expires.</li>
            <li>Answers are graded instantly upon clicking "Submit Exam".</li>
          </ul>
        </div>
      </div>

      {/* Confirmation Submit Dialog Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-base">Submit Assessment?</h4>
              <p className="text-slate-500 text-xs">Are you sure you want to finalize and submit your test results?</p>
            </div>

            {unattemptedCount > 0 && (
              <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl text-[11px] font-medium border border-amber-100">
                You have left {unattemptedCount} questions unattempted!
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmitExam()}
                disabled={submitting}
                className="py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold rounded-lg text-xs transition-colors shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
