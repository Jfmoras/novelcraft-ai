import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, FileText, Upload, FolderOpen } from 'lucide-react';
import Layout from '../components/Layout';
import { useStory, GenerationMode, StoryState } from '../context/StoryContext';

export default function Home() {
  const navigate = useNavigate();
  const { updateState } = useStory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectMode = (mode: GenerationMode) => {
    updateState({ mode });
    navigate('/config');
  };

  const handleLoadProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.novel') && !file.name.endsWith('.json')) {
      alert("Invalid file type. Please upload a .novel or .json file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const loadedState = JSON.parse(content) as StoryState;
        
        // Basic validation
        if (!loadedState.title && !loadedState.mode) {
           throw new Error("Invalid project file structure");
        }

        updateState(loadedState);
        
        // Navigate based on state progress
        if (loadedState.generatedContent.length > 0) {
          navigate('/generator');
        } else if (loadedState.outline.length > 0) {
          navigate('/bible');
        } else {
          navigate('/config');
        }
      } catch (error) {
        console.error("Failed to load project:", error);
        if (error instanceof SyntaxError) {
          alert("Failed to parse project file. The file might be corrupted or not a valid JSON format.");
        } else {
          alert("Failed to load project file. It may be corrupted or invalid.");
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <Layout>
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4">
          Craft Your Masterpiece
        </h1>
        <p className="text-xl text-stone-600 max-w-2xl mx-auto">
          Select how you want to begin your journey. Whether starting from a spark of an idea or a detailed blueprint, NovelCraft AI is your co-author.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          icon={<PenTool className="w-10 h-10 text-emerald-600" />}
          title="Write from Scratch"
          description="Start with a few keywords and let AI weave the narrative thread."
          onClick={() => handleSelectMode('scratch')}
        />
        <Card
          icon={<FileText className="w-10 h-10 text-indigo-600" />}
          title="Define Structure"
          description="Build your world manually. Define characters, plot points, and structure."
          onClick={() => handleSelectMode('structure')}
        />
        <Card
          icon={<Upload className="w-10 h-10 text-amber-600" />}
          title="Import Draft"
          description="Upload an existing PDF or Word doc. We'll analyze and continue your style."
          onClick={() => handleSelectMode('draft')}
        />
        <Card
          icon={<FolderOpen className="w-10 h-10 text-stone-600" />}
          title="Load Project"
          description="Resume working on a previously saved .novel project file."
          onClick={() => fileInputRef.current?.click()}
        />
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleLoadProject}
        accept=".novel,.json"
        className="hidden"
      />
    </Layout>
  );
}

function Card({ icon, title, description, onClick }: { icon: React.ReactNode; title: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-stone-200 hover:shadow-md hover:border-stone-300 transition-all group h-full"
    >
      <div className="mb-4 p-3 bg-stone-50 rounded-full group-hover:bg-stone-100 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-serif font-semibold text-stone-800 mb-2">{title}</h3>
      <p className="text-stone-600 text-sm leading-relaxed">{description}</p>
    </button>
  );
}
