import React, { useState } from 'react';
import LoginTilt from './LoginTilt';
import { loginWithEmail, ensureUserProfile, getUserProfile } from '../lib/supabaseAuth';

interface LoginScreenProps {
  onAuthSuccess: (user: any, profile: any) => void;
}

export default function LoginScreen({ onAuthSuccess }: LoginScreenProps) {
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const handleLoginSubmit = async (email: string, password: string): Promise<void> => {
    setErrorMessage(undefined);
    try {
      const user = await loginWithEmail(email, password);
      let profile = null;
      try {
        profile = (await getUserProfile(user.uid || user.id)) || (await ensureUserProfile(user));
      } catch (pErr) {
        console.warn('[LoginScreen] Aviso ao obter perfil remoto, criando perfil padrão:', pErr);
        profile = await ensureUserProfile(user);
      }
      onAuthSuccess(user, profile);
    } catch (err: unknown) {
      console.error('[LoginScreen] Falha na autenticação:', err);
      let msg = 'Erro ao realizar login. Verifique suas credenciais.';
      const rawMsg = ((err as any)?.msg) || ((err as Error)?.message) || (typeof err === 'string' ? err : '');
      const errCode = (err as any)?.code || (err as any)?.error_code || '';

      if (
        errCode === 'auth/invalid-credential' ||
        errCode === 'auth/wrong-password' ||
        errCode === 'auth/user-not-found' ||
        errCode === 'invalid_credentials' ||
        rawMsg.includes('Invalid login credentials')
      ) {
        msg = 'E-mail ou senha incorretos.';
      } else if (errCode === 'auth/invalid-email' || errCode === 'invalid_email' || rawMsg.includes('Email format')) {
        msg = 'Formato de e-mail corporativo inválido.';
      } else if (errCode === 'auth/user-disabled' || errCode === 'user_disabled') {
        msg = 'Este usuário foi desativado no sistema.';
      } else if (rawMsg.includes('Email not confirmed')) {
        msg = 'E-mail não confirmado. Verifique sua caixa de entrada.';
      } else if (rawMsg.includes('fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('Failed to fetch')) {
        msg = 'Erro de conexão com o servidor. Verifique sua internet.';
      } else if (rawMsg) {
        msg = rawMsg;
      }

      setErrorMessage(msg);
    }
  };

  return <LoginTilt onSubmit={handleLoginSubmit} errorMessage={errorMessage} />;
}
