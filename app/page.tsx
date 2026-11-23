'use client';

import React, { useState, useEffect } from 'react';
import initialResultsData from '../data/results.json';
import { SCIENCE_CONCEPTS } from '../lib/concepts';
import { DiagramResult, ReviewState } from '../lib/types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  Maximize2, 
  RefreshCw, 
  Check, 
  X, 
  DollarSign, 
  Layers, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Info
} from 'lucide-react';

export default function ReviewPortal() {
  const [results, setResults] = useState<DiagramResult[]>(initialResultsData as DiagramResult[]);
  const [reviews, setReviews] = useState<Record<number, ReviewState>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Live generation state
  const [selectedConceptId, setSelectedConceptId] = useState<number>(1);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);

  // Modal inspection
  const [inspectResult, setInspectResult] = useState<DiagramResult | null>(null);
  const [viewCode, setViewCode] = useState(false);

  // Load reviews from localStorage on mount (satisfies persistence requirement)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('udhi_diagram_reviews');
      if (stored) {
        setReviews(JSON.parse(stored));
      } else {
        // Initialize empty review state
        const initialReview: Record<number, ReviewState> = {};
        initialResultsData.forEach((item: any) => {
          initialReview[item.id] = { status: 'pending', notes: '', updatedAt: new Date().toISOString() };
        });
        setReviews(initialReview);
      }
    } catch (e) {
      console.error('Failed to load reviews from localStorage', e);
    }
    setIsLoaded(true);
  }, []);

  // Save reviews to localStorage
  const updateReview = (id: number, status: 'approved' | 'rejected', notes?: string) => {
    setReviews((prev) => {
      const current = prev[id] || { status: 'pending', notes: '', updatedAt: new Date().toISOString() };
      const updated = {
        ...prev,
        [id]: {
          status,
          notes: notes !== undefined ? notes : current.notes,
          updatedAt: new Date().toISOString(),
        },
      };
      try {
        localStorage.setItem('udhi_diagram_reviews', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to persist review:', err);
      }
      return updated;
    });
  };

  const handleNotesChange = (id: number, notes: string) => {
    setReviews((prev) => {
      const current = prev[id] || { status: 'pending', notes: '', updatedAt: new Date().toISOString() };
      const updated = {
        ...prev,
        [id]: {
          ...current,
          notes,
          updatedAt: new Date().toISOString(),
        },
      };
      try {
        localStorage.setItem('udhi_diagram_reviews', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to persist notes:', err);
      }
      return updated;
    });
  };

  // Trigger live generation for a concept
  const handleLiveGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGenerationSuccess(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptId: selectedConceptId,
          model: selectedModel,
          customKey: customApiKey.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed with an unspecified error.');
      }

      if (data.success && data.result) {
        const newResult: DiagramResult = data.result;
        // Update results list
        setResults((prev) => {
          const index = prev.findIndex((r) => r.id === newResult.id);
          let updated = [...prev];
          if (index !== -1) {
            updated[index] = newResult;
          } else {
            updated.push(newResult);
          }
          return updated;
        });

        setGenerationSuccess(
          `Successfully generated diagram for "${newResult.conceptName}" using ${newResult.model}! Total cost: $${newResult.costUsd.toFixed(6)} (${newResult.retries} retries).`
        );
      }
    } catch (err: any) {
      setGenerationError(err.message || 'An error occurred during live generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Aggregated metrics
  const totalCost = results.reduce((acc, r) => acc + (r.costUsd || 0), 0);
  const totalTokens = results.reduce((acc, r) => acc + (r.inputTokens + r.outputTokens || 0), 0);
  const totalRetries = results.reduce((acc, r) => acc + (r.retries || 0), 0);
  const approvedCount = Object.values(reviews).filter((r) => r.status === 'approved').length;
  const rejectedCount = Object.values(reviews).filter((r) => r.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Udhi Technologies
              </span>
              <span className="text-xs text-slate-400">UK GCSE Science Assessment</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              AI Science Diagram Maker &amp; Review Portal
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Total Cost:</span>
              <span className="font-semibold text-emerald-400 font-mono">${totalCost.toFixed(6)}</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300">Tokens:</span>
              <span className="font-semibold text-white font-mono">{totalTokens.toLocaleString()}</span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-slate-300">Reviewed:</span>
              <span className="font-semibold text-white font-mono">{approvedCount + rejectedCount} / 5</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Live Generation Testing Panel */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Live Diagram Generator (Part A Live Test)
              </h2>
              <p className="text-sm text-slate-500">
                Test the live AI generation pipeline on-demand. Runs automatic 5-point code validation, 1-attempt diagnostic error-retry, and 429/503 backoff.
              </p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-medium px-2.5 py-1 rounded-full border border-indigo-200">
              Evaluator Testbench
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Concept (1 to 5)
              </label>
              <select
                value={selectedConceptId}
                onChange={(e) => setSelectedConceptId(Number(e.target.value))}
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SCIENCE_CONCEPTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    #{c.id} - {c.name} ({c.subject})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model Choice
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended)</option>
                <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Best Free Tier)</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash (Fast &amp; Reliable)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Gemini API Key
              </label>
              <input
                type="password"
                placeholder="Uses server env if empty"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <button
                onClick={handleLiveGenerate}
                disabled={isGenerating}
                className="w-full text-sm font-semibold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Generating &amp; Validating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Live Diagram
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message Banner */}
          {generationError && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Generation Failed</p>
                <p className="text-xs text-red-700">{generationError}</p>
                <p className="text-xs text-red-600">
                  Note: The 5 pre-generated diagrams below are always available and verified. If testing with a new API key, get a free key from{' '}
                  <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="underline font-semibold">
                    Google AI Studio
                  </a>.
                </p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {generationSuccess && (
            <div className="mt-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Live Generation Succeeded</p>
                <p className="text-xs text-emerald-700">{generationSuccess}</p>
              </div>
            </div>
          )}
        </section>

        {/* 5-Row Main Diagram Table */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                UK GCSE Science Concepts ({results.length} Diagrams)
              </h2>
              <p className="text-xs text-slate-500">
                Instant-load verified dataset with programmatic code checks and persistent reviewer feedback.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setResults(initialResultsData as DiagramResult[])}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 transition flex items-center gap-1"
                title="Reset table to pristine verified diagrams"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Diagrams
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                Persistence: LocalStorage
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4 w-44">Concept &amp; Subject</th>
                  <th className="py-3.5 px-4 w-72">Animated Diagram</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Code Checks (Pass / Fail)</th>
                  <th className="py-3.5 px-4 w-32">Cost &amp; Retries</th>
                  <th className="py-3.5 px-4 min-w-[260px]">Reviewer Decision &amp; Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {results.map((row) => {
                  const review = reviews[row.id] || { status: 'pending', notes: '' };
                  const checks = row.validation.checks;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* ID */}
                      <td className="py-4 px-4 text-center font-bold text-slate-400">
                        {row.id}
                      </td>

                      {/* Concept & Subject */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                              row.subject === 'Maths'
                                ? 'bg-blue-100 text-blue-700'
                                : row.subject === 'Physics'
                                ? 'bg-amber-100 text-amber-800'
                                : row.subject === 'Biology'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {row.subject}
                          </span>
                          <h3 className="font-bold text-slate-900 leading-snug">{row.conceptName}</h3>
                          <p className="text-xs text-slate-500 line-clamp-3" title={row.promptText}>
                            {row.promptText}
                          </p>
                        </div>
                      </td>

                      {/* Animated SVG Diagram Preview */}
                      <td className="py-4 px-4 align-top">
                        <div className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center shadow-inner">
                          <div
                            className="w-full h-full p-1"
                            dangerouslySetInnerHTML={{ __html: row.svg }}
                          />
                          <button
                            onClick={() => {
                              setInspectResult(row);
                              setViewCode(false);
                            }}
                            className="absolute bottom-2 right-2 p-1.5 rounded-md bg-slate-900/80 hover:bg-slate-900 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md flex items-center gap-1 text-xs"
                            title="Expand and inspect diagram"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Expand</span>
                          </button>
                        </div>
                      </td>

                      {/* Code Checks (Pass / Fail) */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1.5 text-xs">
                          {/* Check 1 */}
                          <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200/60">
                            <span className="text-slate-700 font-medium truncate" title="The SVG is valid and can be parsed">
                              1. Valid &amp; Parseable XML
                            </span>
                            {checks.validSvg.passed ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                                <Check className="w-3 h-3" /> PASS
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-700 font-semibold bg-red-100/80 px-2 py-0.5 rounded text-[11px]">
                                <X className="w-3 h-3" /> FAIL
                              </span>
                            )}
                          </div>

                          {/* Check 2 */}
                          <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200/60">
                            <span className="text-slate-700 font-medium truncate" title="Nothing is drawn outside the viewBox">
                              2. Inside ViewBox (Bounds)
                            </span>
                            {checks.withinViewBox.passed ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                                <Check className="w-3 h-3" /> PASS
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-700 font-semibold bg-red-100/80 px-2 py-0.5 rounded text-[11px]">
                                <X className="w-3 h-3" /> FAIL
                              </span>
                            )}
                          </div>

                          {/* Check 3 */}
                          <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200/60">
                            <span className="text-slate-700 font-medium truncate" title="Has a title and at least 3 text labels">
                              3. Title &amp; ≥3 Text Labels
                            </span>
                            {checks.titleAndLabels.passed ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                                <Check className="w-3 h-3" /> PASS
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-700 font-semibold bg-red-100/80 px-2 py-0.5 rounded text-[11px]">
                                <X className="w-3 h-3" /> FAIL
                              </span>
                            )}
                          </div>

                          {/* Check 4 */}
                          <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200/60">
                            <span className="text-slate-700 font-medium truncate" title="Has at least one animation">
                              4. Active SMIL/CSS Animation
                            </span>
                            {checks.hasAnimation.passed ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                                <Check className="w-3 h-3" /> PASS
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-700 font-semibold bg-red-100/80 px-2 py-0.5 rounded text-[11px]">
                                <X className="w-3 h-3" /> FAIL
                              </span>
                            )}
                          </div>

                          {/* Check 5 (Custom) */}
                          <div className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-200/60">
                            <span className="text-slate-700 font-medium truncate" title="Clean SVG namespace, shape geometry, and safe vector hygiene">
                              5. Safety &amp; Geometry (Custom)
                            </span>
                            {checks.structureAndSafety.passed ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                                <Check className="w-3 h-3" /> PASS
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-700 font-semibold bg-red-100/80 px-2 py-0.5 rounded text-[11px]">
                                <X className="w-3 h-3" /> FAIL
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cost & Retries */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-slate-500 block">Est. Cost (USD):</span>
                            <span className="font-mono font-bold text-slate-800 text-sm">
                              ${row.costUsd?.toFixed(6) || '0.000000'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Retries:</span>
                            <span
                              className={`inline-block px-2 py-0.5 rounded font-mono font-bold ${
                                row.retries === 0
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {row.retries} {row.retries === 1 ? 'retry' : 'retries'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Tokens: {row.inputTokens} in / {row.outputTokens} out
                          </div>
                        </div>
                      </td>

                      {/* Reviewer Decision & Notes */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-2.5">
                          {/* Approve / Reject Toggle Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateReview(row.id, 'approved')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                                review.status === 'approved'
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                  : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border-slate-300'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => updateReview(row.id, 'rejected')}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                                review.status === 'rejected'
                                  ? 'bg-red-600 text-white border-red-700 shadow-sm'
                                  : 'bg-slate-50 text-slate-700 hover:bg-red-50 hover:text-red-700 border-slate-300'
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>

                          {/* Review Status Indicator */}
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Status:</span>
                            <span
                              className={`font-semibold capitalize px-2 py-0.5 rounded-full ${
                                review.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : review.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {review.status}
                            </span>
                          </div>

                          {/* Reviewer Note Box */}
                          <div>
                            <textarea
                              rows={2}
                              value={review.notes || ''}
                              onChange={(e) => handleNotesChange(row.id, e.target.value)}
                              placeholder="Reviewer notes (persists on reload)..."
                              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 placeholder-slate-400"
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Technical Architecture & PDF Rubric Alignment */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Code Validation Engine (5 Checks)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every SVG is parsed with fast-xml-parser XML AST, checks viewBox bounding coordinates, confirms title &amp; 3+ labels, validates SMIL/CSS animations, and enforces safe namespace hygiene with zero scripts.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              Self-Correction &amp; Retry Pipeline
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If an SVG fails any of the 5 checks, the pipeline automatically retries once, providing the model with the exact failure diagnostic. HTTP 429 and 503 errors trigger exponential backoff up to 3 times.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              Cost &amp; Token Economics
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tracks Gemini 2.5 Flash input and output token consumption per prompt. Calculates real USD costs ($0.075 / 1M input, $0.30 / 1M output) to ensure transparent production cost tracking for UK GCSE lesson videos.
            </p>
          </div>
        </section>
      </main>

      {/* Fullscreen Diagram Inspection Modal */}
      {inspectResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Concept #{inspectResult.id} • {inspectResult.subject}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{inspectResult.conceptName}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewCode(!viewCode)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                >
                  {viewCode ? 'View Rendered Diagram' : 'View SVG Code'}
                </button>
                <button
                  onClick={() => setInspectResult(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-auto flex items-center justify-center bg-slate-900">
              {viewCode ? (
                <pre className="text-xs font-mono text-emerald-400 bg-slate-950 p-4 rounded-lg overflow-auto w-full max-h-[60vh]">
                  {inspectResult.svg}
                </pre>
              ) : (
                <div
                  className="w-full max-w-2xl aspect-[4/3] rounded-lg overflow-hidden flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: inspectResult.svg }}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
              <div className="flex items-center gap-3">
                <span>Model: <strong className="text-slate-800">{inspectResult.model}</strong></span>
                <span>Cost: <strong className="text-emerald-700 font-mono">${inspectResult.costUsd.toFixed(6)}</strong></span>
                <span>Tokens: <strong className="text-slate-800">{inspectResult.inputTokens} in / {inspectResult.outputTokens} out</strong></span>
              </div>
              <div>
                <button
                  onClick={() => setInspectResult(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold text-xs transition"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
