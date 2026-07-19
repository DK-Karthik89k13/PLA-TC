/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Mail, Phone, MapPin } from 'lucide-react';
import { PlacementDrive } from '../types';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && message) {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setName('');
        setEmail('');
        setMessage('');
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-xl font-bold">Contact Training & Placement Cell</h3>
          <p className="text-blue-100 text-sm mt-1">We are here to assist with your career prep and recruitment needs.</p>
        </div>

        <div className="p-6 space-y-6">
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="inline-flex p-3 bg-green-50 rounded-full text-green-600">
                <Mail className="h-8 w-8 animate-bounce" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 font-sans">Query Received!</h4>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Thank you for contacting us. A Placement Officer will review your query and reply within 24 working hours.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-5 space-y-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-800 text-xs uppercase tracking-wider">Office Details</div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <span>Block C, Ground Floor, Central University Campus</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-blue-600 shrink-0" />
                  <span>+1 (555) 019-2834</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-blue-600 shrink-0" />
                  <span>placement@university.edu</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400">Hours: Mon-Fri, 9:00 AM - 5:00 PM</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="md:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Smith"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@student.edu"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Your Message / Query</label>
                  <textarea
                    rows={3}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask about drive eligibilities, upcoming tests, or mock evaluations..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-all shadow-md shadow-blue-500/10"
                >
                  Send Inquiry
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


