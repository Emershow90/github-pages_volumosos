import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  Shield, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  KeyRound
} from 'lucide-react';
import { 
  loginWithEmail, 
  signUpWithEmail, 
  recoverPassword, 
  googleSignIn 
} from '../lib/supabaseAuth';
import { UserRole } from '../types/Usuario';

interface LoginScreenProps {
  onAuthSuccess: (user: any, profile: any) => void;
}

type AuthMode = 'login' | 'register' | 'recover';

export default function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Common states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Coordenador);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Clear alerts on mode change
  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const user = await loginWithEmail(email, password);
      // Fetch profile in parent component
      onAuthSuccess(user, null);
    } catch (err: any) {
      console.error(err);
      let BrazilianMsg = 'Erro ao realizar login. Verifique suas credenciais.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        BrazilianMsg = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/invalid-email') {
        BrazilianMsg = 'Formato de e-mail inválido.';
      } else if (err.code === 'auth/user-disabled') {
        BrazilianMsg = 'Este usuário foi desativado.';
      } else if (err.code === 'auth/operation-not-allowed') {
        BrazilianMsg = 'Autenticação por e-mail desativada. Use o Google Workspace ou ative no console do Firebase.';
      }
      setError(BrazilianMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { user, profile } = await signUpWithEmail(email, password, name, role);
      setSuccessMsg('Cadastro realizado com sucesso!');
      setTimeout(() => {
        onAuthSuccess(user, profile);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      let BrazilianMsg = 'Erro ao realizar o cadastro.';
      if (err.code === 'auth/email-already-in-use') {
        BrazilianMsg = 'Este e-mail já está sendo utilizado.';
      } else if (err.code === 'auth/invalid-email') {
        BrazilianMsg = 'Formato de e-mail inválido.';
      } else if (err.code === 'auth/weak-password') {
        BrazilianMsg = 'A senha escolhida é muito fraca.';
      } else if (err.code === 'auth/operation-not-allowed') {
        BrazilianMsg = 'O login por e-mail/senha não está ativado neste projeto Firebase. Por favor, use "Acessar com Google Workspace".';
      }
      setError(BrazilianMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, digite seu e-mail para recuperar a senha.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await recoverPassword(email);
      setSuccessMsg('E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.');
      setEmail('');
    } catch (err: any) {
      console.error(err);
      let BrazilianMsg = 'Erro ao enviar e-mail de recuperação.';
      if (err.code === 'auth/user-not-found') {
        BrazilianMsg = 'Nenhuma conta cadastrada com este e-mail.';
      } else if (err.code === 'auth/invalid-email') {
        BrazilianMsg = 'Formato de e-mail inválido.';
      }
      setError(BrazilianMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, null);
      }
    } catch (err: any) {
      console.error(err);
      setError('Falha na autenticação com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative ambient background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />
      
      {/* Visual Tech Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293706_1px,transparent_1px),linear-gradient(to_bottom,#1f293706_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-[#0a0a0f] border border-white/5 rounded-2xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10"
      >
        {/* Header Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black text-white tracking-wider uppercase">SISTEMA RADAR</h1>
          <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mt-1">Console de Operações de Lojas</p>
        </div>

        {/* Alerts Banner Container */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex gap-2.5 items-start text-red-400 text-xs font-bold leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex gap-2.5 items-start text-emerald-400 text-xs font-bold leading-relaxed"
            >
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Authentication Form Switch */}
        <AnimatePresence mode="wait">
          {mode === 'login' && (
            <motion.form 
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">E-mail Corporativo</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase">Senha de Acesso</label>
                  <button 
                    type="button"
                    onClick={() => handleModeChange('recover')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold tracking-wider uppercase transition-colors"
                  >
                    Esqueceu?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl py-3 text-sm font-black tracking-widest uppercase hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Entrar <LogIn className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}

          {mode === 'register' && (
            <motion.form 
              key="register"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleRegister}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">Nome Completo</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Emerson Oliveira"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">E-mail Corporativo</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">Cargo / Perfil</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Shield className="w-4 h-4" />
                  </span>
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all appearance-none font-medium cursor-pointer"
                  >
                    <option value={UserRole.Admin}>Administrador</option>
                    <option value={UserRole.Coordenador}>Coordenador</option>
                    <option value={UserRole.Operador}>Operador</option>
                    <option value={UserRole.Guest}>Visualizador (Guest)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">Defina sua Senha</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl py-3 text-sm font-black tracking-widest uppercase hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Cadastrar <UserPlus className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}

          {mode === 'recover' && (
            <motion.form 
              key="recover"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleRecover}
              className="space-y-4"
            >
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 font-medium leading-relaxed mb-2">
                Esqueceu a senha? Digite seu e-mail abaixo. Nós lhe enviaremos um link seguro do Firebase para você redefinir sua senha imediatamente e evitar qualquer perda de acesso ou falhas no sistema.
              </div>

              <div>
                <label className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">E-mail Cadastrado</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu-email@empresa.com"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl py-3 text-sm font-black tracking-widest uppercase hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Recuperar Senha <KeyRound className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Auth Mode Toggle Footer */}
        <div className="mt-6 pt-5 border-t border-white/5 text-center flex flex-col gap-2">
          {mode === 'login' && (
            <>
              <p className="text-xs text-zinc-500 font-medium">
                Não possui conta?{' '}
                <button 
                  onClick={() => handleModeChange('register')}
                  className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-colors"
                >
                  Criar conta
                </button>
              </p>
            </>
          )}

          {mode === 'register' && (
            <p className="text-xs text-zinc-500 font-medium">
              Já possui conta?{' '}
              <button 
                onClick={() => handleModeChange('login')}
                className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-colors"
              >
                Fazer login
              </button>
            </p>
          )}

          {mode === 'recover' && (
            <p className="text-xs text-zinc-500 font-medium">
              Lembrou sua senha?{' '}
              <button 
                onClick={() => handleModeChange('login')}
                className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-colors"
              >
                Voltar ao login
              </button>
            </p>
          )}
        </div>

        {/* Separator */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-[#0a0a0f] px-3 text-[9px] text-zinc-500 font-black tracking-widest uppercase">OU</span>
        </div>

        {/* Google Authentication Integration */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-zinc-900 border border-white/5 hover:bg-zinc-850 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.87-2.6-2.6-4.53-5.33-4.53z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Acessar com Google Workspace
        </button>

      </motion.div>
    </div>
  );
}
