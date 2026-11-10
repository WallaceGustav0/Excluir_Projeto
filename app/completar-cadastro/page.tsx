"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function CompletarCadastro() {
  const router = useRouter();
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);
  
  const [nome, setNome] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("CLIENTE");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuarioAtual(user);
        if (user.displayName) setNome(user.displayName);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || nome.length < 3) {
      alert("Por favor, digite seu nome real e completo.");
      return;
    }

    setCarregando(true);
    try {
      await setDoc(doc(db, "users", usuarioAtual.uid), {
        nome: nome,
        email: usuarioAtual.email || "", 
        tipo_usuario: tipoUsuario,
        criadoEm: new Date()
      });

      alert("Perfil criado com sucesso! Bem-vindo(a) ao LIGA?");
      router.push("/home");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      alert("Ocorreu um erro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#1064C3] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-black mb-2">Quase lá! 🎉</h1>
          <p className="text-gray-500 text-sm">Precisamos de mais alguns dados para criar o seu perfil corretamente.</p>
        </div>

        <form onSubmit={handleSalvar} className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo (Real)</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: João da Silva"
              required
              className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Como você quer usar o app?</label>
            <select 
              value={tipoUsuario}
              onChange={(e) => setTipoUsuario(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3] bg-white font-medium"
            >
              <option value="CLIENTE">Quero contratar (Cliente)</option>
              <option value="TRABALHADOR">Quero oferecer serviços (Trabalhador)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={carregando}
            className="w-full bg-[#1064C3] text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 mt-2"
          >
            {carregando ? "Salvando..." : "Concluir Cadastro"}
          </button>
        </form>
      </div>
    </main>
  );
}