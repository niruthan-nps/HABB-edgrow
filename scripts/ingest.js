require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

// Initialize Supabase (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key
);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function main() {
  try {
    // 1) Fetch all past_papers without embeddings
    const { data: papers, error } = await supabase
      .from('past_papers')
      .select('id, content');

    if (error) throw error;
    if (!papers || papers.length === 0) {
      console.log('No papers found.');
      return;
    }

    // 2) Loop through each paper and generate embedding
    for (const paper of papers) {
      // Generate embedding for the content
      const embResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: paper.content
      });

      const embeddingVector = embResponse.data[0].embedding;

      // 3) Insert embedding into paper_embeddings table
      const { error: insertError } = await supabase
        .from('paper_embeddings')
        .insert({
          paper_id: paper.id,
          embedding: embeddingVector
        });

      if (insertError) throw insertError;

      console.log(`Embedded paper ID: ${paper.id}`);
    }

    console.log('All embeddings inserted successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
