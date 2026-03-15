import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useStory } from '../context/StoryContext';
import { generateStorySegment, checkContinuity } from '../services/ai';
import { setBackgroundTimeout, clearBackgroundTimeout } from '../utils/workerTimer';
import { Download, BookOpen, Loader2, Pause, Play, Save, Zap, AlertTriangle, CheckCircle, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

export default function Generator() {
  const { state, updateState, addContinuityFlag, removeContinuityFlag } = useStory();
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [runInBackground, setRunInBackground] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const MAX_RETRIES = 3;

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.generatedContent]);

  // Auto-generation loop
  useEffect(() => {
    let timeoutId: any;

    const generateLoop = async () => {
      if (!isAutoGenerating || isGenerating) return;

      if (state.currentChapterIndex >= state.outline.length) {
        setIsAutoGenerating(false);
        alert("Story generation complete!");
        return;
      }

      setIsGenerating(true);
      try {
        // Get all previous content for context
        const previousContent = state.generatedContent.map(c => c.content).join('\n\n');
        
        const targetChapterIndex = state.currentChapterIndex;
        const targetChapter = state.outline[targetChapterIndex];

        const segment = await generateStorySegment(
          {
            title: state.title,
            synopsis: state.synopsis,
            characters: state.characters,
            outline: state.outline,
            genres: state.genres,
            authorStyles: state.authorStyles,
            authorName: state.authorName,
            pageCount: state.pageCount
          },
          targetChapterIndex,
          previousContent
        );

        // Check for continuity errors
        const previousChaptersSummary = state.outline
          .slice(0, targetChapterIndex)
          .map((ch, idx) => `Chapter ${idx + 1}: ${ch.summary}`)
          .join('\n');

        const flags = await checkContinuity(
          segment,
          state.characters,
          targetChapterIndex,
          previousChaptersSummary
        );

        // Check if we already have content for this chapter
        const existingChapterContentIndex = state.generatedContent.findIndex(c => c.title === targetChapter.title);
        
        let updatedContent = [...state.generatedContent];
        
        if (existingChapterContentIndex >= 0) {
          updatedContent[existingChapterContentIndex].content += "\n\n" + segment;
        } else {
          updatedContent.push({
            title: targetChapter.title,
            content: segment
          });
        }

        // Move to next chapter after generating one segment per chapter
        // (Simplifying to ensure we cover the whole outline)
        const nextChapterIndex = targetChapterIndex + 1;

        updateState({ 
          generatedContent: updatedContent,
          currentChapterIndex: nextChapterIndex,
          // We can't easily use addContinuityFlag here because we are batching updates
          // So we append to the existing flags in the state
          continuityFlags: [...state.continuityFlags, ...flags]
        });

        // Reset retry count on success
        setRetryCount(0);

      } catch (error) {
        console.error("Generation failed:", error);
        
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          console.log(`Retrying generation (${retryCount + 1}/${MAX_RETRIES})...`);
          // Don't stop auto-generating, just let the loop retry
        } else {
          setIsAutoGenerating(false); // Stop on repeated error
          setRetryCount(0);
          alert("Generation paused due to repeated errors. Please check your connection and try again.");
        }
      } finally {
        setIsGenerating(false);
      }
    };

    if (isAutoGenerating) {
      // Add a small delay between segments to allow UI updates and prevent rate limiting issues
      // Increase delay if we are retrying
      const delay = retryCount > 0 ? 5000 : (runInBackground ? 1000 : 1000);
      
      if (runInBackground) {
        timeoutId = setBackgroundTimeout(generateLoop, delay);
      } else {
        timeoutId = setTimeout(generateLoop, delay);
      }
    }

    return () => {
      if (runInBackground) {
        clearBackgroundTimeout(timeoutId);
      } else {
        clearTimeout(timeoutId);
      }
    };
  }, [isAutoGenerating, isGenerating, state.currentChapterIndex, state.outline, state.generatedContent, state.title, state.synopsis, state.characters, state.genres, state.authorStyles, state.authorName, state.pageCount, updateState, runInBackground, state.continuityFlags, retryCount]);

  const toggleAutoGeneration = () => {
    setIsAutoGenerating(!isAutoGenerating);
  };

  const handleSaveProject = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${state.title || "novel_project"}.novel`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxLineWidth = pageWidth - margin * 2;
    const lineHeight = 7;
    let y = margin;

    // Title Page
    doc.setFont("times", "bold");
    doc.setFontSize(24);
    doc.text(state.title || "Untitled Novel", pageWidth / 2, pageHeight / 3, { align: "center" });
    
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.text(`By ${state.authorName || "NovelCraft AI"}`, pageWidth / 2, pageHeight / 3 + 15, { align: "center" });
    
    if (state.synopsis) {
        doc.setFontSize(12);
        doc.setFont("times", "italic");
        const synopsisLines = doc.splitTextToSize(state.synopsis, maxLineWidth);
        doc.text(synopsisLines, pageWidth / 2, pageHeight / 2, { align: "center" });
    }

    // Content Pages
    state.generatedContent.forEach((chapter) => {
      doc.addPage();
      y = margin;
      
      doc.setFont("times", "bold");
      doc.setFontSize(18);
      doc.text(chapter.title, margin, y);
      y += lineHeight * 2;
      
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      
      // Clean markdown for PDF
      const cleanContent = chapter.content.replace(/[#*]/g, '');
      const lines = doc.splitTextToSize(cleanContent, maxLineWidth);
      
      lines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
    });
    
    doc.save(`${state.title || "novel"}.pdf`);
  };

  const currentChapter = state.outline[state.currentChapterIndex];
  const progress = Math.min(100, (state.currentChapterIndex / state.outline.length) * 100);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-20 flex gap-8">
        {/* Sidebar */}
        <div className="hidden lg:flex flex-col w-80 shrink-0 sticky top-8 h-[calc(100vh-4rem)] border-r border-stone-200 pr-4 gap-6 overflow-hidden">
          
          {/* Outline Section */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <h3 className="font-serif font-bold text-lg text-stone-800 mb-4 sticky top-0 bg-white z-10 py-2">Outline</h3>
            <div className="space-y-3">
              {state.outline.map((chapter, idx) => {
                const isActive = idx === state.currentChapterIndex;
                const isCompleted = idx < state.currentChapterIndex;
                return (
                  <div 
                    key={chapter.id}
                    className={`p-3 rounded-lg text-sm transition-colors ${
                      isActive 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 shadow-sm' 
                        : isCompleted
                          ? 'text-stone-400 bg-stone-50'
                          : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold ${isActive ? 'text-emerald-600' : 'text-stone-400'}`}>
                        CH {idx + 1}
                      </span>
                      {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                    </div>
                    <p className="font-medium leading-tight">{chapter.title}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Continuity Flags Section */}
          <div className="flex-1 overflow-y-auto min-h-0 border-t border-stone-200 pt-4">
            <h3 className="font-serif font-bold text-lg text-stone-800 mb-4 sticky top-0 bg-white z-10 py-2 flex items-center gap-2">
              Continuity Checks
              {state.continuityFlags.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                  {state.continuityFlags.length}
                </span>
              )}
            </h3>
            
            {state.continuityFlags.length === 0 ? (
              <div className="text-stone-400 text-sm italic flex items-center gap-2 p-4 bg-stone-50 rounded-lg">
                <CheckCircle size={16} />
                No issues detected.
              </div>
            ) : (
              <div className="space-y-3">
                {state.continuityFlags.map((flag) => (
                  <div key={flag.id} className={`p-3 rounded-lg text-sm border ${
                    flag.severity === 'high' ? 'bg-red-50 border-red-200' :
                    flag.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={14} className={
                          flag.severity === 'high' ? 'text-red-600' :
                          flag.severity === 'medium' ? 'text-amber-600' :
                          'text-blue-600'
                        } />
                        <span className="font-bold text-xs uppercase tracking-wider opacity-70">
                          {flag.severity} Priority
                        </span>
                      </div>
                      <button 
                        onClick={() => removeContinuityFlag(flag.id)}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="font-medium text-stone-800 mb-1">{flag.description}</p>
                    <p className="text-xs text-stone-500 italic border-l-2 border-stone-300 pl-2 my-1">
                      "{flag.snippet}"
                    </p>
                    <div className="text-xs text-stone-400 mt-2">
                      Ch {flag.chapterIndex + 1} • {state.characters.find(c => c.id === flag.characterId)?.name || "General"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 sticky top-0 bg-stone-50 py-4 z-10 border-b border-stone-200 gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-serif font-bold text-stone-900 truncate">
              {state.title || "Untitled Story"}
            </h2>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <span className="truncate">
                {state.currentChapterIndex >= state.outline.length 
                  ? "Completed" 
                  : `Writing: ${currentChapter?.title || "..."}`}
              </span>
              <div className="w-24 h-2 bg-stone-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-end items-center">
            <label className="flex items-center gap-1.5 mr-2 cursor-pointer text-sm font-medium text-stone-600 hover:text-stone-900 select-none bg-white px-3 py-2 rounded-lg border border-stone-200 shadow-sm transition-colors" title="Keep generating even when tab is in background">
              <input
                type="checkbox"
                checked={runInBackground}
                onChange={(e) => setRunInBackground(e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500"
              />
              <Zap size={14} className={runInBackground ? "text-amber-500 fill-amber-500" : "text-stone-400"} />
              <span className="hidden sm:inline">Background Mode</span>
            </label>

            <button
              onClick={handleSaveProject}
              className="p-2 text-stone-600 hover:bg-stone-200 rounded-lg border border-stone-300 bg-white"
              title="Save Project"
            >
              <Save size={20} />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-2 text-stone-600 hover:bg-stone-200 rounded-lg border border-stone-300 bg-white"
              title="Download PDF"
            >
              <Download size={20} />
            </button>
            
            <button
              onClick={toggleAutoGeneration}
              disabled={state.currentChapterIndex >= state.outline.length}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all shadow-sm ${
                isAutoGenerating 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200' 
                  : 'bg-stone-900 text-white hover:bg-stone-800'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAutoGenerating ? (
                <>
                  <Pause size={18} />
                  Pause Writing
                </>
              ) : (
                <>
                  <Play size={18} />
                  {state.generatedContent.length > 0 ? "Resume Writing" : "Start Auto-Write"}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-white min-h-[60vh] p-8 md:p-16 rounded-xl shadow-sm border border-stone-200 font-serif leading-loose text-lg text-stone-800">
          {state.generatedContent.length === 0 ? (
            <div className="text-center text-stone-400 py-20">
              <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-xl font-medium text-stone-500">Ready to write your novel.</p>
              <p className="text-sm mt-2">Click "Start Auto-Write" to begin.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {state.generatedContent.map((chapter, idx) => (
                <div key={idx} className="animate-in fade-in duration-700">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-3xl font-bold text-stone-900">{chapter.title}</h3>
                  </div>
                  <div className="markdown-body prose prose-stone max-w-none prose-lg">
                    <ReactMarkdown>{chapter.content}</ReactMarkdown>
                  </div>
                  {idx < state.generatedContent.length - 1 && (
                    <div className="flex items-center justify-center my-16 opacity-30">
                      <div className="h-px bg-stone-900 w-12"></div>
                      <div className="mx-4 text-2xl">❦</div>
                      <div className="h-px bg-stone-900 w-12"></div>
                    </div>
                  )}
                </div>
              ))}
              {isGenerating && (
                <div className="flex justify-center py-12">
                  <div className="flex flex-col items-center gap-3 text-stone-400 animate-pulse">
                    <Loader2 className="animate-spin" size={32} />
                    <span className="text-sm font-sans uppercase tracking-widest">
                      {retryCount > 0 ? `Retrying (${retryCount}/${MAX_RETRIES})...` : `Writing ${currentChapter?.title}...`}
                    </span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </div>
      </div>
    </div>
    </Layout>
  );
}
