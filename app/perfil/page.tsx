"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "../firebase";

interface UsuarioData {
  nome: string;
  tipo_usuario: string; // 'cliente' ou 'trabalhador'
}

interface HistoricoItem {
  id: string;
  tituloServico: string;
  dataAgendada: string;
}

export default function Perfil() {
  const router = useRouter();
  const [usuarioData, setUsuarioData] = useState<UsuarioData | null>(null);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // 1. Busca os dados do usuário (Nome e Tipo)
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dados = docSnap.data() as UsuarioData;
          setUsuarioData(dados);

          // 2. Busca o histórico de serviços concluídos (como Cliente ou Trabalhador)
          const campoBusca = dados.tipo_usuario === 'trabalhador' ? "trabalhadorId" : "clienteId";
          const qHistorico = query(
            collection(db, "agendamentos"),
            where(campoBusca, "==", user.uid),
            where("status", "==", "Concluído") // Só queremos o histórico finalizado
          );
          
          const snapHistorico = await getDocs(qHistorico);
          const listaHistorico: HistoricoItem[] = [];
          
          snapHistorico.forEach(doc => {
            listaHistorico.push({ id: doc.id, ...doc.data() } as HistoricoItem);
          });
          
          // Ordena pela data mais recente
          listaHistorico.sort((a, b) => new Date(b.dataAgendada).getTime() - new Date(a.dataAgendada).getTime());
          setHistorico(listaHistorico);
        }
      } else {
        router.push("/");
      }
      setCarregando(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleSair = async () => {
    await signOut(auth);
    router.push("/");
  };

  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-black font-bold text-xl animate-pulse">A carregar perfil...</p></div>;
  if (!usuarioData) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-black font-bold">Usuário não encontrado.</p></div>;

  const tituloHistorico = usuarioData.tipo_usuario === 'trabalhador' ? 'Histórico de Serviços Realizados 🛠️' : 'Histórico de Pedidos de Serviço 📦';
  const textoVazio = usuarioData.tipo_usuario === 'trabalhador' ? 'Ainda não realizaste nenhum serviço.' : 'Ainda não fizeste nenhum pedido de serviço.';

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-8">
      <header className="bg-[#1064C3] p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/home')} className="text-black font-bold hover:underline">
            ← Voltar
          </button>
          <h1 className="text-xl font-bold text-black">O Meu Perfil</h1>
        </div>
        {/* O BOTÃO DE LOGOUT AGORA FICA AQUI 👇 */}
        <button 
          onClick={handleSair}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-800 transition"
        >
          Logout (Sair)
        </button>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full mt-4 flex flex-col gap-8">
        
        {/* CARTÃO DE DADOS DO USUÁRIO */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-[#1064C3] font-bold text-4xl border-4 border-blue-100 shadow-inner">
            {usuarioData.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
              {usuarioData.tipo_usuario}
            </span>
            <h2 className="text-3xl font-bold text-black mb-1 break-all">{usuarioData.nome}</h2>
            <p className="text-gray-500 font-medium">{auth.currentUser?.email}</p>
          </div>
        </div>

        {/* ÁREA DE HISTÓRICO */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">{tituloHistorico}</h3>
          
          {historico.length === 0 ? (
            <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50 text-center">
              <p className="text-gray-500 text-center italic">{textoVazio}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {historico.map((item) => {
                const dataFormatada = item.dataAgendada.split('-').reverse().join('/');
                return (
                  <div key={item.id} className="p-5 border border-gray-100 rounded-xl bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <p className="font-bold text-black text-lg">{item.tituloServico}</p>
                    <p className="font-medium text-gray-600 bg-white border border-gray-100 px-3 py-1 rounded-full text-sm">📅 Concluído em: {dataFormatada}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}