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
  googleSignIn,
  microsoftSignIn
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

  // Security & Validation States
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  // Email format verification (regex)
  const isValidEmail = (emailStr: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailStr);
  };

  // Clear alerts on mode change
  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit lockout
    if (lockoutTime && Date.now() < lockoutTime) {
      const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
      setError(`Muitas tentativas incorretas. Tente novamente em ${remaining} segundos.`);
      return;
    }
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (!isValidEmail(email)) {
      setError('O formato do e-mail digitado é inválido. Por favor, insira um e-mail válido.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const user = await loginWithEmail(email, password);
      // Reset rate-limiting counts upon success
      setLoginAttempts(0);
      setLockoutTime(null);
      // Fetch profile in parent component
      onAuthSuccess(user, null);
    } catch (err: any) {
      console.error(err);
      let BrazilianMsg = 'Erro ao realizar login. Verifique suas credenciais.';
      const errMsg = err.message || '';
      const errCode = err.code || '';
      if (
        errCode === 'auth/invalid-credential' || 
        errCode === 'auth/wrong-password' || 
        errCode === 'auth/user-not-found' ||
        errCode === 'invalid_credentials' ||
        errMsg.includes('Invalid login credentials')
      ) {
        BrazilianMsg = 'E-mail ou senha incorretos.';
      } else if (errCode === 'auth/invalid-email' || errCode === 'invalid_email' || errMsg.includes('Email format')) {
        BrazilianMsg = 'Formato de e-mail inválido.';
      } else if (errCode === 'auth/user-disabled' || errCode === 'user_disabled') {
        BrazilianMsg = 'Este usuário foi desativado.';
      } else if (errCode === 'auth/operation-not-allowed') {
        BrazilianMsg = 'Autenticação por e-mail desativada. Use o Google Workspace ou ative no console.';
      } else if (errMsg.includes('Email not confirmed')) {
        BrazilianMsg = 'E-mail não confirmado. Por favor, verifique sua caixa de entrada.';
      } else if (errMsg) {
        BrazilianMsg = errMsg;
      }

      // Brute-force local security lock
      const nextAttempts = loginAttempts + 1;
      setLoginAttempts(nextAttempts);
      if (nextAttempts >= 5) {
        setLockoutTime(Date.now() + 30000); // 30s lockout
        setLoginAttempts(0);
        setError('Muitas tentativas de login incorretas. Acesso bloqueado por 30 segundos por segurança.');
      } else {
        setError(`${BrazilianMsg} (Tentativas: ${nextAttempts}/5)`);
      }
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

    if (!isValidEmail(email)) {
      setError('O formato do e-mail digitado é inválido. Por favor, insira um e-mail válido.');
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
      const errMsg = err.message || '';
      const errCode = err.code || '';
      if (
        errCode === 'auth/email-already-in-use' || 
        errCode === 'user_already_exists' || 
        errMsg.includes('already registered') || 
        errMsg.includes('already exists')
      ) {
        BrazilianMsg = 'Este e-mail já está sendo utilizado.';
      } else if (errCode === 'auth/invalid-email' || errCode === 'invalid_email') {
        BrazilianMsg = 'Formato de e-mail inválido.';
      } else if (errCode === 'auth/weak-password' || errMsg.includes('weak') || errMsg.includes('at least 6 characters')) {
        BrazilianMsg = 'A senha escolhida é muito fraca ou curta (mínimo 6 caracteres).';
      } else if (errMsg) {
        BrazilianMsg = errMsg;
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

    if (!isValidEmail(email)) {
      setError('O formato do e-mail digitado é inválido. Por favor, insira um e-mail válido.');
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
      const errMsg = err.message || '';
      const errCode = err.code || '';
      if (errCode === 'auth/user-not-found' || errMsg.includes('User not found')) {
        BrazilianMsg = 'Nenhuma conta cadastrada com este e-mail.';
      } else if (errCode === 'auth/invalid-email' || errCode === 'invalid_email') {
        BrazilianMsg = 'Formato de e-mail inválido.';
      } else if (errMsg) {
        BrazilianMsg = errMsg;
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

  const handleMicrosoftSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await microsoftSignIn();
      if (res) {
        onAuthSuccess(res.user, null);
      }
    } catch (err: any) {
      console.error(err);
      setError('Falha na autenticação com Microsoft 365.');
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
              role="alert"
              aria-live="polite"
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
              role="status"
              aria-live="polite"
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
              method="POST"
              noValidate
              aria-label="Formulário de login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <div>
                <label htmlFor="login-email" className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">E-mail Corporativo</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email"
                    id="login-email"
                    name="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="login-senha" className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase">Senha de Acesso</label>
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
                    id="login-senha"
                    name="senha"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar senha de acesso" : "Mostrar senha de acesso"}
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
              method="POST"
              noValidate
              aria-label="Formulário de cadastro"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleRegister}
              className="space-y-4"
            >
              <div>
                <label htmlFor="reg-nome" className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">Nome Completo</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    type="text"
                    id="reg-nome"
                    name="username"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Emerson Oliveira"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">E-mail Corporativo</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email"
                    id="reg-email"
                    name="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-perfil" className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">Cargo / Perfil</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Shield className="w-4 h-4" />
                  </span>
                  <select 
                    id="reg-perfil"
                    name="perfil"
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
                <label htmlFor="reg-senha" className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">Defina sua Senha</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    id="reg-senha"
                    name="new-password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#111116] border border-white/5 rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-600 font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar nova senha" : "Mostrar nova senha"}
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
              method="POST"
              noValidate
              aria-label="Formulário de recuperação de senha"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleRecover}
              className="space-y-4"
            >
              <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 font-medium leading-relaxed mb-2">
                Esqueceu a senha? Digite seu e-mail abaixo. Nós lhe enviaremos um link seguro do Supabase para você redefinir sua senha imediatamente e evitar qualquer perda de acesso ou falhas no sistema.
              </div>

              <div>
                <label htmlFor="rec-email" className="block text-[10px] text-zinc-400 font-black tracking-widest uppercase mb-1.5">E-mail Cadastrado</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input 
                    type="email"
                    id="rec-email"
                    name="email"
                    required
                    autoComplete="email"
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

        {/* Separator & Corporate SSO */}
        {mode === 'login' && (
          <>
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <span className="relative bg-[#0a0a0f] px-3 text-[9px] text-zinc-500 font-black tracking-widest uppercase">OU ENTRAR COM</span>
            </div>

            <div className="space-y-3">
              {/* Google Authentication */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
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
                <span>Acessar com Google Workspace</span>
              </button>

              {/* Microsoft Authentication */}
              <button
                type="button"
                onClick={handleMicrosoftSignIn}
                disabled={loading}
                className="w-full bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                  <path fill="#f35022" d="M0 0h11v11H0z"/>
                  <path fill="#80bb0a" d="M12 0h11v11H12z"/>
                  <path fill="#00a1f1" d="M0 12h11v11H0z"/>
                  <path fill="#ffb900" d="M12 12h11v11H12z"/>
                </svg>
                <span>Acessar com Microsoft 365</span>
              </button>
            </div>
          </>
        )}

      </motion.div>
    </div>
  );
}
