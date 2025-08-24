'use client';
import { useState, useEffect, use } from 'react';
import { supabase } from '../../supabaseClient';
import { useRouter } from 'next/navigation';

export default function StudyAssistant() {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const session = supabase.auth.getSession().then(({ data }) => {
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

    // Call your AI backend (OpenAI + LangChain + Supabase) here
    // For MVP, we'll just echo the question
    const aiAnswer = `AI Answer for: "${question}"`;

    setAnswers([...answers, { q: question, a: aiAnswer }]);
    setQuestion('');
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
        <button onClick={handleAsk} style={{ padding: '0.5rem 1rem', marginLeft: '0.5rem' }}>Ask</button>
      </div>

      <div>
        {answers.map((item, index) => (
          <div key={index} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '6px' }}>
            <p><strong>Q:</strong> {item.q}</p>
            <p><strong>A:</strong> {item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
