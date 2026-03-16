import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

// --- Security: Rate limiting ---
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000; // 1 minute

function useRateLimiter() {
  const attemptsRef = useRef<number[]>([]);

  const canAttempt = useCallback(() => {
    const now = Date.now();
    // Remove attempts older than lockout window
    attemptsRef.current = attemptsRef.current.filter(
      (t) => now - t < LOCKOUT_DURATION_MS
    );
    return attemptsRef.current.length < MAX_ATTEMPTS;
  }, []);

  const recordAttempt = useCallback(() => {
    attemptsRef.current.push(Date.now());
  }, []);

  const getSecondsRemaining = useCallback(() => {
    if (attemptsRef.current.length === 0) return 0;
    const oldest = attemptsRef.current[0];
    const elapsed = Date.now() - oldest;
    return Math.max(0, Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 1000));
  }, []);

  return { canAttempt, recordAttempt, getSecondsRemaining };
}

// --- Security: Input sanitization ---
function sanitizeInput(value: string, maxLength: number): string {
  return value.replace(/[<>"'&]/g, '').trim().slice(0, maxLength);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres';
  if (password.length > 128) return 'A senha é muito longa';
  if (!/[A-Z]/.test(password)) return 'A senha deve conter pelo menos uma letra maiúscula';
  if (!/[a-z]/.test(password)) return 'A senha deve conter pelo menos uma letra minúscula';
  if (!/[0-9]/.test(password)) return 'A senha deve conter pelo menos um número';
  return null;
}

// --- Security: Sanitize error messages (never leak backend details) ---
function getSafeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('invalid login')) return 'Email ou senha incorretos';
    if (msg.includes('email not confirmed')) return 'Confirme seu email antes de entrar';
    if (msg.includes('user already registered')) return 'Este email já está cadastrado';
    if (msg.includes('signup is disabled')) return 'Cadastro temporariamente indisponível';
    if (msg.includes('rate limit') || msg.includes('too many')) return 'Muitas tentativas. Aguarde um momento.';
    if (msg.includes('password') && msg.includes('leak')) return 'Esta senha foi encontrada em vazamentos de dados. Escolha outra.';
  }
  return 'Erro ao autenticar. Tente novamente.';
}

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const rateLimiter = useRateLimiter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Rate limiting check
    if (!rateLimiter.canAttempt()) {
      const secs = rateLimiter.getSecondsRemaining();
      setError(`Muitas tentativas. Aguarde ${secs}s antes de tentar novamente.`);
      return;
    }

    // Validate email
    const cleanEmail = sanitizeInput(email, 255).toLowerCase();
    if (!validateEmail(cleanEmail)) {
      setError('Informe um email válido');
      return;
    }

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Validate display name for signup
    const cleanName = sanitizeInput(displayName, 100);
    if (!isLogin && cleanName.length < 2) {
      setError('Informe seu nome (mínimo 2 caracteres)');
      return;
    }

    setSubmitting(true);
    rateLimiter.recordAttempt();

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { display_name: cleanName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setSignupSuccess(true);
      }
    } catch (err: unknown) {
      setError(getSafeErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-8 text-center space-y-4">
          <div className="text-4xl">📧</div>
          <h2 className="text-xl font-bold text-foreground">Verifique seu email</h2>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para seu email.
            Clique no link para ativar sua conta.
          </p>
          <button
            onClick={() => { setSignupSuccess(false); setIsLogin(true); }}
            className="text-sm text-primary hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Guitar Theory</h1>
          <p className="text-sm text-muted-foreground mt-1">Estudo Visual Interativo</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-lg">
          <h2 className="text-lg font-bold text-foreground text-center">
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nome</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Seu nome"
                  maxLength={100}
                  autoComplete="off"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="seu@email.com"
                required
                maxLength={255}
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="••••••••"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
              {!isLogin && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Mínimo 8 caracteres, com maiúscula, minúscula e número
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              {submitting ? 'Aguarde...' : isLogin ? 'Entrar' : 'Criar Conta'}
            </button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            {isLogin ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
