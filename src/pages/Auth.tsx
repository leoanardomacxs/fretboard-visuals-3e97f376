import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Auth: React.FC = () => {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

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
    setSubmitting(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!displayName.trim()) {
          setError('Informe seu nome');
          setSubmitting(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setSignupSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
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
            Enviamos um link de confirmação para <span className="font-semibold text-foreground">{email}</span>.
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

          <form onSubmit={handleSubmit} className="space-y-4">
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
                minLength={6}
              />
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
