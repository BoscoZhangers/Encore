import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Leaf, LoaderCircle } from 'lucide-react';
import { post } from '../api';
import { ErrorBox } from '../components/ui';
import type { User } from '../types';
import { WelcomePage } from '../components/welcome/WelcomePage';

export function Login({ setUser, returnTo }: { setUser: (user: User) => void; returnTo?: string }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [signup, setSignup] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const result = await post(signup ? '/auth/register' : '/auth/login', {
        name: f.get('name'),
        email: f.get('email'),
        password: f.get('password'),
      });
      setUser(result.user);
      const next = params.get('next') || returnTo;
      navigate(next?.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <WelcomePage>
      <form
        id="welcome-signin"
        className="auth-form"
        onSubmit={submit}
        aria-labelledby="signin-title"
      >
        <div className="eyebrow">
          <Leaf size={14} /> Your next chapter
        </div>
        <h2 id="signin-title">{signup ? 'Make yourself at home.' : 'Good to see you again.'}</h2>
        <p className="muted">One account to discover, sell, and make a deal.</p>
        <ErrorBox error={error} />
        {signup && (
          <label>
            Your name
            <input name="name" autoComplete="name" minLength={2} maxLength={60} required />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            minLength={10}
            maxLength={128}
            required
          />
          <small>At least 10 characters.</small>
        </label>
        <button className="button full" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : signup ? (
            'Create account'
          ) : (
            'Sign in'
          )}
          <ArrowRight size={17} />
        </button>
        <p className="auth-switch">
          {signup ? 'Already part of Encore?' : 'New around here?'}{' '}
          <button
            type="button"
            onClick={() => {
              setSignup(!signup);
              setError('');
            }}
          >
            {signup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </WelcomePage>
  );
}
