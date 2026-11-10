"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, or, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

interface ChatResumo {
  id: string;
  outroUsuarioNome: string;
}

export default function Mensagens() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatResumo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarConversas = async (userUid: string) => {
      try {
        const q = query(
          collection(db, "chats"),
          or(
            where("clienteId", "==", userUid),
            where("trabalhadorId", "==", userUid)
          )
        );
        
        const querySnapshot = await getDocs(q);
        const listaChats: ChatResumo[] = [];

        for (const documento of querySnapshot.docs) {
          const dadosChat = documento.data();
          const outroId = dadosChat.clienteId === userUid ? dadosChat.trabalhadorId : dadosChat.clienteId;

          const outroUserRef = doc(db, "users", outroId);
          const outroUserSnap = await getDoc(outroUserRef);
          const outroNome = outroUserSnap.exists() ? outroUserSnap.data().nome : "Usuário Desconhecido";

          listaChats.push({
            id: documento.id,
            outroUsuarioNome: outroNome,
          });
        }

        setChats(listaChats);
      } catch (error) {
        console.error("Erro ao buscar conversas:", error);
      } finally {
        setCarregando(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        buscarConversas(user.uid);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleExcluirChat = async (id: string) => {
    const confirmacao = window.confirm("Tens a certeza que desejas apagar esta conversa?");
    if (!confirmacao) return;

    try {
      await deleteDoc(doc(db, "chats", id));
      setChats((chatsAntigos) => chatsAntigos.filter((chat) => chat.id !== id));
    } catch (error) {
      console.error("Erro ao excluir chat:", error);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-black font-bold text-xl animate-pulse">A carregar mensagens...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#1064C3] p-4 shadow-md flex items-center gap-4">
        <button onClick={() => router.push('/home')} className="text-black font-bold hover:underline">
          ← Voltar
        </button>
        <h1 className="text-xl font-bold text-black">Caixa de Entrada</h1>
      </header>

      <div className="p-8 max-w-2xl mx-auto w-full mt-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Minhas Conversas 💬</h2>
        
        {chats.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500">Ainda não tens nenhuma conversa ativa.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {chats.map((chat) => (
              <div key={chat.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between gap-4">
                
                <button onClick={() => router.push(`/chat/${chat.id}`)} className="flex items-center gap-4 flex-1 text-left">
                  <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-[#1064C3] font-bold text-2xl">
                    {chat.outroUsuarioNome.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-black text-lg">{chat.outroUsuarioNome}</h3>
                    <p className="text-sm text-gray-500">Toca para abrir a conversa</p>
                  </div>
                </button>

                <button 
                  onClick={() => handleExcluirChat(chat.id)}
                  className="p-3 rounded-lg bg-red-50 text-red-600 font-bold hover:bg-red-100 transition"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}