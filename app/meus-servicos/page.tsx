"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

interface Servico {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
}

export default function MeusServicos() {
  const router = useRouter();
  const [meusServicos, setMeusServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarMeusServicos = async (userUid: string) => {
      try {
        const q = query(collection(db, "servicos"), where("trabalhadorId", "==", userUid));
        const querySnapshot = await getDocs(q);

        const lista: Servico[] = [];
        querySnapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() } as Servico);
        });

        setMeusServicos(lista);
      } catch (error) {
        console.error("Erro ao buscar seus serviços:", error);
      } finally {
        setCarregando(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        buscarMeusServicos(user.uid);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleExcluir = async (id: string) => {
    const confirmacao = window.confirm("Tem certeza que deseja apagar este anúncio? Essa ação não pode ser desfeita.");
    
    if (!confirmacao) return;

    try {
      await deleteDoc(doc(db, "servicos", id));
      setMeusServicos((listaAntiga) => listaAntiga.filter((servico) => servico.id !== id));
      alert("Serviço excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir serviço:", error);
      alert("Ocorreu um erro ao tentar excluir.");
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-black font-bold text-xl animate-pulse">Buscando seus serviços...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#1064C3] p-4 shadow-md flex items-center gap-4">
        <Link href="/home" className="text-black font-bold hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-xl font-bold text-black">Meus Serviços</h1>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full mt-4">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Gerenciar Anúncios 🛠️</h2>
          
          {/* LÓGICA 1: O botão do topo SÓ aparece se já existir algum serviço criado */}
          {meusServicos.length > 0 && (
            <Link 
              href="/servicos/novo" 
              className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition shadow-sm"
            >
              + Novo Anúncio
            </Link>
          )}
        </div>
        
        {meusServicos.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-200 text-center flex flex-col items-center justify-center">
            <div className="text-6xl mb-4"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Nenhum serviço por aqui</h3>
            <p className="text-gray-500 mb-8 max-w-md">
              Você ainda não tem nenhum anúncio ativo. Crie seu primeiro serviço para que os clientes possam te encontrar!
            </p>
            
            {/* LÓGICA 2: O botão principal, grande e chamativo no centro da tela */}
            <Link 
              href="/servicos/novo" 
              className="inline-block bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-gray-800 hover:scale-105 transition-all shadow-md"
            >
              + Criar Meu Primeiro Anúncio
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {meusServicos.map((servico) => (
              <div key={servico.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col hover:shadow-md transition">
                
                <div className="mb-3">
                  <span className="text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    {servico.categoria}
                  </span>
                </div>
                
                <h4 className="text-xl font-bold text-black mb-2 line-clamp-1" title={servico.titulo}>
                  {servico.titulo}
                </h4>
                <p className="text-sm text-gray-600 line-clamp-2 mb-6 flex-1">
                  {servico.descricao}
                </p>
                
                <div className="flex gap-2 mt-auto">
                  <Link 
                    href={`/servicos/${servico.id}`}
                    className="flex-1 text-center rounded-lg bg-gray-50 border border-gray-200 p-2 font-bold text-gray-700 transition hover:bg-[#1064C3] hover:text-black hover:border-[#1064C3]"
                  >
                    Visualizar
                  </Link>
                  <button 
                    onClick={() => handleExcluir(servico.id)}
                    title="Apagar Anúncio"
                    className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 font-bold text-red-600 transition hover:bg-red-100 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>
                
              </div>
            ))}
            
          </div>
        )}
      </div>
    </main>
  );
}