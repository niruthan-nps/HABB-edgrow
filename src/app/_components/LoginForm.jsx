'use client';



import { use, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useRouter } from 'next/navigation';



export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      router.push('/Study');
    }
  };

  const handleSignup = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      alert('Signup successful! Please check your email.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Login / Signup</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
      />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleLogin} style={{ padding: '0.5rem 1rem', marginRight: '1rem' }}>Login</button>
      <button onClick={handleSignup} style={{ padding: '0.5rem 1rem' }}>Signup</button>
    </div>
  );
}
