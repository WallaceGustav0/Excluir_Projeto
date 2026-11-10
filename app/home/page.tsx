"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, deleteDoc, query, where, updateDoc, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// Moldes de Dados
interface Servico {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  trabalhadorId: string;
  preco?: string;
  estado?: string;
  municipio?: string;
}

interface Chat {
  id: string;
  nomeOutro: string;
  clienteId: string;
  trabalhadorId: string;
}

interface Agendamento {
  id: string;
  servicoId: string;
  tituloServico: string;
  nomeTrabalhador: string;
  clienteId: string;
  trabalhadorId: string;
  dataAgendada: string;
  status: string;
}

interface IBGEEstado { sigla: string; nome: string; }
interface IBGEMunicipio { nome: string; }

export default function Home() {
  const router = useRouter();
  
  const [abaAtiva, setAbaAtiva] = useState<"BUSCA" | "NOTIFICACOES">("BUSCA");

  const [usuarioUid, setUsuarioUid] = useState("");
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("");
  const [carregandoUsuario, setCarregandoUsuario] = useState(true);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [meusChats, setMeusChats] = useState<Chat[]>([]);
  const [meusAgendamentos, setMeusAgendamentos] = useState<Agendamento[]>([]);
  const [carregandoServicos, setCarregandoServicos] = useState(true);

  const [termoBusca, setTermoBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("");
  const [filtroPreco, setFiltroPreco] = useState("");

  const [listaEstados, setListaEstados] = useState<IBGEEstado[]>([]);
  const [listaMunicipios, setListaMunicipios] = useState<IBGEMunicipio[]>([]);

  // 1. VIGIA DE AUTENTICAÇÃO E REDIRECIONAMENTO DE ABAS
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUsuarioUid(user.uid);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const tipo = String(docSnap.data().tipo_usuario || "").toLowerCase().trim();
          setNomeUsuario(docSnap.data().nome);
          setTipoUsuario(tipo);
          
          if (tipo === "trabalhador") {
            setAbaAtiva("NOTIFICACOES");
          } else {
            setAbaAtiva("BUSCA");
          }
        }
        setCarregandoUsuario(false);
      } else {
        router.push("/");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // 2. BUSCADOR GERAL (Serviços, Chats e Agendamentos)
  useEffect(() => {
    if (!usuarioUid || !tipoUsuario) return;

    const buscarTudo = async () => {
      try {
        const vitrineSnap = await getDocs(collection(db, "servicos"));
        const listaVitrine: Servico[] = [];
        vitrineSnap.forEach((doc) => listaVitrine.push({ id: doc.id, ...doc.data() } as Servico));
        setServicos(listaVitrine);

        const campoBusca = tipoUsuario === "cliente" ? "clienteId" : "trabalhadorId";

        // --- BUSCA CHATS ---
        const chatsRef = collection(db, "chats");
        const qChats = query(chatsRef, where(campoBusca, "==", usuarioUid));
        const chatsSnap = await getDocs(qChats);
        const listaChats: Chat[] = [];

        for (const docSnap of chatsSnap.docs) {
          const dadosChat = docSnap.data();
          const outroId = tipoUsuario === "cliente" ? dadosChat.trabalhadorId : dadosChat.clienteId;
          
          let nomeOutro = "Usuário";
          if (outroId) {
            const outroUserSnap = await getDoc(doc(db, "users", outroId));
            if (outroUserSnap.exists()) {
              nomeOutro = outroUserSnap.data().nome;
            }
          }
          listaChats.push({ id: docSnap.id, nomeOutro, clienteId: dadosChat.clienteId, trabalhadorId: dadosChat.trabalhadorId });
        }
        setMeusChats(listaChats);

        // --- BUSCA AGENDAMENTOS ---
        const agendamentosRef = collection(db, "agendamentos");
        const qAgendamentos = query(agendamentosRef, where(campoBusca, "==", usuarioUid));
        const agendamentosSnap = await getDocs(qAgendamentos);
        const listaAgendamentos: Agendamento[] = [];

        agendamentosSnap.forEach((doc) => {
          listaAgendamentos.push({ id: doc.id, ...doc.data() } as Agendamento);
        });
        
        listaAgendamentos.sort((a, b) => {
          if (a.status === "Concluído" && b.status !== "Concluído") return 1;
          if (a.status !== "Concluído" && b.status === "Concluído") return -1;
          return 0;
        });

        setMeusAgendamentos(listaAgendamentos);

      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setCarregandoServicos(false);
      }
    };

    buscarTudo();
  }, [usuarioUid, tipoUsuario, abaAtiva]);

  // 3. IBGE
  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome").then(res => res.json()).then(data => setListaEstados(data));
  }, []);
  useEffect(() => {
    if (!filtroEstado) return setListaMunicipios([]);
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${filtroEstado}/municipios`).then(res => res.json()).then(data => setListaMunicipios(data));
  }, [filtroEstado]);


  // FUNÇÃO INTELIGENTE DE CHAT (Abre ou Cria a conversa automaticamente)
  const abrirChatComOutro = async (clienteId: string, trabalhadorId: string) => {
    try {
      const chatsRef = collection(db, "chats");
      const q = query(chatsRef, where("clienteId", "==", clienteId), where("trabalhadorId", "==", trabalhadorId));
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
    } catch (error) {
      console.error("Erro ao abrir chat:", error);
      alert("Não foi possível abrir o chat.");
    }
  };


  // FUNÇÕES DE AÇÃO
  const handleExcluirServico = async (idServico: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este anúncio?")) return;
    try {
      await deleteDoc(doc(db, "servicos", idServico));
      setServicos(servicos.filter(s => s.id !== idServico));
      alert("Anúncio excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const handleExcluirChat = async (idChat: string) => {
    if (!window.confirm("Tem certeza que deseja apagar esta conversa?")) return;
    try {
      await deleteDoc(doc(db, "chats", idChat));
      setMeusChats(meusChats.filter(c => c.id !== idChat));
    } catch (error) {
      console.error("Erro ao excluir chat:", error);
    }
  };

  const handleConcluirAgendamento = async (idAgendamento: string) => {
    if (!window.confirm("Confirmar que este serviço foi concluído?")) return;
    try {
      const agendamentoRef = doc(db, "agendamentos", idAgendamento);
      await updateDoc(agendamentoRef, { status: "Concluído" });
      
      setMeusAgendamentos(meusAgendamentos.map(a => 
        a.id === idAgendamento ? { ...a, status: "Concluído" } : a
      ));
      alert("Serviço marcado como concluído! 🎉");
    } catch (error) {
      console.error("Erro ao concluir:", error);
      alert("Erro ao atualizar o status.");
    }
  };

  const formatarDataBr = (dataIso: string) => {
    if (!dataIso) return "";
    const partes = dataIso.split("-");
    if (partes.length !== 3) return dataIso;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  const servicosFiltrados = servicos.filter((servico) => {
    const matchCategoria = filtroCategoria ? servico.categoria === filtroCategoria : true;
    const matchEstado = filtroEstado ? servico.estado === filtroEstado : true;
    const matchMunicipio = filtroMunicipio ? servico.municipio === filtroMunicipio : true;
    const matchBusca = termoBusca ? servico.titulo.toLowerCase().includes(termoBusca.toLowerCase()) || servico.descricao.toLowerCase().includes(termoBusca.toLowerCase()) : true;
    let matchPreco = true;
    if (filtroPreco) {
      const precoTexto = servico.preco?.toLowerCase() || "";
      if (filtroPreco === "combinar") matchPreco = precoTexto.includes("combinar");
      else {
        const valor = parseFloat(precoTexto.replace(/[^0-9,]/g, '').replace(',', '.'));
        if (!isNaN(valor)) {
          if (filtroPreco === "ate50") matchPreco = valor <= 50;
          else if (filtroPreco === "50a100") matchPreco = valor > 50 && valor <= 100;
          else if (filtroPreco === "acima100") matchPreco = valor > 100;
        } else matchPreco = false;
      }
    }
    return matchCategoria && matchEstado && matchMunicipio && matchPreco && matchBusca;
  });

  const meusServicos = servicos.filter((servico) => servico.trabalhadorId === usuarioUid);

  if (carregandoUsuario) return <div className="min-h-screen flex items-center justify-center bg-[#1064C3]"><p className="text-white font-bold text-xl animate-pulse">Carregando...</p></div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      
      <header className="bg-[#1064C3] p-6 shadow-md flex justify-between items-center rounded-b-3xl">
        <div>
          <h1 className="text-2xl font-bold text-white">LIGA?</h1>
          <p className="text-xs text-white font-semibold uppercase tracking-widest">Pra quem</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => auth.signOut()} className="text-sm text-white font-semibold hover:underline">Sair</button>
          <button onClick={() => router.push('/perfil')} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1064C3] font-bold text-lg hover:scale-105 transition shadow-md">
            {nomeUsuario ? nomeUsuario.charAt(0).toUpperCase() : "👤"}
          </button>
        </div>
      </header>

      <div className="flex justify-center gap-4 mt-6 px-4">
        {tipoUsuario === "cliente" && (
          <button onClick={() => setAbaAtiva("BUSCA")} className={`px-6 py-2 rounded-full font-bold transition-all ${abaAtiva === "BUSCA" ? "bg-[#1064C3] text-white shadow-md" : "bg-white text-gray-600 border border-gray-300"}`}>
            Buscar Profissionais
          </button>
        )}
        <button onClick={() => setAbaAtiva("NOTIFICACOES")} className={`px-6 py-2 rounded-full font-bold transition-all ${abaAtiva === "NOTIFICACOES" ? "bg-[#1064C3] text-white shadow-md" : "bg-white text-gray-600 border border-gray-300"}`}>
          {tipoUsuario === "trabalhador" ? "Área do Profissional" : "Notificações / Agenda"}
        </button>
      </div>

      <div className="p-4 max-w-5xl mx-auto mt-4">
        
        {/* ABA 1: BUSCA DE SERVIÇOS */}
        {abaAtiva === "BUSCA" && tipoUsuario === "cliente" && (
          <>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Olá, {nomeUsuario}! 👋</h2>
              <p className="text-gray-600 italic">O teu perfil: <span className="font-bold text-[#1064C3] uppercase">{tipoUsuario}</span></p>
            </div>

            <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Pesquise o servico desejado 🔍</h3>
              <div className="mb-4">
                <input type="text" placeholder="Pesquisar por serviço..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="w-full p-4 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3] text-lg"/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label><select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 bg-white"><option value="">Todas</option><option value="Manutenção">Manutenção</option><option value="Limpeza">Limpeza</option><option value="Aulas">Aulas</option><option value="Beleza">Beleza</option><option value="Frete">Frete</option><option value="Outros">Outros</option></select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Estado</label><select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setFiltroMunicipio(""); }} className="w-full p-3 rounded-lg border border-gray-300 bg-white"><option value="">Todos</option>{listaEstados.map((uf) => (<option key={uf.sigla} value={uf.sigla}>{uf.nome}</option>))}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Município</label><select value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)} disabled={!filtroEstado} className="w-full p-3 rounded-lg border border-gray-300 bg-white disabled:bg-gray-100"><option value="">{filtroEstado ? "Todas" : "Escolhe o estado"}</option>{listaMunicipios.map((mun) => (<option key={mun.nome} value={mun.nome}>{mun.nome}</option>))}</select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">Preço</label><select value={filtroPreco} onChange={(e) => setFiltroPreco(e.target.value)} className="w-full p-3 rounded-lg border border-gray-300 bg-white"><option value="">Qualquer preço</option><option value="combinar">A combinar</option><option value="ate50">Até R$ 50</option><option value="50a100">R$ 50 a R$ 100</option><option value="acima100">Acima de R$ 100</option></select></div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Serviços Disponíveis 🛠️</h3>
              {carregandoServicos ? (
                <p className="text-gray-500 font-medium">Buscando profissionais...</p>
              ) : servicosFiltrados.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center"><p className="text-gray-500 text-lg">Nenhum serviço encontrado. 😕</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {servicosFiltrados.map((servico) => (
                    <div key={servico.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 hover:shadow-md transition flex flex-col">
                      <div className="mb-3 flex justify-between items-start gap-2"><span className="text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full uppercase">{servico.categoria}</span>{servico.preco && <span className="text-sm font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">{servico.preco}</span>}</div>
                      <h4 className="text-xl font-bold text-black mb-1 line-clamp-1">{servico.titulo}</h4>
                      {servico.municipio && servico.estado && <p className="text-xs text-gray-500 font-medium mb-3">📍 {servico.municipio} - {servico.estado}</p>}
                      <p className="text-sm text-gray-600 line-clamp-3 mb-6 flex-1">{servico.descricao}</p>
                      <button onClick={() => router.push(`/servicos/${servico.id}`)} className="mt-auto w-full rounded-xl bg-gray-50 border border-gray-200 p-3 font-bold text-gray-700 hover:bg-[#1064C3] hover:text-white transition">Ver Detalhes</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ABA 2: NOTIFICAÇÕES E AGENDA */}
        {abaAtiva === "NOTIFICACOES" && (
          <section className="flex flex-col gap-6">
            
            {tipoUsuario === "trabalhador" && (
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                  <h3 className="text-xl font-bold text-gray-800">Os Meus Anúncios Publicados 📢</h3>
                  <button onClick={() => router.push('/servicos/novo-servico')} className="bg-[#1064C3] text-white px-5 py-2.5 font-bold rounded-xl shadow-sm hover:bg-blue-800 transition">+ Criar Novo Anúncio</button>
                </div>
                {meusServicos.length === 0 ? (
                  <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center"><p className="text-gray-500 mb-2">Ainda não tens serviços registados.</p></div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {meusServicos.map((s) => (
                      <div key={s.id} className="p-5 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-100 px-2 py-1 rounded-md uppercase mb-2 inline-block">{s.categoria}</span>
                          <h4 className="font-bold text-lg text-gray-800">{s.titulo}</h4>
                          <p className="text-sm text-gray-500 font-medium">{s.preco || "A combinar"}</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                          <button onClick={() => router.push(`/servicos/${s.id}/editar`)} className="flex-1 md:flex-none px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition">✏️ Editar</button>
                          <button onClick={() => handleExcluirServico(s.id)} className="flex-1 md:flex-none px-4 py-2 text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition">🗑️ Excluir</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SEÇÃO DINÂMICA: AGENDAMENTOS */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Serviços e Agendamentos 📅</h3>
              
              {meusAgendamentos.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center">
                  <p className="text-gray-500">Nenhum serviço agendado até ao momento.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {meusAgendamentos.map((agendamento) => (
                    <div key={agendamento.id} className={`p-4 rounded-2xl border flex flex-col gap-3 ${agendamento.status === "Concluído" ? "bg-gray-100 border-gray-200 opacity-70" : "bg-blue-50/30 border-blue-100"}`}>
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <h4 className="font-bold text-lg text-gray-800">{agendamento.tituloServico}</h4>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {tipoUsuario === "cliente" ? `Profissional: ${agendamento.nomeTrabalhador}` : "Cliente Solicitou este serviço"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">📅 Data Agendada: {formatarDataBr(agendamento.dataAgendada)}</p>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${agendamento.status === "Concluído" ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"}`}>
                          {agendamento.status}
                        </span>
                      </div>
                      
                      {agendamento.status !== "Concluído" && (
                        <div className="pt-3 border-t border-gray-200 flex justify-end gap-3 flex-wrap">
                          <button onClick={() => router.push(`/servicos/${agendamento.servicoId}`)} className="px-4 py-2 text-sm font-bold text-[#1064C3] bg-white border border-blue-200 rounded-xl hover:bg-blue-50 transition">
                            Ver Serviço
                          </button>
                          
                          {/* BOTÃO DE CHAT DIRETO NO CARD DE AGENDAMENTO */}
                          <button 
                            onClick={() => abrirChatComOutro(agendamento.clienteId, agendamento.trabalhadorId)} 
                            className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition shadow-sm"
                          >
                            💬 Mensagem
                          </button>

                          {tipoUsuario === "trabalhador" && (
                            <button onClick={() => handleConcluirAgendamento(agendamento.id)} className="px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 transition">
                              ✔ Concluir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* SEÇÃO DINÂMICA: CHATS */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Minhas Mensagens 💬</h3>
              
              {meusChats.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center"><p className="text-gray-500">Você ainda não iniciou nenhuma conversa.</p></div>
              ) : (
                <div className="flex flex-col gap-4">
                  {meusChats.map((chat) => (
                    <div key={chat.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <h4 className="font-bold text-lg text-gray-800">Conversa com: <span className="text-[#1064C3]">{chat.nomeOutro}</span></h4>
                        <p className="text-xs text-gray-500 mt-1">Acesse para combinar os detalhes do serviço.</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={() => router.push(`/chat/${chat.id}`)} className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition shadow-sm">💬 Abrir Chat</button>
                        <button onClick={() => handleExcluirChat(chat.id)} className="flex-1 sm:flex-none px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition shadow-sm">🗑️ Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </section>
        )}

      </div>
    </main>
  );
}