"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

// Declaração para o TypeScript não reclamar do window
declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

export default function Acesso() {
  const router = useRouter();
  
  const [telefone, setTelefone] = useState("");
  const [codigoSms, setCodigoSms] = useState("");
  const [etapa, setEtapa] = useState<"TELEFONE" | "CODIGO">("TELEFONE");
  const [carregando, setCarregando] = useState(false);

  // ==========================================
  // FUNÇÃO 1: LOGIN COM GOOGLE
  // ==========================================
  const handleLoginGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      verificarCadastro(result.user.uid);
    } catch (error) {
      console.error("Erro no login com Google:", error);
    }
  };

  // ==========================================
  // FUNÇÃO 2: ENVIAR SMS
  // ==========================================
  const handleEnviarSms = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpa o número para deixar só os dígitos (ex: 21999999999)
    const numeroLimpo = telefone.replace(/\D/g, '');
    if (numeroLimpo.length < 10) {
      alert("Digite um DDD e número de celular válido.");
      return;
    }

    setCarregando(true);
    
    try {
      // Cria o verificador invisível do Google (anti-robô)
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
      }

      // Adiciona o código do Brasil (+55) automaticamente
      const numeroFormatado = `+55${numeroLimpo}`;
      
      const appVerifier = window.recaptchaVerifier;
      const confirmationResult = await signInWithPhoneNumber(auth, numeroFormatado, appVerifier);
      
      // Guarda o resultado para usar na próxima tela
      window.confirmationResult = confirmationResult;
      setEtapa("CODIGO");
      alert("SMS enviado! Verifique seu celular.");

    } catch (error) {
      console.error("Erro ao enviar SMS:", error);
      alert("Erro ao enviar SMS. Tente novamente mais tarde.");
      // Limpa o recaptcha se der erro
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setCarregando(false);
    }
  };

  // ==========================================
  // FUNÇÃO 3: VERIFICAR O CÓDIGO DO SMS
  // ==========================================
  const handleVerificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoSms.length !== 6) {
      alert("O código deve ter 6 números.");
      return;
    }

    setCarregando(true);
    try {
      const result = await window.confirmationResult.confirm(codigoSms);
      verificarCadastro(result.user.uid);
    } catch (error) {
      console.error("Erro ao verificar código:", error);
      alert("Código inválido. Tente novamente.");
      setCarregando(false);
    }
  };

  // ==========================================
  // FUNÇÃO 4: VERIFICAR SE É NOVO OU ANTIGO
  // ==========================================
  const verificarCadastro = async (uid: string) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // É NOVO! Vai preencher o nome
      router.push("/completar-cadastro");
    } else {
      // JÁ TEM CONTA! Vai pra Home
      router.push("/home");
    }
  };

  return (
    <main className="min-h-screen bg-[#1064C3] flex flex-col items-center justify-center p-4">
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-black">LIGA?</h1>
        <p className="text-sm text-black font-semibold uppercase tracking-widest">Pra quem</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Entrar ou Cadastrar</h2>

        {/* Esse div é obrigatório para o Firebase mandar o SMS, mas fica invisível */}
        <div id="recaptcha-container"></div>

        {/* TELA 1: PEDIR O TELEFONE */}
        {etapa === "TELEFONE" && (
          <>
            <form onSubmit={handleEnviarSms} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Seu Celular (com DDD)</label>
                <input
                  type="tel"
                  placeholder="(21) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-300 outline-none focus:border-[#1064C3] text-lg tracking-wide"
                  maxLength={15}
                />
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="mt-2 w-full rounded-xl bg-[#1064C3] p-4 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 shadow-md"
              >
                {carregando ? "Enviando..." : "Receber código por SMS"}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-4 w-full">
              <div className="flex items-center gap-2 text-gray-400">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-sm font-medium">OU</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              <button 
                type="button"
                onClick={handleLoginGoogle}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-50 transition shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar com o Google
              </button>
            </div>
          </>
        )}

        {/* TELA 2: DIGITAR O CÓDIGO */}
        {etapa === "CODIGO" && (
          <form onSubmit={handleVerificarCodigo} className="flex flex-col gap-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">Enviamos um código de 6 dígitos para o número</p>
              <p className="font-bold text-[#1064C3] mt-1">{telefone}</p>
            </div>

            <div>
              <input
                type="number"
                placeholder="000000"
                value={codigoSms}
                onChange={(e) => setCodigoSms(e.target.value)}
                className="w-full p-4 rounded-lg border border-gray-300 outline-none focus:border-[#1064C3] text-center text-3xl font-bold tracking-widest"
                maxLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="mt-4 w-full rounded-xl bg-[#1064C3] p-4 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50 shadow-md"
            >
              {carregando ? "Verificando..." : "Confirmar Código"}
            </button>
            
            <button
              type="button"
              onClick={() => setEtapa("TELEFONE")}
              className="mt-2 text-sm text-gray-500 hover:underline"
            >
              Voltar e corrigir número
            </button>
          </form>
        )}

      </div>
    </main>
  );
} 