import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useStory, Character, ChapterOutline } from '../context/StoryContext';
import { ArrowRight, Plus, Trash2, Edit2, Save, X, Sparkles, RefreshCw } from 'lucide-react';
import { CHARACTER_ARCHETYPES } from '../constants';
import { generateCharacterDescription, updateSynopsisWithCharacter } from '../services/ai';

export default function BibleReview() {
  const navigate = useNavigate();
  const { state, updateState, updateCharacter, removeCharacter, addCharacter, setOutline } = useStory();
  
  // Local state for editing
  const [editingCharId, setEditingCharId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);

  // New item states
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterSummary, setNewChapterSummary] = useState('');

  // New Character State
  const [isAddingCharacter, setIsAddingCharacter] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharType, setNewCharType] = useState(Object.values(CHARACTER_ARCHETYPES)[0][0]);
  const [newCharDesc, setNewCharDesc] = useState('');
  const [isGeneratingChar, setIsGeneratingChar] = useState(false);
  const [isUpdatingSynopsis, setIsUpdatingSynopsis] = useState(false);
  const [characterFilter, setCharacterFilter] = useState<string>('All');

  const filteredCharacters = characterFilter === 'All' 
    ? state.characters 
    : state.characters.filter(c => c.type === characterFilter);

  const uniqueCharacterTypes = ['All', ...Array.from(new Set(state.characters.map(c => c.type)))];

  const handleStartWriting = () => {
    navigate('/generator');
  };

  const handleAddChapter = () => {
    if (!newChapterTitle.trim()) return;
    const newChapter: ChapterOutline = {
      id: crypto.randomUUID(),
      title: newChapterTitle,
      summary: newChapterSummary
    };
    setOutline([...state.outline, newChapter]);
    setNewChapterTitle('');
    setNewChapterSummary('');
    setIsAddingChapter(false);
  };

  const handleRemoveChapter = (id: string) => {
    setOutline(state.outline.filter(c => c.id !== id));
  };

  const handleGenerateCharDesc = async () => {
    if (!newCharName || !newCharType) {
      alert("Please enter a name and select a type first.");
      return;
    }
    setIsGeneratingChar(true);
    try {
      const desc = await generateCharacterDescription(
        state.synopsis || state.keywords,
        newCharName,
        newCharType,
        state.genres,
        state.authorStyles
      );
      setNewCharDesc(desc);
    } catch (error) {
      console.error("Failed to generate description", error);
    } finally {
      setIsGeneratingChar(false);
    }
  };

  const handleAddCharacter = async () => {
    if (!newCharName.trim()) return;
    
    const newChar: Character = {
      id: crypto.randomUUID(),
      name: newCharName,
      description: newCharDesc,
      type: newCharType as any
    };

    addCharacter(newChar);

    // Ask to update synopsis
    if (window.confirm("Character added! Do you want to update the story synopsis to incorporate this new character?")) {
      setIsUpdatingSynopsis(true);
      try {
        const newSynopsis = await updateSynopsisWithCharacter(state.synopsis, newChar);
        updateState({ synopsis: newSynopsis });
      } catch (error) {
        console.error("Failed to update synopsis", error);
      } finally {
        setIsUpdatingSynopsis(false);
      }
    }

    setNewCharName('');
    setNewCharDesc('');
    setIsAddingCharacter(false);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-serif font-bold text-stone-900">Story Bible</h2>
          <button
            onClick={handleStartWriting}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-xl font-medium hover:bg-emerald-800 transition-all shadow-md"
          >
            Start Writing
            <ArrowRight size={20} />
          </button>
        </div>

        <div className="space-y-12">
          {/* Synopsis Section */}
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 relative">
            <h3 className="text-xl font-serif font-bold mb-4 text-stone-800">Synopsis</h3>
            {isUpdatingSynopsis && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-2xl">
                <div className="flex items-center gap-2 text-stone-800 font-medium">
                  <RefreshCw className="animate-spin" /> Updating Synopsis...
                </div>
              </div>
            )}
            <p className="text-stone-600 leading-relaxed italic whitespace-pre-wrap">
              {state.synopsis || state.keywords || "No synopsis generated yet."}
            </p>
          </section>

          {/* Characters Section */}
          <section>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <h3 className="text-xl font-serif font-bold text-stone-800">Characters</h3>
              <div className="flex items-center gap-4">
                <select
                  value={characterFilter}
                  onChange={(e) => setCharacterFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-sm text-stone-600"
                >
                  {uniqueCharacterTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <span className="text-sm text-stone-500">{filteredCharacters.length} characters</span>
                <button 
                  onClick={() => setIsAddingCharacter(true)}
                  className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 px-3 py-1.5 rounded-lg"
                >
                  <Plus size={16} /> Add Character
                </button>
              </div>
            </div>

            {isAddingCharacter && (
              <div className="mb-6 bg-stone-50 p-6 rounded-xl border-2 border-dashed border-stone-300">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Name</label>
                    <input
                      value={newCharName}
                      onChange={(e) => setNewCharName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300"
                      placeholder="Character Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Archetype / Role</label>
                    <select
                      value={newCharType}
                      onChange={(e) => setNewCharType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white"
                    >
                      {Object.entries(CHARACTER_ARCHETYPES).map(([category, types]) => (
                        <optgroup key={category} label={category}>
                          {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-stone-500 uppercase">Description</label>
                    <button
                      onClick={handleGenerateCharDesc}
                      disabled={isGeneratingChar || !newCharName}
                      className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                    >
                      <Sparkles size={12} />
                      {isGeneratingChar ? 'Generating...' : 'Generate with AI'}
                    </button>
                  </div>
                  <textarea
                    value={newCharDesc}
                    onChange={(e) => setNewCharDesc(e.target.value)}
                    className="w-full h-24 px-3 py-2 rounded-lg border border-stone-300 resize-none"
                    placeholder="Character description..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingCharacter(false)}
                    className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCharacter}
                    className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                  >
                    Add Character
                  </button>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {filteredCharacters.map(char => (
                <div key={char.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-lg text-stone-900">{char.name}</h4>
                      <span className="text-xs font-medium px-2 py-1 bg-stone-100 text-stone-600 rounded-full uppercase tracking-wider">
                        {char.type}
                      </span>
                    </div>
                    <button onClick={() => removeCharacter(char.id)} className="text-stone-400 hover:text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <p className="text-stone-600 text-sm mt-3">{char.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Outline Section */}
          <section>
             <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif font-bold text-stone-800">Chapter Outline</h3>
              <button 
                onClick={() => setIsAddingChapter(true)}
                className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-900"
              >
                <Plus size={16} /> Add Chapter
              </button>
            </div>

            <div className="space-y-4">
              {state.outline.map((chapter, index) => (
                <div key={chapter.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm relative group">
                  <div className="absolute -left-3 top-6 w-6 h-6 bg-stone-200 rounded-full flex items-center justify-center text-xs font-bold text-stone-600 border-2 border-stone-50">
                    {index + 1}
                  </div>
                  
                  <div className="ml-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-lg text-stone-900 mb-2">{chapter.title}</h4>
                      <button onClick={() => handleRemoveChapter(chapter.id)} className="text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="text-stone-600 text-sm leading-relaxed">{chapter.summary}</p>
                  </div>
                </div>
              ))}

              {isAddingChapter && (
                <div className="bg-stone-50 p-6 rounded-xl border-2 border-dashed border-stone-300">
                  <input
                    placeholder="Chapter Title"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-stone-300 mb-3"
                  />
                  <textarea
                    placeholder="Chapter Summary..."
                    value={newChapterSummary}
                    onChange={(e) => setNewChapterSummary(e.target.value)}
                    className="w-full h-24 px-4 py-2 rounded-lg border border-stone-300 mb-3 resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingChapter(false)}
                      className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddChapter}
                      className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                    >
                      Add Chapter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
