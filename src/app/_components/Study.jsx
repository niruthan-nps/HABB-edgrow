'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useRouter } from 'next/navigation';

export default function StudyAssistant() {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/');
      else setUser(data.session.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.push('/');
      else setUser(session.user);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleAsk = async () => {
    if (!question) return;

    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: question, k: 5 }) // k = number of top results
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Save AI answer with sources
      setAnswers((prev) => [
        ...prev,
        { q: question, a: data.answer, sources: data.sources }
      ]);
      setQuestion('');
    } catch (err) {
      setAnswers((prev) => [
        ...prev,
        { q: question, a: `Error fetching answer: ${err.message}`, sources: [] }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem' }}>
      <h2>Study Assistant</h2>
      <div style={{ display: 'flex', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Ask a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ flex: 1, padding: '0.5rem' }}
        />
        <button
          onClick={handleAsk}
          style={{ padding: '0.5rem 1rem', marginLeft: '0.5rem' }}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Ask'}
        </button>
      </div>

      <div>
        {answers.map((item, index) => (
          <div
            key={index}
            style={{
              marginBottom: '1rem',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px'
            }}
          >
            <p><strong>Q:</strong> {item.q}</p>
            <p><strong>A:</strong> {item.a}</p>
            {item.sources && item.sources.length > 0 && (
              <p style={{ fontSize: '0.8rem', color: '#555' }}>
                Sources: {item.sources.map(s => `#${s.paper_id} (sim:${s.similarity.toFixed(2)})`).join(', ')}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
