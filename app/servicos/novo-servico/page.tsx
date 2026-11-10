"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

interface IBGEEstado {
  sigla: string;
  nome: string;
}

interface IBGEMunicipio {
  nome: string;
}

export default function NovoServico() {
  const router = useRouter();

  // Estados do Formulário
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");

  // ESTADOS DO CALENDÁRIO MÚLTIPLO
  const [dataUnica, setDataUnica] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [datasDisponiveis, setDatasDisponiveis] = useState<string[]>([]);
  
  const [trabalhadorId, setTrabalhadorId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Estados do IBGE
  const [listaEstados, setListaEstados] = useState<IBGEEstado[]>([]);
  const [listaMunicipios, setListaMunicipios] = useState<IBGEMunicipio[]>([]);

  // Pega a data de hoje para bloquear datas passadas
  const hoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setTrabalhadorId(user.uid);
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data) => setListaEstados(data));
  }, []);

  useEffect(() => {
    if (!estado) {
      setListaMunicipios([]);
      return;
    }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`)
      .then((res) => res.json())
      .then((data) => setListaMunicipios(data));
  }, [estado]);

  // FUNÇÃO 1: Adicionar um único dia específico
  const handleAdicionarDataUnica = () => {
    if (!dataUnica) return;
    if (datasDisponiveis.includes(dataUnica)) {
      alert("Esta data já foi adicionada!");
      return;
    }
    setDatasDisponiveis([...datasDisponiveis, dataUnica].sort());
    setDataUnica("");
  };

  // FUNÇÃO 2: Adicionar um período inteiro (Ex: Segunda a Sexta)
  const handleAdicionarPeriodo = () => {
    if (!dataInicio || !dataFim) {
      alert("Preencha a data inicial e a data final do período.");
      return;
    }
    if (dataInicio > dataFim) {
      alert("A data inicial não pode ser maior que a data final.");
      return;
    }

    const atual = new Date(dataInicio);
    const fim = new Date(dataFim);
    const novasDatas: string[] = [];

    // Faz um loop adicionando todos os dias entre o início e o fim
    while (atual <= fim) {
      novasDatas.push(atual.toISOString().split("T")[0]);
      atual.setDate(atual.getDate() + 1);
    }

    // Junta as datas novas com as que já existiam, evitando duplicações (Set)
    const conjunto = new Set([...datasDisponiveis, ...novasDatas]);
    setDatasDisponiveis(Array.from(conjunto).sort());
    
    setDataInicio("");
    setDataFim("");
  };

  const handleRemoverData = (dataParaRemover: string) => {
    setDatasDisponiveis(datasDisponiveis.filter((d) => d !== dataParaRemover));
  };

  const formatarDataBr = (dataIso: string) => {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const handlePublicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trabalhadorId) return;

    if (datasDisponiveis.length === 0) {
      alert("Por favor, adicione pelo menos uma data disponível na sua agenda.");
      return;
    }

    setCarregando(true);
    try {
      await addDoc(collection(db, "servicos"), {
        titulo,
        descricao,
        categoria,
        preco,
        datasDisponiveis, 
        estado,
        municipio,
        trabalhadorId,
        dataCriacao: new Date()
      });
      alert("Anúncio publicado com sucesso!");
      router.push("/home");
    } catch (error) {
      console.error("Erro ao publicar anúncio:", error);
      alert("Erro ao publicar. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-10">
      <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-200 w-full max-w-2xl">
        
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Publicar Anúncio 📢</h2>
        <p className="text-gray-500 mb-8">Preencha os dados abaixo e defina quando você pode trabalhar.</p>

        <form onSubmit={handlePublicar} className="flex flex-col gap-5">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Título do Anúncio</label>
            <input type="text" required placeholder="Ex: Eletricista Residencial..." value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3]" />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
            <select required value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3] bg-white">
              <option value="">Selecione uma categoria</option>
              <option value="Manutenção">Manutenção (Eletricista, Encanador, etc)</option>
              <option value="Limpeza">Limpeza e Faxina</option>
              <option value="Aulas">Aulas Particulares</option>
              <option value="Beleza">Beleza e Estética</option>
              <option value="Frete">Fretes e Mudanças</option>
              <option value="Outros">Outros Serviços</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Estado de Atuação</label>
              <select required value={estado} onChange={(e) => { setEstado(e.target.value); setMunicipio(""); }} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3] bg-white">
                <option value="">Escolha o Estado</option>
                {listaEstados.map((uf) => (
                  <option key={uf.sigla} value={uf.sigla}>{uf.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Cidade de Atuação</label>
              <select required value={municipio} onChange={(e) => setMunicipio(e.target.value)} disabled={!estado} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3] bg-white disabled:bg-gray-100">
                <option value="">{estado ? "Escolha a Cidade" : "Selecione o estado antes"}</option>
                {listaMunicipios.map((mun) => (
                  <option key={mun.nome} value={mun.nome}>{mun.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Preço do Serviço</label>
            <input type="text" required placeholder="Ex: R$ 50,00 a hora, A combinar..." value={preco} onChange={(e) => setPreco(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3]" />
          </div>

          {/* =========================================
              SISTEMA AVANÇADO DE CALENDÁRIO 
          ========================================= */}
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="font-bold text-blue-900 text-lg mb-1">Montar Agenda de Disponibilidade 📅</h3>
            <p className="text-sm text-blue-700 mb-5">
              Adicione períodos completos (ex: segunda a sexta) ou dias específicos.
            </p>

            {/* OPÇÃO A: Adicionar Período */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 mb-4 shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Opção 1: Adicionar um período</label>
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <span className="text-xs font-bold text-gray-700">De:</span>
                  <input type="date" min={hoje} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:border-[#1064C3] text-sm" />
                </div>
                <div className="flex-1 w-full">
                  <span className="text-xs font-bold text-gray-700">Até:</span>
                  <input type="date" min={dataInicio || hoje} value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:border-[#1064C3] text-sm" />
                </div>
                <button type="button" onClick={handleAdicionarPeriodo} className="bg-[#1064C3] text-white font-bold px-4 py-2.5 rounded-lg hover:bg-blue-800 transition w-full md:w-auto text-sm">
                  + Adicionar Período
                </button>
              </div>
            </div>

            {/* OPÇÃO B: Adicionar Dia Único */}
            <div className="bg-white p-4 rounded-xl border border-blue-200 mb-5 shadow-sm">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Opção 2: Adicionar um dia isolado</label>
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <input type="date" min={hoje} value={dataUnica} onChange={(e) => setDataUnica(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:border-[#1064C3] text-sm" />
                </div>
                <button type="button" onClick={handleAdicionarDataUnica} className="bg-gray-800 text-white font-bold px-4 py-2.5 rounded-lg hover:bg-black transition w-full md:w-auto text-sm">
                  + Adicionar Dia
                </button>
              </div>
            </div>

            {/* LISTAGEM DAS DATAS ADICIONADAS */}
            <h4 className="font-bold text-sm text-gray-700 mb-2">Dias em que você atenderá:</h4>
            {datasDisponiveis.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {datasDisponiveis.map((dataIso) => (
                  <span key={dataIso} className="bg-green-100 text-green-800 font-bold text-sm px-3 py-1.5 rounded-xl border border-green-200 shadow-sm flex items-center gap-2">
                    📅 {formatarDataBr(dataIso)}
                    <button type="button" onClick={() => handleRemoverData(dataIso)} className="text-red-500 hover:text-red-700 font-extrabold ml-1">
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-gray-500">Nenhum dia selecionado. Sua agenda está vazia.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Descrição Detalhada</label>
            <textarea required rows={4} placeholder="Descreva sua experiência..." value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3] resize-none" />
          </div>

          <div className="flex gap-4 mt-4">
            <button type="button" onClick={() => router.push('/home')} className="flex-1 py-3 text-gray-600 font-bold border border-gray-300 rounded-xl hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={carregando} className="flex-1 bg-[#1064C3] text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition disabled:opacity-50">
              {carregando ? "Publicando..." : "Publicar Anúncio"}
            </button>
          </div>

        </form>
      </div>
    </main>
  );
}