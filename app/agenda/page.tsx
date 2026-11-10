"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, or, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

interface Agendamento {
  id: string;
  tituloServico: string;
  nomeTrabalhador: string;
  clienteId: string;
  trabalhadorId: string;
  dataAgendada: string;
  status: string;
}

export default function MinhaAgenda() {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  useEffect(() => {
    const buscarAgenda = async (uid: string) => {
      try {
        const q = query(
          collection(db, "agendamentos"),
          or(where("clienteId", "==", uid), where("trabalhadorId", "==", uid))
        );
        
        const querySnapshot = await getDocs(q);
        const lista: Agendamento[] = [];

        querySnapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() } as Agendamento);
        });

        lista.sort((a, b) => new Date(a.dataAgendada).getTime() - new Date(b.dataAgendada).getTime());
        setAgendamentos(lista);
      } catch (error) {
        console.error("Erro ao buscar agenda:", error);
      } finally {
        setCarregando(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUsuarioId(user.uid);
        buscarAgenda(user.uid);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleAtualizarStatus = async (id: string, novoStatus: string) => {
    try {
      await updateDoc(doc(db, "agendamentos", id), { status: novoStatus });
      setAgendamentos(agendamentos.map(ag => ag.id === id ? { ...ag, status: novoStatus } : ag));
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  const handleRetirarOuCancelar = async (id: string, status: string) => {
    const mensagem = status === 'Concluído' 
      ? "Tem certeza que deseja retirar este serviço concluído da sua agenda? Ele não aparecerá mais aqui." 
      : "Tem certeza que deseja cancelar este agendamento?";

    const confirmacao = window.confirm(mensagem);
    if (!confirmacao) return;

    try {
      await deleteDoc(doc(db, "agendamentos", id));
      setAgendamentos((listaAntiga) => listaAntiga.filter((ag) => ag.id !== id));
    } catch (error) {
      console.error("Erro ao remover agendamento:", error);
    }
  };

  // FUNÇÃO DE MENSAGEM (Com inteligência de achar chat existente)
  const handleContato = async (trabalhadorId: string, clienteId: string) => {
    try {
      const chatsRef = collection(db, "chats");
      const q = query(
        chatsRef, 
        where("clienteId", "==", clienteId), 
        where("trabalhadorId", "==", trabalhadorId)
      );
      
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        router.push(`/chat/${querySnapshot.docs[0].id}`);
      } else {
        const novoChat = await addDoc(chatsRef, {
          clienteId: clienteId,
          trabalhadorId: trabalhadorId,
          criadoEm: new Date()
        });
        router.push(`/chat/${novoChat.id}`);
      }
    } catch(error) {
      console.error("Erro ao criar/abrir chat:", error);
      alert("Não foi possível abrir as mensagens. Tente novamente.");
    }
  };

  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-black font-bold text-xl animate-pulse">A carregar a tua agenda...</p></div>;

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-8">
      <header className="bg-[#1064C3] p-4 shadow-md flex items-center gap-4">
        <button onClick={() => router.push('/home')} className="text-black font-bold hover:underline">
          ← Voltar
        </button>
        <h1 className="text-xl font-bold text-black">Minha Agenda</h1>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full mt-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Serviços Agendados 📅</h2>

        {agendamentos.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500">Ainda não tens nenhum serviço agendado.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {agendamentos.map((agendamento) => {
              const isTrabalhador = usuarioId === agendamento.trabalhadorId;
              const dataFormatada = agendamento.dataAgendada.split('-').reverse().join('/');
              const isConcluido = agendamento.status === 'Concluído';

              return (
                <div key={agendamento.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block
                      ${agendamento.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${agendamento.status === 'Confirmado' ? 'bg-blue-100 text-blue-800' : ''}
                      ${agendamento.status === 'Concluído' ? 'bg-green-100 text-green-800' : ''}
                    `}>
                      {agendamento.status}
                    </span>
                    <h3 className="text-xl font-bold text-black">{agendamento.tituloServico}</h3>
                    <p className="text-gray-500 text-sm mt-1">
                      {isTrabalhador ? 'Cliente a ser atendido' : `Profissional: ${agendamento.nomeTrabalhador}`}
                    </p>
                  </div>

                  <div className="flex flex-col md:items-end gap-3">
                    <p className="font-bold text-lg text-gray-800">📅 {dataFormatada}</p>
                    <div className="flex gap-2 flex-wrap justify-end">
                      
                      {/* BOTÃO MENSAGEM DE VOLTA AQUI 👇 */}
                      <button 
                        onClick={() => handleContato(agendamento.trabalhadorId, agendamento.clienteId)} 
                        className="bg-blue-50 border border-blue-200 text-blue-600 text-sm px-4 py-2 rounded-lg font-bold hover:bg-blue-100 hover:text-blue-700 transition"
                      >
                        Mensagem 💬
                      </button>

                      {isTrabalhador && agendamento.status === 'Pendente' && (
                        <button onClick={() => handleAtualizarStatus(agendamento.id, 'Confirmado')} className="bg-black text-white text-sm px-4 py-2 rounded-lg font-bold hover:bg-gray-800 transition">
                          Aceitar
                        </button>
                      )}
                      {isTrabalhador && agendamento.status === 'Confirmado' && (
                        <button onClick={() => handleAtualizarStatus(agendamento.id, 'Concluído')} className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition">
                          Concluir
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleRetirarOuCancelar(agendamento.id, agendamento.status)} 
                        className={`text-sm px-4 py-2 rounded-lg font-bold transition
                          ${isConcluido 
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                          }`}
                      >
                        {isConcluido ? 'Retirar da agenda' : 'Cancelar'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}