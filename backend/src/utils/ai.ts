import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GenerateActivityContentRequest {
  activityType: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  count?: number;
}

export interface GeneratedContent {
  items: any[];
}

// Generate prompts for different activity types
const getPromptForActivityType = (
  activityType: string,
  topic: string,
  difficulty: string,
  count: number = 5
) => {
  const basePrompt = `Generate educational content for the topic: "${topic}". Difficulty level: ${difficulty}. `;

  switch (activityType) {
    case 'QUIZ_GAME':
      return `${basePrompt}Create ${count} multiple-choice questions with 4 options each.

Return ONLY valid JSON array: [{"question": "Q?", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "timeLimit": 30}]`;

    case 'MATCH_PAIRS':
      return `${basePrompt}Create ${count} sets of matching pairs. Each set should have 3-4 pairs of related terms/concepts.

Return ONLY valid JSON array: [{"pairs": [{"left": "Term", "right": "Short definition"}]}]`;

    case 'TRUE_FALSE':
      return `${basePrompt}Create ${count} true/false statements.

Return ONLY valid JSON array: [{"statement": "Statement here", "correctAnswer": true}]`;

    case 'FILL_BLANKS':
      return `${basePrompt}Create ${count} fill-in-the-blank exercises using _____ for blanks.

Return ONLY valid JSON array: [{"text": "Sentence with _____.", "blanks": [{"answer": "answer"}]}]`;

    case 'WORD_SEARCH':
      return `${basePrompt}Create a word search with ${count} words.

Return ONLY valid JSON: {"words": ["word1", "word2"]}`;

    case 'ABACUS':
      return `${basePrompt}Create ${count} abacus arithmetic practice questions suitable for mental math.

Return ONLY valid JSON array: [{"prompt": "47 + 28", "answer": 75, "hint": "Use place values"}]`;

    case 'SEQUENCE_ORDER':
      return `${basePrompt}Create ${count} sequencing activities with 3-4 steps each.

Return ONLY valid JSON array: [{"items": [{"content": "Step 1", "correctOrder": 1}]}]`;

    case 'DRAG_DROP':
      return `${basePrompt}Create ${count} drag-and-drop activities.

Return ONLY valid JSON array: [{"zones": [{"id": "zone1", "label": "Category"}], "items": [{"id": "item1", "content": "Item"}]}]`;

    case 'MEMORY_GAME':
      return `${basePrompt}Create ${count} memory game sets with 4-6 pairs each.

Return ONLY valid JSON array: [{"pairs": [{"content": "Item"}, {"content": "Item"}]}]`;

    default:
      return `${basePrompt}Generate appropriate content for ${activityType} activity type. Return valid JSON.`;
  }
};

export const generateActivityContent = async (
  request: GenerateActivityContentRequest
): Promise<GeneratedContent> => {
  try {
    const { activityType, topic, difficulty, count = 1 } = request;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyApprDVA4wKBVDMmHHnx2dBPImZOLAS5R8';
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const promptText = getPromptForActivityType(activityType, topic, difficulty, count);

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;

    console.log('AI Response:', text.substring(0, 200) + '...');

    // Clean the response text (remove markdown code blocks if present)
    let cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();

    // Remove any leading/trailing text that might not be JSON
    cleanedText = cleanedText.replace(/^[^{[]*([{\[])/, '$1');
    cleanedText = cleanedText.replace(/([}\]][^}\]]*)$/, '$1');

    // Remove any trailing commas before closing braces/brackets
    cleanedText = cleanedText.replace(/,(\s*[}\]])/g, '$1');

    console.log('Cleaned AI response length:', cleanedText.length);
    console.log('Cleaned AI response start:', cleanedText.substring(0, 300));
    console.log('Cleaned AI response end:', cleanedText.substring(cleanedText.length - 300));

    let parsedContent;
    try {
      parsedContent = JSON.parse(cleanedText);
    } catch (parseError) {
      console.log('Direct JSON parse failed, trying to complete incomplete JSON...');

      // Try to complete incomplete JSON
      let completedText = cleanedText.trim();

      // Count opening and closing brackets
      let openBrackets = (completedText.match(/\[/g) || []).length;
      let closeBrackets = (completedText.match(/\]/g) || []).length;
      let openBraces = (completedText.match(/\{/g) || []).length;
      let closeBraces = (completedText.match(/\}/g) || []).length;

      // Add missing closing brackets/braces
      while (closeBrackets < openBrackets) {
        completedText += ']';
        closeBrackets++;
      }
      while (closeBraces < openBraces) {
        completedText += '}';
        closeBraces++;
      }

      // Remove trailing commas
      completedText = completedText.replace(/,(\s*[}\]])/g, '$1');

      try {
        parsedContent = JSON.parse(completedText);
        console.log('Completed JSON parsing succeeded');
      } catch (completeError) {
        console.log('Completed JSON parsing failed, trying other fixes...');

        // Try other fixes
        let fixedText = cleanedText
          .replace(/,\s*}/g, '}') // Remove trailing commas
          .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
          .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":') // Quote unquoted keys
          .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\]])/g, ':"$1"$2') // Quote unquoted string values
          .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*$/g, ':"$1"'); // Quote unquoted string values at end

        // Complete brackets again
        let openBrackets2 = (fixedText.match(/\[/g) || []).length;
        let closeBrackets2 = (fixedText.match(/\]/g) || []).length;
        let openBraces2 = (fixedText.match(/\{/g) || []).length;
        let closeBraces2 = (fixedText.match(/\}/g) || []).length;

        while (closeBrackets2 < openBrackets2) {
          fixedText += ']';
          closeBrackets2++;
        }
        while (closeBraces2 < openBraces2) {
          fixedText += '}';
          closeBraces2++;
        }

        try {
          parsedContent = JSON.parse(fixedText);
          console.log('Fixed and completed JSON parsing succeeded');
        } catch (thirdError) {
          console.log('All JSON parsing attempts failed');
          console.error('Original text:', text);
          console.error('Cleaned text:', cleanedText);
          throw new Error('Failed to parse AI response as JSON after all attempts');
        }
      }
    }

    // Format the response based on activity type
    let items: any[] = [];

    if (activityType === 'QUIZ_GAME') {
      items = parsedContent.map((item: any) => ({
        content: {
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          timeLimit: item.timeLimit || 30,
        },
        points: 10,
      }));
    } else if (activityType === 'MATCH_PAIRS') {
      items = parsedContent.map((item: any) => ({
        content: {
          pairs: item.pairs,
        },
        points: 10,
      }));
    } else if (activityType === 'TRUE_FALSE') {
      items = parsedContent.map((item: any) => ({
        content: {
          statement: item.statement,
          correctAnswer: item.correctAnswer,
        },
        points: 5,
      }));
    } else if (activityType === 'FILL_BLANKS') {
      items = parsedContent.map((item: any) => ({
        content: {
          text: item.text,
          blanks: item.blanks,
        },
        points: 10,
      }));
    } else if (activityType === 'WORD_SEARCH') {
      // For word search, we create one item with all words
      items = [{
        content: {
          words: parsedContent.words || parsedContent,
        },
        points: 20,
      }];
    } else if (activityType === 'ABACUS') {
      items = parsedContent.map((item: any) => ({
        content: {
          prompt: item.prompt,
          answer: Number(item.answer),
          hint: item.hint || '',
        },
        points: 10,
      }));
    } else if (activityType === 'SEQUENCE_ORDER') {
      items = parsedContent.map((item: any) => ({
        content: {
          items: item.items,
        },
        points: 15,
      }));
    } else if (activityType === 'DRAG_DROP') {
      items = parsedContent.map((item: any) => ({
        content: {
          zones: item.zones,
          items: item.items,
        },
        points: 15,
      }));
    } else if (activityType === 'MEMORY_GAME') {
      items = parsedContent.map((item: any) => ({
        content: {
          pairs: item.pairs,
        },
        points: 10,
      }));
    } else {
      // Generic fallback
      items = parsedContent.map((item: any) => ({
        content: item,
        points: 10,
      }));
    }

    return { items };
  } catch (error) {
    console.error('Error generating activity content:', error);
    throw new Error('Failed to generate activity content');
  }
};