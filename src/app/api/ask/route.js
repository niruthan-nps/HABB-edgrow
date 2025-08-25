// import { NextResponse } from 'next/server';
// import { createClient } from '@supabase/supabase-js';
// import OpenAI from 'openai';

// const supabaseAdmin = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key
// );

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// export async function POST(req) {
//   try {
//     const { query, k = 5 } = await req.json();

//     // 1) Generate embedding for the user question
//     const embResponse = await openai.embeddings.create({
//       model: 'text-embedding-3-small',
//       input: query
//     });
//     const queryEmbedding = embResponse.data[0].embedding;

//     // 2) Call Supabase RPC function to get top matches
//     const { data: matches, error } = await supabaseAdmin.rpc('match_papers', {
//       query_embedding: queryEmbedding,
//       match_count: k
//     });

//     if (error) throw error;

//     // 3) Build context for LLM
//     const contextText = (matches || [])
//       .map((m, i) => `[#${i + 1} | sim=${m.similarity.toFixed(3)}]\n${m.content}`)
//       .join('\n\n');

//     // 4) Call OpenAI chat completion
//     const chatResponse = await openai.chat.completions.create({
//       model: 'gpt-4o-mini',
//       temperature: 0.2,
//       messages: [
//         {
//           role: 'system',
//           content:
//             'You are a helpful study tutor. Use only the provided CONTEXT to answer. ' +
//             'Explain step-by-step, include formulas if relevant, and give a final concise answer.'
//         },
//         { role: 'user', content: `QUESTION:\n${query}\n\nCONTEXT:\n${contextText}` }
//       ]
//     });

//     const answer = chatResponse.choices[0].message.content;

//     // 5) Return answer + sources
//     const sources = (matches || []).map((m) => ({
//       paper_id: m.paper_id,
//       similarity: m.similarity
//     }));

//     return NextResponse.json({ answer, sources });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }


import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Hugging Face API helper functions
async function generateEmbedding(text) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
    {
      headers: { 
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify({ inputs: text })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${error}`);
  }

  const result = await response.json();
  return result; // This is already the embedding array
}

async function generateChatResponse(prompt) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/microsoft/DialoGPT-large",
    {
      headers: { 
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify({ 
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.3,
          return_full_text: false
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat API error: ${error}`);
  }

  const result = await response.json();
  return result[0]?.generated_text || "Sorry, I couldn't generate a response.";
}

export async function POST(req) {
  try {
    const { query, k = 5 } = await req.json();

    // 1) Generate embedding for the user question
    console.log('Generating embedding for query:', query);
    const queryEmbedding = await generateEmbedding(query);

    // 2) Call Supabase RPC function to get top matches
    const { data: matches, error } = await supabaseAdmin.rpc('match_papers', {
      query_embedding: queryEmbedding,
      match_count: k
    });

    if (error) throw error;

    if (!matches || matches.length === 0) {
      return NextResponse.json({ 
        answer: "I couldn't find any relevant past papers for your question. Please try rephrasing or ask about a different topic.",
        sources: []
      });
    }

    // 3) Build context for LLM
    const contextText = matches
      .map((m, i) => `[Question #${i + 1} | Relevance: ${m.similarity.toFixed(3)}]\n${m.content}`)
      .join('\n\n');

    // 4) Create a structured prompt for better responses
    const systemPrompt = `You are a helpful study tutor. Answer the student's question using ONLY the provided context from past exam papers. 

Instructions:
- Provide step-by-step explanations
- Include relevant formulas when applicable
- Give a clear, concise final answer
- If the context doesn't fully answer the question, say so clearly

STUDENT QUESTION: ${query}

CONTEXT FROM PAST PAPERS:
${contextText}

TUTOR RESPONSE:`;

    // 5) Generate response using Hugging Face
    console.log('Generating chat response...');
    const answer = await generateChatResponse(systemPrompt);

    // 6) Return answer + sources
    const sources = matches.map((m) => ({
      paper_id: m.paper_id,
      similarity: m.similarity
    }));

    return NextResponse.json({ answer, sources });

  } catch (err) {
    console.error('API Error:', err);
    
    // Handle rate limiting gracefully
    if (err.message.includes('rate limit') || err.message.includes('quota')) {
      return NextResponse.json({ 
        error: "API quota exceeded. Please try again in a few minutes.",
        sources: []
      }, { status: 429 });
    }

    return NextResponse.json({ 
      error: `Sorry, I encountered an error: ${err.message}`,
      sources: []
    }, { status: 500 });
  }
}