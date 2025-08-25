import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req) {
  try {
    const { query, k = 5 } = await req.json();

    // 1) Generate embedding for the user question
    const embResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = embResponse.data[0].embedding;

    // 2) Call Supabase RPC function to get top matches
    const { data: matches, error } = await supabaseAdmin.rpc('match_papers', {
      query_embedding: queryEmbedding,
      match_count: k
    });

    if (error) throw error;

    // 3) Build context for LLM
    const contextText = (matches || [])
      .map((m, i) => `[#${i + 1} | sim=${m.similarity.toFixed(3)}]\n${m.content}`)
      .join('\n\n');

    // 4) Call OpenAI chat completion
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful study tutor. Use only the provided CONTEXT to answer. ' +
            'Explain step-by-step, include formulas if relevant, and give a final concise answer.'
        },
        { role: 'user', content: `QUESTION:\n${query}\n\nCONTEXT:\n${contextText}` }
      ]
    });

    const answer = chatResponse.choices[0].message.content;

    // 5) Return answer + sources
    const sources = (matches || []).map((m) => ({
      paper_id: m.paper_id,
      similarity: m.similarity
    }));

    return NextResponse.json({ answer, sources });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
