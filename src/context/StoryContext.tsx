import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CharacterType = 'Protagonist' | 'Antagonist' | 'Side Character' | 'Secondary Protagonist' | 'Puppet Master' | 'The Rat' | 'Other';

export interface Character {
  id: string;
  name: string;
  description: string;
  type: CharacterType;
}

export interface ChapterOutline {
  id: string;
  title: string;
  summary: string;
}

export type GenerationMode = 'scratch' | 'structure' | 'draft';

export interface ContinuityFlag {
  id: string;
  chapterIndex: number;
  characterId: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  snippet: string;
}

export interface StoryState {
  mode: GenerationMode;
  title: string;
  synopsis: string;
  genres: string[];
  authorStyles: string[];
  authorName: string;
  pageCount: number;
  keywords: string;
  characters: Character[];
  outline: ChapterOutline[];
  draftContent: string;
  generatedContent: { title: string; content: string; audioData?: string }[];
  currentChapterIndex: number;
  continuityFlags: ContinuityFlag[];
}

interface StoryContextType {
  state: StoryState;
  updateState: (updates: Partial<StoryState>) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;
  setOutline: (outline: ChapterOutline[]) => void;
  addContinuityFlag: (flag: ContinuityFlag) => void;
  removeContinuityFlag: (id: string) => void;
  resetStory: () => void;
}

const initialState: StoryState = {
  mode: 'scratch',
  title: '',
  synopsis: '',
  genres: [],
  authorStyles: [],
  authorName: '',
  pageCount: 50,
  keywords: '',
  characters: [],
  outline: [],
  draftContent: '',
  generatedContent: [],
  currentChapterIndex: 0,
  continuityFlags: [],
};

const StoryContext = createContext<StoryContextType | undefined>(undefined);

export function StoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoryState>(initialState);

  const updateState = (updates: Partial<StoryState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const addCharacter = (character: Character) => {
    setState((prev) => ({ ...prev, characters: [...prev.characters, character] }));
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setState((prev) => ({
      ...prev,
      characters: prev.characters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  const removeCharacter = (id: string) => {
    setState((prev) => ({
      ...prev,
      characters: prev.characters.filter((c) => c.id !== id),
    }));
  };

  const setOutline = (outline: ChapterOutline[]) => {
    setState((prev) => ({ ...prev, outline }));
  };

  const addContinuityFlag = (flag: ContinuityFlag) => {
    setState((prev) => ({ ...prev, continuityFlags: [...prev.continuityFlags, flag] }));
  };

  const removeContinuityFlag = (id: string) => {
    setState((prev) => ({
      ...prev,
      continuityFlags: prev.continuityFlags.filter((f) => f.id !== id),
    }));
  };

  const resetStory = () => {
    setState(initialState);
  };

  return (
    <StoryContext.Provider
      value={{
        state,
        updateState,
        addCharacter,
        updateCharacter,
        removeCharacter,
        setOutline,
        addContinuityFlag,
        removeContinuityFlag,
        resetStory,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
}

export function useStory() {
  const context = useContext(StoryContext);
  if (context === undefined) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
}
