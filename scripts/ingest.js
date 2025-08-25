// require('dotenv').config();
// const { createClient } = require('@supabase/supabase-js');
// const OpenAI = require('openai');

// // Initialize Supabase (server-side)
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key
// );

// // Initialize OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// });

// async function main() {
//   try {
//     // 1) Fetch all past_papers without embeddings
//     const { data: papers, error } = await supabase
//       .from('past_papers')
//       .select('id, content');

//     if (error) throw error;
//     if (!papers || papers.length === 0) {
//       console.log('No papers found.');
//       return;
//     }

//     // 2) Loop through each paper and generate embedding
//     for (const paper of papers) {
//       // Generate embedding for the content
//       const embResponse = await openai.embeddings.create({
//         model: 'text-embedding-3-small',
//         input: paper.content
//       });

//       const embeddingVector = embResponse.data[0].embedding;

//       // 3) Insert embedding into paper_embeddings table
//       const { error: insertError } = await supabase
//         .from('paper_embeddings')
//         .insert({
//           paper_id: paper.id,
//           embedding: embeddingVector
//         });

//       if (insertError) throw insertError;

//       console.log(`Embedded paper ID: ${paper.id}`);
//     }

//     console.log('All embeddings inserted successfully!');
//   } catch (err) {
//     console.error('Error:', err.message);
//   }
// }

// main();


// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });
// const { createClient } = require('@supabase/supabase-js');

// // Debug: Check if environment variables are loaded
// console.log('Environment check:');
// console.log('HUGGINGFACE_API_KEY:', process.env.HUGGINGFACE_API_KEY ? 'Found' : 'Missing');
// console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Found' : 'Missing');
// console.log('SUPABASE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');

// if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
//   console.error('❌ Missing Supabase environment variables');
//   process.exit(1);
// }

// if (!process.env.HUGGINGFACE_API_KEY) {
//   console.error('❌ Missing Hugging Face API key');
//   process.exit(1);
// }

// // Initialize Supabase (server-side)
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// async function generateEmbedding(text) {
//   console.log(`Generating embedding for: "${text.substring(0, 50)}..."`);
  
//   const response = await fetch(
//     "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
//     {
//       headers: { 
//         Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
//         'Content-Type': 'application/json'
//       },
//       method: "POST",
//       body: JSON.stringify({ inputs: text })
//     }
//   );

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
//   }

//   const result = await response.json();
  
//   // Handle potential API responses
//   if (result.error) {
//     throw new Error(`Hugging Face error: ${result.error}`);
//   }
  
//   console.log(`✅ Generated embedding with ${result.length} dimensions`);
//   return result; // This should be the embedding array
// }

// async function main() {
//   try {
//     console.log('🚀 Starting embedding generation...');

//     // 1) Fetch all past_papers without embeddings
//     console.log('📚 Fetching papers from database...');
//     const { data: papers, error } = await supabase
//       .from('past_papers')
//       .select('id, content');

//     if (error) {
//       console.error('Database error:', error);
//       throw error;
//     }
    
//     if (!papers || papers.length === 0) {
//       console.log('❌ No papers found in database.');
//       console.log('💡 Make sure you have inserted some past_papers first!');
//       return;
//     }

//     console.log(`📖 Found ${papers.length} papers to process.`);

//     // 2) Check if embeddings already exist
//     const { data: existingEmbeddings } = await supabase
//       .from('paper_embeddings')
//       .select('paper_id');
    
//     const existingIds = new Set(existingEmbeddings?.map(e => e.paper_id) || []);
//     const papersToProcess = papers.filter(p => !existingIds.has(p.id));
    
//     if (papersToProcess.length === 0) {
//       console.log('✅ All papers already have embeddings!');
//       return;
//     }

//     console.log(`🔄 Processing ${papersToProcess.length} new papers...`);

//     // 3) Loop through each paper and generate embedding
//     for (let i = 0; i < papersToProcess.length; i++) {
//       const paper = papersToProcess[i];
      
//       try {
//         console.log(`\n📝 Processing paper ${i + 1}/${papersToProcess.length} (ID: ${paper.id})`);
        
//         // Generate embedding
//         const embeddingVector = await generateEmbedding(paper.content);

//         // Insert embedding into paper_embeddings table
//         const { error: insertError } = await supabase
//           .from('paper_embeddings')
//           .insert({
//             paper_id: paper.id,
//             embedding: embeddingVector
//           });

//         if (insertError) {
//           console.error(`❌ Failed to insert embedding for paper ${paper.id}:`, insertError);
//           continue;
//         }

//         console.log(`✅ Successfully embedded paper ID: ${paper.id}`);
        
//         // Small delay to avoid rate limiting
//         if (i < papersToProcess.length - 1) {
//           console.log('⏳ Waiting 2 seconds to avoid rate limits...');
//           await new Promise(resolve => setTimeout(resolve, 2000));
//         }
        
//       } catch (paperError) {
//         console.error(`❌ Failed to process paper ${paper.id}:`, paperError.message);
        
//         // If it's a rate limit error, wait longer
//         if (paperError.message.includes('rate limit') || paperError.message.includes('429')) {
//           console.log('⏳ Rate limit detected, waiting 60 seconds...');
//           await new Promise(resolve => setTimeout(resolve, 60000));
//           i--; // Retry this paper
//         }
//       }
//     }

//     console.log('\n🎉 Embedding process completed successfully!');
//     console.log(`📊 Processed ${papersToProcess.length} papers`);
    
//   } catch (err) {
//     console.error('\n❌ Fatal error:', err.message);
//     process.exit(1);
//   }
// }

// // Run the script
// console.log('🎯 Smart Past Papers - Embedding Generation');
// console.log('==========================================');
// main();


// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '../.env') });
// const { createClient } = require('@supabase/supabase-js');

// // Initialize Supabase
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

// async function generateEmbedding(text) {
//   console.log(`Generating embedding for: "${text.substring(0, 50)}..."`);
  
//   // Using a different model that works better with HF Inference API
//   const response = await fetch(
//     "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-MiniLM-L6-v2",
//     {
//       headers: { 
//         Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
//         'Content-Type': 'application/json'
//       },
//       method: "POST",
//       body: JSON.stringify({ 
//         inputs: text,
//         options: {
//           wait_for_model: true,
//           use_cache: false
//         }
//       })
//     }
//   );

//   if (!response.ok) {
//     const errorText = await response.text();
//     console.error('Response:', errorText);
//     throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
//   }

//   const result = await response.json();
//   console.log('API Response type:', typeof result, 'Length:', Array.isArray(result) ? result.length : 'N/A');
  
//   if (result.error) {
//     throw new Error(`Hugging Face error: ${result.error}`);
//   }
  
//   // Handle different response formats
//   let embedding;
//   if (Array.isArray(result)) {
//     if (Array.isArray(result[0])) {
//       embedding = result[0]; // Nested array
//     } else if (typeof result[0] === 'number') {
//       embedding = result; // Direct array of numbers
//     } else {
//       throw new Error(`Unexpected result format: ${JSON.stringify(result).substring(0, 100)}`);
//     }
//   } else {
//     throw new Error(`Expected array, got: ${typeof result}`);
//   }
  
//   console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
//   return embedding;
// }

// async function main() {
//   try {
//     console.log('🚀 Starting embedding generation with alternative model...');

//     const { data: papers, error } = await supabase
//       .from('past_papers')
//       .select('id, content');

//     if (error) throw error;
    
//     if (!papers || papers.length === 0) {
//       console.log('❌ No papers found in database.');
//       return;
//     }

//     console.log(`📖 Found ${papers.length} papers to process.`);

//     // Check existing embeddings
//     const { data: existingEmbeddings } = await supabase
//       .from('paper_embeddings')
//       .select('paper_id');
    
//     const existingIds = new Set(existingEmbeddings?.map(e => e.paper_id) || []);
//     const papersToProcess = papers.filter(p => !existingIds.has(p.id));
    
//     if (papersToProcess.length === 0) {
//       console.log('✅ All papers already have embeddings!');
//       return;
//     }

//     console.log(`🔄 Processing ${papersToProcess.length} new papers...`);

//     for (let i = 0; i < papersToProcess.length; i++) {
//       const paper = papersToProcess[i];
      
//       try {
//         console.log(`\n📝 Processing paper ${i + 1}/${papersToProcess.length} (ID: ${paper.id})`);
        
//         const embeddingVector = await generateEmbedding(paper.content);

//         const { error: insertError } = await supabase
//           .from('paper_embeddings')
//           .insert({
//             paper_id: paper.id,
//             embedding: embeddingVector
//           });

//         if (insertError) {
//           console.error(`❌ Failed to insert embedding:`, insertError);
//           continue;
//         }

//         console.log(`✅ Successfully embedded paper ID: ${paper.id}`);
        
//         // Wait between requests
//         if (i < papersToProcess.length - 1) {
//           console.log('⏳ Waiting 3 seconds...');
//           await new Promise(resolve => setTimeout(resolve, 3000));
//         }
        
//       } catch (paperError) {
//         console.error(`❌ Failed to process paper ${paper.id}:`, paperError.message);
//       }
//     }

//     console.log('\n🎉 Embedding process completed!');
    
//   } catch (err) {
//     console.error('\n❌ Fatal error:', err.message);
//   }
// }

// main();



const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function generateEmbedding(text) {
  console.log(`Generating embedding for: "${text.substring(0, 50)}..."`);
  
  // Using the feature-extraction pipeline with a verified model
  const response = await fetch(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    {
      headers: { 
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify({ 
        inputs: text
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Full response:', errorText);
    throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Hugging Face error: ${result.error}`);
  }
  
  // Handle the response - should be a nested array
  let embedding;
  if (Array.isArray(result) && Array.isArray(result[0])) {
    embedding = result[0]; // First embedding vector
  } else if (Array.isArray(result) && typeof result[0] === 'number') {
    embedding = result; // Direct embedding vector
  } else {
    console.log('Unexpected result structure:', JSON.stringify(result).substring(0, 200));
    throw new Error(`Unexpected response format from HuggingFace API`);
  }
  
  console.log(`✅ Generated embedding with ${embedding.length} dimensions`);
  return embedding;
}

// Alternative function using a different model if the above fails
async function generateEmbeddingAlternative(text) {
  console.log(`Trying alternative model for: "${text.substring(0, 50)}..."`);
  
  // Using BERT base model for embeddings
  const response = await fetch(
    "https://api-inference.huggingface.co/models/bert-base-uncased",
    {
      headers: { 
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      method: "POST",
      body: JSON.stringify({ 
        inputs: text,
        options: {
          wait_for_model: true
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Alternative model error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`Alternative model error: ${result.error}`);
  }
  
  // BERT returns a different format - we need to extract embeddings
  // This is a simplified approach - normally you'd average the token embeddings
  if (result.last_hidden_state && Array.isArray(result.last_hidden_state[0])) {
    // Take the first token's embedding (CLS token)
    const embedding = result.last_hidden_state[0];
    console.log(`✅ Generated BERT embedding with ${embedding.length} dimensions`);
    return embedding;
  }
  
  throw new Error('Could not extract embedding from BERT response');
}

async function main() {
  try {
    console.log('🚀 Starting embedding generation...');

    const { data: papers, error } = await supabase
      .from('past_papers')
      .select('id, content');

    if (error) throw error;
    
    if (!papers || papers.length === 0) {
      console.log('❌ No papers found in database.');
      return;
    }

    console.log(`📖 Found ${papers.length} papers to process.`);

    // Check existing embeddings
    const { data: existingEmbeddings } = await supabase
      .from('paper_embeddings')
      .select('paper_id');
    
    const existingIds = new Set(existingEmbeddings?.map(e => e.paper_id) || []);
    const papersToProcess = papers.filter(p => !existingIds.has(p.id));
    
    if (papersToProcess.length === 0) {
      console.log('✅ All papers already have embeddings!');
      return;
    }

    console.log(`🔄 Processing ${papersToProcess.length} new papers...`);

    for (let i = 0; i < papersToProcess.length; i++) {
      const paper = papersToProcess[i];
      
      try {
        console.log(`\n📝 Processing paper ${i + 1}/${papersToProcess.length} (ID: ${paper.id})`);
        
        let embeddingVector;
        
        try {
          // Try the main embedding function first
          embeddingVector = await generateEmbedding(paper.content);
        } catch (primaryError) {
          console.log(`Primary model failed: ${primaryError.message}`);
          console.log('🔄 Trying alternative model...');
          
          try {
            embeddingVector = await generateEmbeddingAlternative(paper.content);
          } catch (altError) {
            throw new Error(`Both models failed. Primary: ${primaryError.message}, Alt: ${altError.message}`);
          }
        }

        const { error: insertError } = await supabase
          .from('paper_embeddings')
          .insert({
            paper_id: paper.id,
            embedding: embeddingVector
          });

        if (insertError) {
          console.error(`❌ Database insert error:`, insertError);
          continue;
        }

        console.log(`✅ Successfully embedded paper ID: ${paper.id}`);
        
        // Wait between requests to avoid rate limiting
        if (i < papersToProcess.length - 1) {
          console.log('⏳ Waiting 5 seconds to avoid rate limits...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (paperError) {
        console.error(`❌ Failed to process paper ${paper.id}:`, paperError.message);
        
        // If it's a rate limit, wait longer
        if (paperError.message.includes('rate limit') || paperError.message.includes('429')) {
          console.log('⏳ Rate limit detected, waiting 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          i--; // Retry this paper
        }
      }
    }

    console.log('\n🎉 Embedding process completed!');
    
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
  }
}

console.log('🎯 Smart Past Papers - Hugging Face Embedding Generation');
console.log('======================================================');
main();