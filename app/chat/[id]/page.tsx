"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase";

interface Mensagem {
  id: string;
  texto: string;
  remetenteId: string;
  criado_em: any;
}

export default function SalaDeChat() {
  const params = useParams();
  const router = useRouter();
  
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [nomeOutroUsuario, setNomeOutroUsuario] = useState("Carregando...");
  const [erro, setErro] = useState(false); // NOVO ESTADO: Proteção contra chat inválido
  
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  
  // Isso aqui serve para a tela rolar para baixo automaticamente quando chegar mensagem nova
  const finalDoChatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Descobre quem está logado
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/");
      } else {
        setUsuarioId(user.uid);
      }
    });

    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!usuarioId || !params.id) return;

    const carregarSala = async () => {
      // 2. Vai na sala de chat para descobrir quem é a OUTRA pessoa
      const chatRef = doc(db, "chats", params.id as string);
      const chatSnap = await getDoc(chatRef);

      if (chatSnap.exists()) {
        const dadosChat = chatSnap.data();
        const outroId = dadosChat.clienteId === usuarioId ? dadosChat.trabalhadorId : dadosChat.clienteId;
        
        // Pega o nome da outra pessoa para colocar no cabeçalho
        const outroUserRef = doc(db, "users", outroId);
        const outroUserSnap = await getDoc(outroUserRef);
        if (outroUserSnap.exists()) {
          setNomeOutroUsuario(outroUserSnap.data().nome);
        }
      } else {
        // CORREÇÃO: Se o chat não existe (ex: /chat/1), ativa a tela de erro
        setErro(true);
      }
    };

    carregarSala();

    // 3. O MÁGICO ONSNAPSHOT: Fica ouvindo as mensagens em tempo real!
    const mensagensRef = collection(db, "chats", params.id as string, "mensagens");
    // Organiza por ordem de chegada (do mais antigo pro mais novo)
    const q = query(mensagensRef, orderBy("criado_em", "asc"));

    const unsubscribeChat = onSnapshot(q, (snapshot) => {
      const listaMensagens: Mensagem[] = [];
      snapshot.forEach((doc) => {
        listaMensagens.push({ id: doc.id, ...doc.data() } as Mensagem);
      });
      setMensagens(listaMensagens);
      
      // Rola a tela para o final logo após carregar as mensagens
      setTimeout(() => {
        finalDoChatRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    // Quando o usuário sair da tela, desliga o "ouvinte" para economizar internet
    return () => unsubscribeChat();

  }, [usuarioId, params.id]);


  // Função de enviar mensagem
  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaMensagem.trim() || !usuarioId) return;

    const textoEnviado = novaMensagem;
    setNovaMensagem(""); // Limpa o campo na mesma hora

    try {
      await addDoc(collection(db, "chats", params.id as string, "mensagens"), {
        texto: textoEnviado,
        remetenteId: usuarioId,
        criado_em: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      alert("Falha ao enviar.");
    }
  };

  if (!usuarioId) return null;

  // TELA DE PROTEÇÃO: Se o chat não existir, mostra este aviso e botão para voltar
  if (erro) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Conversa não encontrada 😕</h2>
        <p className="text-gray-500 mb-6">Este chat não existe ou foi removido.</p>
        <button onClick={() => router.push('/home')} className="bg-[#1064C3] text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition shadow-sm">
          ← Voltar para a Home
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col">
      {/* Cabeçalho do Chat */}
      <header className="bg-[#1064C3] p-4 shadow-md flex items-center gap-4 fixed top-0 w-full z-10">
        <Link href="/home" className="text-white font-bold text-xl hover:scale-110 transition">
          ←
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#1064C3] font-bold text-lg">
            {nomeOutroUsuario !== "Carregando..." ? nomeOutroUsuario.charAt(0).toUpperCase() : "..."}
          </div>
          <div>
            <h1 className="font-bold text-white leading-tight">{nomeOutroUsuario}</h1>
            <p className="text-xs text-blue-200">Online</p>
          </div>
        </div>
      </header>

      {/* Área das Mensagens (Rolável) */}
      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-24 flex flex-col gap-3">
        {mensagens.length === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm">Mande um "Olá" para começar! 👋</p>
          </div>
        ) : (
          mensagens.map((msg) => {
            const souEu = msg.remetenteId === usuarioId;

            return (
              <div key={msg.id} className={`flex ${souEu ? "justify-end" : "justify-start"}`}>
                <div 
                  className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${
                    souEu 
                      ? "bg-[#1064C3] text-white rounded-tr-none" 
                      : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.texto}</p>
                </div>
              </div>
            );
          })
        )}
        {/* Div invisível só para a tela saber onde é o "fim" e rolar até aqui */}
        <div ref={finalDoChatRef} />
      </div>

      {/* Barra de Digitação Fixa Embaixo */}
      <footer className="bg-white p-4 border-t border-gray-200 fixed bottom-0 w-full">
        <form onSubmit={handleEnviar} className="max-w-4xl mx-auto flex gap-2">
          <input 
            type="text" 
            placeholder="Digite sua mensagem..." 
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            className="flex-1 rounded-full border border-gray-300 px-4 py-3 outline-none focus:border-[#1064C3] focus:ring-1 focus:ring-[#1064C3] transition"
          />
          <button 
            type="submit"
            disabled={!novaMensagem.trim()}
            className="bg-[#1064C3] text-white px-6 py-3 rounded-full font-bold hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </form>
      </footer>
    </main>
  );
}