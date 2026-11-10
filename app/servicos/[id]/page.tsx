"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";

// Moldes
interface Servico {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  trabalhadorId: string;
  preco?: string;
  estado?: string;
  municipio?: string;
  datasDisponiveis?: string[]; // Adicionado para puxar a agenda do Firebase
}

interface Avaliacao {
  id: string;
  clienteId: string;
  nomeCliente: string;
  trabalhadorId: string;
  nota: number;
  comentario: string;
  data: string;
}

export default function DetalhesServico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [servico, setServico] = useState<Servico | null>(null);
  const [nomeTrabalhador, setNomeTrabalhador] = useState("Carregando...");
  const [carregando, setCarregando] = useState(true);
  const [usuarioAtual, setUsuarioAtual] = useState<any>(null);

  // Estados do Agendamento
  const [mostrarAgendamento, setMostrarAgendamento] = useState(false);
  const [dataAgendamento, setDataAgendamento] = useState("");
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  // ESTADOS DE AVALIAÇÃO
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [podeAvaliar, setPodeAvaliar] = useState(false);
  const [nota, setNota] = useState(5);
  const [comentario, setComentario] = useState("");
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) setUsuarioAtual(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const buscarDetalhesEAvaliacoes = async () => {
      try {
        const docRef = doc(db, "servicos", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const dadosServico = { id: docSnap.id, ...docSnap.data() } as Servico;
          setServico(dadosServico);

          const trabalhadorRef = doc(db, "users", dadosServico.trabalhadorId);
          const trabalhadorSnap = await getDoc(trabalhadorRef);
          if (trabalhadorSnap.exists()) setNomeTrabalhador(trabalhadorSnap.data().nome);

          const qAvaliacoes = query(collection(db, "avaliacoes"), where("trabalhadorId", "==", dadosServico.trabalhadorId));
          const snapAvaliacoes = await getDocs(qAvaliacoes);
          const listaAv: Avaliacao[] = [];
          snapAvaliacoes.forEach(doc => listaAv.push({ id: doc.id, ...doc.data() } as Avaliacao));
          setAvaliacoes(listaAv.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));

          if (usuarioAtual && usuarioAtual.uid !== dadosServico.trabalhadorId) {
            const qConcluido = query(
              collection(db, "agendamentos"),
              where("clienteId", "==", usuarioAtual.uid),
              where("trabalhadorId", "==", dadosServico.trabalhadorId),
              where("status", "==", "Concluído")
            );
            const snapConcluido = await getDocs(qConcluido);
            
            const jaAvaliou = listaAv.some(av => av.clienteId === usuarioAtual.uid);

            if (!snapConcluido.empty && !jaAvaliou) {
              setPodeAvaliar(true);
            }
          }
        }
      } catch (error) {
        console.error("Erro geral:", error);
      } finally {
        setCarregando(false);
      }
    };

    if (usuarioAtual !== null) {
      buscarDetalhesEAvaliacoes();
    } else {
        buscarDetalhesEAvaliacoes();
    }
  }, [id, usuarioAtual]);

  // Função para formatar a data visualmente para o cliente (YYYY-MM-DD para DD/MM/YYYY)
  const formatarDataBr = (dataIso: string) => {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const handleContato = async () => {
    if (!usuarioAtual) return router.push("/");
    try {
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("clienteId", "==", usuarioAtual.uid), where("trabalhadorId", "==", servico?.trabalhadorId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        router.push(`/chat/${querySnapshot.docs[0].id}`);
      } else {
        const novoChat = await addDoc(chatsRef, {
          clienteId: usuarioAtual.uid,
          trabalhadorId: servico?.trabalhadorId,
          criadoEm: new Date()
        });
        router.push(`/chat/${novoChat.id}`);
      }
    } catch(error) {
      console.error("Erro chat:", error);
    }
  };

  const handleAgendar = async () => {
    if (!usuarioAtual) return router.push("/");
    if (!dataAgendamento) return alert("Por favor, selecione uma data disponível.");
    setSalvandoAgendamento(true);
    
    try {
      const qVerifica = query(
        collection(db, "agendamentos"),
        where("clienteId", "==", usuarioAtual.uid),
        where("servicoId", "==", servico?.id)
      );
      
      const snapVerifica = await getDocs(qVerifica);
      let temAgendamentoAtivo = false;

      snapVerifica.forEach((doc) => {
        const status = doc.data().status;
        if (status === "Pendente" || status === "Confirmado") {
          temAgendamentoAtivo = true;
        }
      });

      if (temAgendamentoAtivo) {
        alert("⚠️ Você já possui um agendamento em andamento para este serviço! Cancele-o na sua Agenda ou aguarde a conclusão para contratar novamente.");
        setSalvandoAgendamento(false);
        return;
      }

      await addDoc(collection(db, "agendamentos"), {
        servicoId: servico?.id,
        tituloServico: servico?.titulo,
        nomeTrabalhador: nomeTrabalhador,
        clienteId: usuarioAtual.uid,
        trabalhadorId: servico?.trabalhadorId,
        dataAgendada: dataAgendamento,
        status: "Pendente",
        criadoEm: new Date()
      });
      
      alert("Serviço agendado com sucesso!");
      router.push("/home"); // Redirecionando para a home para o cliente ver nas notificações
    } catch (error) {
      console.error("Erro agendar:", error);
      alert("Ocorreu um erro. Tente novamente.");
      setSalvandoAgendamento(false);
    }
  };

  const handleEnviarAvaliacao = async () => {
    if (!comentario.trim()) return alert("Escreva como foi o serviço!");
    setEnviandoAvaliacao(true);
    try {
      const userRef = doc(db, "users", usuarioAtual.uid);
      const userSnap = await getDoc(userRef);
      const nomeCli = userSnap.exists() ? userSnap.data().nome : "Cliente";

      const novaAvaliacao = {
        clienteId: usuarioAtual.uid,
        nomeCliente: nomeCli,
        trabalhadorId: servico?.trabalhadorId!,
        nota,
        comentario,
        data: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "avaliacoes"), novaAvaliacao);
      setAvaliacoes([{ id: docRef.id, ...novaAvaliacao }, ...avaliacoes]);
      setPodeAvaliar(false); 
      alert("Avaliação publicada com sucesso! Obrigado.");
    } catch (error) {
      console.error("Erro ao avaliar:", error);
      alert("Erro ao enviar avaliação.");
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  if (carregando) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-black font-bold text-xl animate-pulse">Carregando detalhes...</p></div>;
  if (!servico) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><p className="text-black font-bold">Serviço não encontrado.</p><button onClick={() => router.push('/home')} className="mt-4 text-[#1064C3] font-bold">Voltar</button></div>;

  const isDonoDoAnuncio = usuarioAtual?.uid === servico.trabalhadorId;
  const mediaEstrelas = avaliacoes.length > 0 ? (avaliacoes.reduce((acc, curr) => acc + curr.nota, 0) / avaliacoes.length).toFixed(1) : "Novo";

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-12">
      <header className="bg-[#1064C3] p-4 shadow-md flex items-center gap-4">
        <button onClick={() => router.push('/home')} className="text-white font-bold hover:underline">← Voltar</button>
        <h1 className="text-xl font-bold text-white">Detalhes do Serviço</h1>
      </header>

      <div className="p-8 max-w-3xl mx-auto w-full mt-4 flex flex-col gap-8">
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-start mb-6">
            <span className="text-xs font-bold text-blue-800 bg-blue-100 px-4 py-2 rounded-full uppercase tracking-wider">{servico.categoria}</span>
            {servico.preco && <span className="text-lg font-bold text-green-700 bg-green-100 px-4 py-1 rounded-xl border border-green-200">Preço: {servico.preco}</span>}
          </div>
          
          <h2 className="text-3xl font-bold text-black mb-2">{servico.titulo}</h2>
          
          {servico.municipio && servico.estado && (
            <p className="text-gray-500 font-medium mb-6 flex items-center gap-2">📍 {servico.municipio} - {servico.estado}</p>
          )}

          <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between gap-4 mb-8 border border-gray-100">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex-shrink-0 w-12 h-12 bg-black rounded-full flex items-center justify-center text-[#1064C3] font-bold text-xl">
                {nomeTrabalhador.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0"> 
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Profissional</p>
                <p className="font-bold text-black text-lg truncate w-full" title={nomeTrabalhador}>{nomeTrabalhador}</p>
              </div>
            </div>
            
            <div className="text-right flex-shrink-0 ml-2 whitespace-nowrap"> 
              <p className="text-blue-500 text-xl tracking-widest">
                {mediaEstrelas !== "Novo" ? "★".repeat(Math.round(Number(mediaEstrelas))) + "☆".repeat(5 - Math.round(Number(mediaEstrelas))) : "⭐"}
              </p>
              <p className="text-xs font-bold text-gray-500 mt-1">
                {mediaEstrelas !== "Novo" ? `${mediaEstrelas} (${avaliacoes.length} avaliações)` : "Sem avaliações"}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Sobre o Serviço</h3>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{servico.descricao}</p>
          </div>

          {!isDonoDoAnuncio ? (
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button onClick={handleContato} className="flex-1 bg-black text-white p-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition shadow-md">Mensagem 💬</button>
                <button onClick={() => setMostrarAgendamento(!mostrarAgendamento)} className="flex-1 bg-[#1064C3] text-white p-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-md">Contratar 📅</button>
              </div>

              {/* BLOCO DE AGENDAMENTO ATUALIZADO */}
              {mostrarAgendamento && (
                <div className="mt-2 p-6 bg-blue-50 border border-blue-200 rounded-xl flex flex-col gap-4 animate-in fade-in">
                  
                  {/* Mostra as datas em tags verdes para facilitar a visualização */}
                  <div>
                    <h4 className="font-bold text-blue-900 mb-2">Dias disponíveis do profissional:</h4>
                    {servico.datasDisponiveis && servico.datasDisponiveis.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {servico.datasDisponiveis.map((data) => (
                          <span key={data} className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-green-200">
                            📅 {formatarDataBr(data)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic mb-4">O profissional não definiu datas específicas. Entre em contato pelo chat.</p>
                    )}
                  </div>

                  <h4 className="font-bold text-black text-sm">Selecione o dia desejado para confirmar:</h4>
                  
                  {/* Select travado apenas para as datas que o profissional escolheu */}
                  {servico.datasDisponiveis && servico.datasDisponiveis.length > 0 ? (
                    <select 
                      value={dataAgendamento} 
                      onChange={(e) => setDataAgendamento(e.target.value)}
                      className="p-3 rounded-lg border border-gray-300 outline-none focus:border-[#1064C3] bg-white text-gray-700 font-medium"
                    >
                      <option value="">Clique aqui para escolher a data...</option>
                      {servico.datasDisponiveis.map((data) => (
                        <option key={data} value={data}>{formatarDataBr(data)}</option>
                      ))}
                    </select>
                  ) : (
                    // Caso ele seja um serviço antigo sem datas cadastradas, cai no fallback de input manual
                    <input 
                      type="date" 
                      value={dataAgendamento} 
                      onChange={(e) => setDataAgendamento(e.target.value)} 
                      className="p-3 rounded-lg border border-gray-300 outline-none focus:border-[#1064C3]" 
                    />
                  )}

                  <button onClick={handleAgendar} disabled={salvandoAgendamento} className="bg-green-600 text-white p-4 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition shadow-sm mt-2">
                    {salvandoAgendamento ? "Confirmando Agendamento..." : "Confirmar Agendamento ✅"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full bg-blue-50 text-blue-800 p-4 rounded-xl font-bold text-center border border-blue-200">Este é o seu anúncio!</div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Avaliações do Profissional ⭐</h3>

          {podeAvaliar && (
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 mb-8">
              <h4 className="font-bold text-black mb-2">Deixe sua avaliação!</h4>
              <p className="text-sm text-gray-600 mb-4">Vimos que você concluiu um serviço com {nomeTrabalhador}. Como foi?</p>
              
              <div className="flex gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setNota(star)} className={`text-3xl ${star <= nota ? 'text-blue-400' : 'text-gray-300'} hover:scale-110 transition`}>★</button>
                ))}
              </div>
              
              <textarea 
                value={comentario} 
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Escreva sua experiência..." 
                className="w-full p-3 rounded-lg border border-gray-300 outline-none focus:border-[#1064C3] mb-4 resize-none" 
                rows={3} 
              />
              <button 
                onClick={handleEnviarAvaliacao} 
                disabled={enviandoAvaliacao}
                className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {enviandoAvaliacao ? "Enviando..." : "Publicar Avaliação"}
              </button>
            </div>
          )}

          {avaliacoes.length === 0 ? (
            <p className="text-gray-500 text-center italic">Nenhuma avaliação ainda. Seja o primeiro a contratar e avaliar!</p>
          ) : (
            <div className="flex flex-col gap-4">
              {avaliacoes.map((av) => (
                <div key={av.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-col min-w-0"> 
                  <div className="flex justify-between items-center mb-2 gap-4">
                    <p className="font-bold text-black truncate flex-1" title={av.nomeCliente}>{av.nomeCliente}</p> 
                    <p className="text-blue-400 tracking-widest flex-shrink-0 whitespace-nowrap">
                      {"★".repeat(av.nota)}{"☆".repeat(5 - av.nota)}
                    </p>
                  </div>
                  <p className="text-gray-600 text-sm break-words">{av.comentario}</p>
                  <p className="text-xs text-gray-400 mt-3">{new Date(av.data).toLocaleDateString('pt-BR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}