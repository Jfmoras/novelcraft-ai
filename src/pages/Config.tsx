import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStory } from '../context/StoryContext';
import { ArrowRight, Plus, Trash2, Loader2, Upload, FileText } from 'lucide-react';
import { generateStoryBible } from '../services/ai';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { GENRES, PAGE_COUNTS, ALL_CHARACTER_TYPES } from '../constants';

export default function Config() {
  const navigate = useNavigate();
  const { state, updateState, addCharacter, removeCharacter, updateCharacter } = useStory();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tempAuthor, setTempAuthor] = useState('');

  // Local state for character inputs
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [newCharType, setNewCharType] = useState(ALL_CHARACTER_TYPES[0]);

  const handleAddCharacter = () => {
    if (!newCharName.trim()) return;
    addCharacter({
      id: crypto.randomUUID(),
      name: newCharName,
      description: newCharDesc,
      type: newCharType as any,
    });
    setNewCharName('');
    setNewCharDesc('');
    setNewCharType(ALL_CHARACTER_TYPES[0]);
  };

  const handleGenerateBible = async () => {
    setIsAnalyzing(true);
    try {
      const bible = await generateStoryBible({
        mode: state.mode,
        genres: state.genres,
        authorStyles: state.authorStyles,
        authorName: state.authorName,
        pageCount: state.pageCount,
        keywords: state.keywords,
        existingCharacters: state.characters,
        draftContent: state.draftContent,
      });

      // Ensure IDs exist and are unique
      const charactersWithIds = bible.characters.map(c => ({ ...c, id: c.id || crypto.randomUUID() }));
      
      // Deduplicate characters by ID to prevent React key errors
      const uniqueCharacters = Array.from(new Map(charactersWithIds.map(c => [c.id, c])).values());

      const outlineWithIds = bible.outline.map(c => ({ ...c, id: c.id || crypto.randomUUID() }));

      updateState({
        title: bible.title,
        synopsis: bible.synopsis,
        characters: uniqueCharacters,
        outline: outlineWithIds,
      });
      
      navigate('/bible');
    } catch (error) {
      console.error("Failed to generate bible:", error);
      alert("Failed to generate story bible. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const readPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      let text = '';
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.name.endsWith('.txt')) {
        text = await file.text();
      } else if (file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        text = await readPdfText(arrayBuffer);
      } else {
        alert("Unsupported file type. Please upload .pdf, .docx, or .txt");
        return;
      }
      
      updateState({ draftContent: text });
    } catch (error) {
      console.error("Failed to read file:", error);
      alert("Failed to read file.");
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-serif font-bold mb-8">
          {state.mode === 'scratch' && 'Start from Scratch'}
          {state.mode === 'structure' && 'Define Structure'}
          {state.mode === 'draft' && 'Import Draft'}
        </h2>

        <div className="space-y-12">
          {/* Common Config */}
          <section className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Genre (Select Multiple)</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map(genre => (
                  <button
                    key={genre}
                    onClick={() => {
                      const newGenres = state.genres.includes(genre)
                        ? state.genres.filter(g => g !== genre)
                        : [...state.genres, genre];
                      updateState({ genres: newGenres });
                    }}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      state.genres.includes(genre)
                        ? 'bg-stone-800 text-white'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Author Name</label>
                <input
                  type="text"
                  value={state.authorName}
                  onChange={(e) => updateState({ authorName: e.target.value })}
                  placeholder="Your Name"
                  className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Author Style</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempAuthor}
                    onChange={(e) => setTempAuthor(e.target.value)}
                    placeholder="e.g. Stephen King"
                    className="flex-1 px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tempAuthor) {
                        updateState({ authorStyles: [...state.authorStyles, tempAuthor] });
                        setTempAuthor('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (tempAuthor) {
                        updateState({ authorStyles: [...state.authorStyles, tempAuthor] });
                        setTempAuthor('');
                      }
                    }}
                    className="p-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {state.authorStyles.map((author, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 text-stone-700 rounded-md text-sm">
                      {author}
                      <button
                        onClick={() => updateState({ authorStyles: state.authorStyles.filter((_, i) => i !== idx) })}
                        className="hover:text-red-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Target Length (Pages)</label>
                <select
                  value={state.pageCount}
                  onChange={(e) => updateState({ pageCount: Number(e.target.value) })}
                  className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-500 focus:outline-none bg-white"
                >
                  {PAGE_COUNTS.map(count => (
                    <option key={count} value={count}>{count} pages (~{count * 275} words)</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Mode Specific Config */}
          {state.mode === 'scratch' && (
            <section>
              <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Story Keywords / Premise</label>
              <textarea
                value={state.keywords}
                onChange={(e) => updateState({ keywords: e.target.value })}
                placeholder="A detective discovers a clock that counts down to crimes before they happen..."
                className="w-full h-32 px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-500 focus:outline-none resize-none"
              />
            </section>
          )}

          {state.mode === 'draft' && (
            <section>
              <label className="block text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Upload Draft (PDF/DOCX)</label>
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center hover:bg-stone-50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-12 h-12 text-stone-400 mb-4" />
                  <span className="text-stone-600 font-medium">Click to upload or drag and drop</span>
                  <span className="text-stone-400 text-sm mt-1">PDF, DOCX, or TXT</span>
                </label>
              </div>
              {state.draftContent && (
                <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
                  <FileText size={20} />
                  Draft loaded successfully
                </div>
              )}
            </section>
          )}

          {(state.mode === 'structure' || state.mode === 'draft') && (
            <section className="space-y-6">
              <div className="border-t border-stone-200 pt-6">
                <h3 className="text-xl font-serif font-bold mb-4">Characters</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <input
                    placeholder="Name"
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-stone-300"
                  />
                  <select
                    value={newCharType}
                    onChange={(e) => setNewCharType(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-stone-300 bg-white"
                  >
                    {ALL_CHARACTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={handleAddCharacter}
                    className="px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700"
                  >
                    Add Character
                  </button>
                </div>
                <textarea
                  placeholder="Character Description..."
                  value={newCharDesc}
                  onChange={(e) => setNewCharDesc(e.target.value)}
                  className="w-full h-20 px-3 py-2 rounded-lg border border-stone-300 mb-4 resize-none"
                />
                
                <div className="space-y-3">
                  {state.characters.map(char => (
                    <div key={char.id} className="flex items-start justify-between p-4 bg-white rounded-lg border border-stone-200 shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800">{char.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-500 rounded-full uppercase tracking-wide">{char.type}</span>
                        </div>
                        <p className="text-sm text-stone-600 mt-1">{char.description}</p>
                      </div>
                      <button
                        onClick={() => removeCharacter(char.id)}
                        className="text-stone-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className="pt-8 flex justify-end">
            <button
              onClick={handleGenerateBible}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Generate Story Bible
                  <ArrowRight />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
