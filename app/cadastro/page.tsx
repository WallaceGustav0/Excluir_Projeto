"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase"; // Ajuste o caminho se necessário

export default function Cadastro() {
  const router = useRouter();

  // Estados dos campos
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("cliente");

  // ESTADOS DOS OLHINHOS (Novo!)
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem!");
      return;
    }

    setCarregando(true);

    try {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      const usuarioFirebase = credencial.user;

      await setDoc(doc(db, "users", usuarioFirebase.uid), {
        uid: usuarioFirebase.uid,
        nome: nome,
        email: email,
        tipo_usuario: tipoUsuario,
        criado_em: serverTimestamp(),
      });

      alert("Conta criada com sucesso! 🎉");
      router.push("/");
      
    } catch (error: any) {
      console.error(error);
      setErro("Erro ao criar conta. Tente outra senha ou e-mail.");
    } finally {
      setCarregando(false);
    }
  };

  // Ícones do olho em SVG para reutilizar
  const IconeOlhoAberto = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
  );
  const IconeOlhoFechado = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#1064C3] p-4">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-black">LIGA?</h1>
        <p className="text-sm text-black font-semibold">Pra quem</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-center text-3xl font-bold text-black">Cadastro</h2>
        
        {erro && <p className="mb-4 text-center text-sm font-bold text-red-500">{erro}</p>}
        
        <form onSubmit={handleCadastro} className="flex flex-col gap-3">
          
          {/* Nome */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
            <input type="text" placeholder="Digite seu Nome" required value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-[#1064C3] focus:ring-1 focus:ring-[#1064C3]" />
          </div>

          {/* E-mail */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
            <input type="email" placeholder="Digite seu E-mail" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 p-3 text-black outline-none transition focus:border-[#1064C3] focus:ring-1 focus:ring-[#1064C3]" />
          </div>

          {/* Senha COM OLHINHO */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Senha</label>
            <div className="relative">
              <input 
                type={mostrarSenha ? "text" : "password"} 
                placeholder="Crie uma Senha (mín. 6 letras)" 
                required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} 
                className="w-full rounded-lg border border-gray-300 p-3 pr-10 text-black outline-none transition focus:border-[#1064C3] focus:ring-1 focus:ring-[#1064C3]" 
              />
              <button 
                type="button" 
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1064C3]"
              >
                {mostrarSenha ? <IconeOlhoFechado /> : <IconeOlhoAberto />}
              </button>
            </div>
          </div>

          {/* Confirmar Senha COM OLHINHO */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar senha</label>
            <div className="relative">
              <input 
                type={mostrarConfirmarSenha ? "text" : "password"} 
                placeholder="Digite novamente sua senha" 
                required value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} 
                className="w-full rounded-lg border border-gray-300 p-3 pr-10 text-black outline-none transition focus:border-[#1064C3] focus:ring-1 focus:ring-[#1064C3]" 
              />
              <button 
                type="button" 
                onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#1064C3]"
              >
                {mostrarConfirmarSenha ? <IconeOlhoFechado /> : <IconeOlhoAberto />}
              </button>
            </div>
          </div>

          {/* Botões de Seleção */}
          <div className="mt-2">
            <p className="mb-2 text-center text-sm font-medium text-gray-700">Como você deseja usar o app?</p>
            <div className="flex justify-center gap-6">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="tipo_usuario" value="cliente" checked={tipoUsuario === "cliente"} onChange={(e) => setTipoUsuario(e.target.value)} className="h-4 w-4 accent-[#1064C3]" />
                <span className="text-sm text-gray-700">Cliente</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="tipo_usuario" value="trabalhador" checked={tipoUsuario === "trabalhador"} onChange={(e) => setTipoUsuario(e.target.value)} className="h-4 w-4 accent-[#1064C3]" />
                <span className="text-sm text-gray-700">Trabalhador</span>
              </label>
            </div>
          </div>

          <button type="submit" disabled={carregando} className="mt-4 w-full rounded-lg bg-[#1064C3] p-3 font-bold text-black transition hover:bg-blue-800 disabled:opacity-50">
            {carregando ? "Criando conta..." : "Cadastrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
           <Link href="/" className="font-bold text-[#1064C3] hover:underline">Fazer login</Link>
        </p>
      </div>
    </main>
  );
}