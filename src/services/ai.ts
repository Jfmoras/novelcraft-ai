import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { Character, ChapterOutline, ContinuityFlag } from "../context/StoryContext";

const apiKey = process.env.GEMINI_API_KEY;
const client = new GoogleGenAI({ apiKey });

const modelId = "gemini-3-flash-preview";

export interface BibleGenerationParams {
  mode: 'scratch' | 'structure' | 'draft';
  genres: string[];
  authorStyles: string[];
  authorName: string;
  pageCount: number;
  keywords?: string;
  existingCharacters?: Character[];
  draftContent?: string;
}

export interface GeneratedBible {
  title: string;
  synopsis: string;
  characters: Character[];
  outline: ChapterOutline[];
  genres?: string[];
  authorStyles?: string[];
  authorName?: string;
  pageCount?: number;
}

export async function generateStoryBible(params: BibleGenerationParams): Promise<GeneratedBible> {
  // Step 1: Generate Foundation (Title, Synopsis, Characters)
  const foundationPrompt = `
    You are an expert novelist and editor acting as a ghostwriter for the author "${params.authorName}". 
    Create a comprehensive "Story Bible" foundation for a new novel that perfectly matches their requested style.
    
    Configuration:
    - Mode: ${params.mode}
    - Genre: ${params.genres.join(', ')}
    - Author Style (Tone/Voice): ${params.authorStyles.join(', ')}
    - Target Length: ${params.pageCount} pages (approx ${params.pageCount * 300} words)
    ${params.keywords ? `- Keywords/Premise: ${params.keywords}` : ''}
    ${params.draftContent ? `- Analyzed Draft Content: ${params.draftContent.substring(0, 5000)}...` : ''}
    ${params.existingCharacters?.length ? `- Existing Characters: ${JSON.stringify(params.existingCharacters)}` : ''}

    Task:
    1. Generate a compelling Title and Synopsis.
    2. Create a list of characters (if not provided, or add to existing ones). Ensure a mix of types (Protagonist, Antagonist, etc.).
    
    Style Instructions:
    - STRICTLY ADHERE to the requested "Author Style". 
    - If the style is "Dark/Gritty", ensure the synopsis reflect that tone.
    - The output should feel like it was written by the specified author(s).

    Output JSON format:
    {
      "title": "string",
      "synopsis": "string",
      "characters": [
        { "id": "string", "name": "string", "description": "string", "type": "string" }
      ]
    }
  `;

  const foundationResponse = await client.models.generateContent({
    model: modelId,
    contents: foundationPrompt,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    }
  });

  const foundationText = foundationResponse.text;
  if (!foundationText) throw new Error("No response from AI for foundation");
  
  let foundation;
  try {
    foundation = JSON.parse(foundationText);
  } catch (e) {
    console.error("Failed to parse foundation JSON", e);
    throw new Error("Failed to generate story foundation");
  }

  // Step 2: Generate Outline based on Foundation
  const minChapters = Math.ceil(params.pageCount / 15);
  const maxChapters = Math.ceil(params.pageCount / 10);

  const outlinePrompt = `
    You are the author "${params.authorName}". Create a detailed Chapter Outline for the story defined below.

    STORY CONTEXT:
    Title: ${foundation.title}
    Synopsis: ${foundation.synopsis}
    Characters: ${JSON.stringify(foundation.characters)}
    
    Configuration:
    - Target Length: ${params.pageCount} pages
    - Target Chapter Count: Between ${minChapters} and ${maxChapters} chapters.
    - Genre: ${params.genres.join(', ')}
    
    Task:
    Create a Chapter Outline including Prologue (optional), Chapters, and Epilogue (optional).
    - The number of chapters MUST fit the target page count range (${minChapters}-${maxChapters}).
    - Keep chapter summaries concise (1-2 sentences) to ensure speed. Focus on the core plot beat of each chapter.
    - Ensure the pacing fits the genre.
    
    Output JSON format:
    {
      "outline": [
        { "id": "string", "title": "string", "summary": "string" }
      ]
    }
  `;

  const outlineResponse = await client.models.generateContent({
    model: modelId,
    contents: outlinePrompt,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    }
  });

  const outlineText = outlineResponse.text;
  if (!outlineText) throw new Error("No response from AI for outline");
  
  let outlineResult;
  try {
    outlineResult = JSON.parse(outlineText);
  } catch (e) {
    console.error("Failed to parse outline JSON", e);
    throw new Error("Failed to generate story outline");
  }
  
  return {
    title: foundation.title,
    synopsis: foundation.synopsis,
    characters: foundation.characters,
    outline: outlineResult.outline,
    authorName: params.authorName,
    authorStyles: params.authorStyles,
    genres: params.genres,
    pageCount: params.pageCount
  };
}

export async function generateCharacterDescription(
  synopsis: string,
  name: string,
  type: string,
  genres: string[],
  authorStyles: string[]
): Promise<string> {
  const prompt = `
    You are an expert novelist. Generate a character description based on the story synopsis and character details.

    Story Synopsis: "${synopsis}"
    Genres: ${genres.join(', ')}
    Author Style: ${authorStyles.join(', ')}

    Character Name: ${name}
    Character Role/Archetype: ${type}

    Task: Write a compelling, detailed description for this character. Include their physical appearance, personality, motivation, and how they fit into the story.
    
    Specific Style Instructions:
    ${authorStyles.some(s => s.includes('Dan Brown')) ? '- Focus on functional roles, specific expertise (e.g., symbologist, cryptologist), and archetypal traits.' : ''}
    ${authorStyles.some(s => s.includes('George R.R. Martin')) ? '- Focus on moral ambiguity, internal conflict, flaws, and personal history.' : ''}
    ${authorStyles.some(s => s.includes('Freida McFadden')) ? '- Focus on psychological instability, hidden secrets, or unreliable narration.' : ''}

    Keep it under 150 words.
  `;

  const response = await client.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    }
  });

  return response.text || "";
}

export async function updateSynopsisWithCharacter(
  currentSynopsis: string,
  newCharacter: Character
): Promise<string> {
  const prompt = `
    You are an expert editor. Update the story synopsis to incorporate a new character.

    Current Synopsis: "${currentSynopsis}"

    New Character to Add:
    Name: ${newCharacter.name}
    Role: ${newCharacter.type}
    Description: ${newCharacter.description}

    Task: Rewrite the synopsis to seamlessly weave this new character into the plot. 
    - PRIORITIZE integrating their specific role and motivations naturally into the narrative flow.
    - Do not just append a sentence at the end. 
    - Show how their presence impacts the conflict or other characters.
    - Maintain the original tone and core plot points.
  `;

  const response = await client.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    }
  });

  return response.text || currentSynopsis;
}

export async function generateStorySegment(
  bible: GeneratedBible,
  chapterIndex: number,
  previousContent: string
): Promise<string> {
  const currentChapter = bible.outline[chapterIndex];
  if (!currentChapter) return "";

  // Determine target word count based on page count
  // If page count is high (e.g. 800), we want longer chapters.
  // Standard chapter is ~2000-4000 words.
  // AI output limit is usually around 8k tokens, so ~6000 words is absolute max, but 2000 is safer for quality.
  const targetWordCount = bible.pageCount && bible.pageCount >= 500 ? "2000-3000" : "1500-2000";

  // Construct a summary of previous chapters to maintain continuity
  const previousChaptersSummary = bible.outline
    .slice(0, chapterIndex)
    .map((ch, idx) => `Chapter ${idx + 1}: ${ch.summary}`)
    .join('\n');

  const prompt = `
    You are the author "${bible.authorName || 'Unknown'}". Write the next chapter of your novel.
    
    STORY BIBLE (SOURCE OF TRUTH):
    Title: ${bible.title}
    Synopsis: ${bible.synopsis}
    Characters: ${JSON.stringify(bible.characters)}
    
    OUTLINE CONTEXT:
    Previous Chapters Summary:
    ${previousChaptersSummary || "This is the first chapter."}
    
    Current Task: Write ${currentChapter.title}.
    Chapter Summary: ${currentChapter.summary}
    
    IMMEDIATE PREVIOUS CONTENT (End of last chapter):
    ${previousContent.slice(-3000)}
    
    Style Guide:
    - Write in the specific style of: ${bible.authorStyles?.join(', ') || 'Standard Fiction'}
    - Genre: ${bible.genres?.join(', ')}
    - TONE: Strictly adhere to the requested author's voice. If it's "Stephen King", be atmospheric and suspenseful. If it's "Jane Austen", be witty and observational.
    
    CRITICAL INSTRUCTIONS:
    1. CONTINUITY IS PARAMOUNT. You must strictly adhere to the "Story Bible" and "Outline Context".
    2. Do NOT contradict established facts, character traits, or the synopsis.
    3. Do NOT change the plot points defined in the Chapter Summary.
    4. Maintain consistent character voices and plot continuity from the previous content.
    5. Use Markdown formatting for scene breaks (***) and emphasis.
    6. Do NOT include the Chapter Title at the start, just the story content.
    7. Write approximately ${targetWordCount} words for this segment.
    8. Focus on "Show, Don't Tell".
    9. EXPAND on the summary. Do not rush. Include dialogue, sensory details, and internal monologue.
    
    SPECIAL FOCUS: CONTINUITY & IMMERSION
    - **Character Relationships**: Before writing an interaction, verify if these characters have met before in the "Previous Chapters Summary". If they are strangers, treat them as strangers. If they are old friends, show that history. Do NOT invent false shared histories that contradict the plot.
    - **Character Consistency**: Ensure characters act according to their defined traits in the Story Bible. A shy character should not suddenly become the life of the party without a clear reason.
    - **Sensory Details**: Engage the reader's senses. Don't just say "it was raining." Describe the smell of wet pavement, the sound of tires hissing on the road, the cold dampness seeping into clothes. Make the reader FEEL the scene.
  `;

  const response = await client.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    }
  });

  return response.text || "";
}

export async function checkContinuity(
  segment: string,
  characters: Character[],
  chapterIndex: number,
  previousSummary: string
): Promise<ContinuityFlag[]> {
  const prompt = `
    You are a continuity editor for a novel. Analyze the following story segment for continuity errors regarding character traits, actions, and established history.

    CHARACTERS:
    ${JSON.stringify(characters)}

    PREVIOUS CONTEXT SUMMARY:
    ${previousSummary}

    NEW SEGMENT TO ANALYZE:
    ${segment}

    TASK:
    Identify any continuity errors.
    - Did a character act out of character based on their description?
    - Did a character know something they shouldn't?
    - Did a character meet someone they already met (or vice versa) contradicting history?
    - Are there physical impossibilities based on previous scenes?

    Return a JSON array of objects with the following structure:
    [
      {
        "characterId": "string (id of the character involved, or 'general')",
        "description": "string (explanation of the error)",
        "severity": "low" | "medium" | "high",
        "snippet": "string (the specific text in the segment that causes the issue)"
      }
    ]

    If no errors are found, return an empty array [].
  `;

  const response = await client.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    }
  });

  const text = response.text;
  if (!text) return [];

  try {
    const flags = JSON.parse(text) as Omit<ContinuityFlag, 'id' | 'chapterIndex'>[];
    return flags.map((flag, index) => ({
      ...flag,
      id: `flag-${Date.now()}-${index}`,
      chapterIndex
    }));
  } catch (e) {
    console.error("Failed to parse continuity flags", e);
    return [];
  }
}
