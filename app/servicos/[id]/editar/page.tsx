"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../firebase";

interface IBGEEstado { sigla: string; nome: string; }
interface IBGEMunicipio { nome: string; }

export default function EditarServico() {
  const router = useRouter();
  const { id } = useParams();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [preco, setPreco] = useState("");
  const [estado, setEstado] = useState("");
  const [municipio, setMunicipio] = useState("");

  const [dataUnica, setDataUnica] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [datasDisponiveis, setDatasDisponiveis] = useState<string[]>([]);
  
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [listaEstados, setListaEstados] = useState<IBGEEstado[]>([]);
  const [listaMunicipios, setListaMunicipios] = useState<IBGEMunicipio[]>([]);

  const hoje = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const buscarServico = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, "servicos", id as string);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const dados = docSnap.data();
          setTitulo(dados.titulo || "");
          setDescricao(dados.descricao || "");
          setCategoria(dados.categoria || "");
          setPreco(dados.preco || "");
          setEstado(dados.estado || "");
          setMunicipio(dados.municipio || "");
          setDatasDisponiveis(dados.datasDisponiveis || []);
        }
      } catch (error) {
        console.error("Erro ao buscar serviço:", error);
      } finally {
        setCarregandoDados(false);
      }
    };
    buscarServico();
  }, [id]);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data) => setListaEstados(data));
  }, []);

  useEffect(() => {
    if (!estado) return;
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`)
      .then((res) => res.json())
      .then((data) => setListaMunicipios(data));
  }, [estado]);

  const handleAdicionarDataUnica = () => {
    if (!dataUnica) return;
    if (datasDisponiveis.includes(dataUnica)) return alert("Data já adicionada!");
    setDatasDisponiveis([...datasDisponiveis, dataUnica].sort());
    setDataUnica("");
  };

  const handleAdicionarPeriodo = () => {
    if (!dataInicio || !dataFim) return alert("Preencha início e fim.");
    if (dataInicio > dataFim) return alert("Início maior que o fim.");

    const atual = new Date(dataInicio);
    const fim = new Date(dataFim);
    const novasDatas: string[] = [];

    while (atual <= fim) {
      novasDatas.push(atual.toISOString().split("T")[0]);
      atual.setDate(atual.getDate() + 1);
    }
    const conjunto = new Set([...datasDisponiveis, ...novasDatas]);
    setDatasDisponiveis(Array.from(conjunto).sort());
    setDataInicio(""); setDataFim("");
  };

  const handleRemoverData = (dataParaRemover: string) => {
    setDatasDisponiveis(datasDisponiveis.filter((d) => d !== dataParaRemover));
  };

  const formatarDataBr = (dataIso: string) => {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const handleAtualizar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (datasDisponiveis.length === 0) {
      return alert("Deixe pelo menos uma data disponível na agenda.");
    }

    setSalvando(true);
    try {
      const docRef = doc(db, "servicos", id as string);
      await updateDoc(docRef, {
        titulo,
        descricao,
        categoria,
        preco,
        estado,
        municipio,
        datasDisponiveis
      });
      alert("Agenda e Anúncio atualizados com sucesso!");
      router.push("/home");
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      alert("Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  };

  if (carregandoDados) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-[#1064C3]">Carregando dados da agenda...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4 py-10">
      <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-200 w-full max-w-2xl">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Editar Agenda ✏️</h2>
          <button onClick={() => router.push('/home')} className="text-sm font-bold text-[#1064C3] hover:underline">
            ← Voltar para Home
          </button>
        </div>

        <form onSubmit={handleAtualizar} className="flex flex-col gap-5">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Título do Anúncio</label>
              <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3]" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Preço</label>
              <input type="text" required value={preco} onChange={(e) => setPreco(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3]" />
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
            <h3 className="font-bold text-blue-900 text-lg mb-1">Gerenciar Disponibilidade na Agenda 📅</h3>
            
            <div className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1"><span className="text-xs font-bold text-gray-700">De:</span><input type="date" min={hoje} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm" /></div>
                <div className="flex-1"><span className="text-xs font-bold text-gray-700">Até:</span><input type="date" min={dataInicio || hoje} value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm" /></div>
                <button type="button" onClick={handleAdicionarPeriodo} className="bg-[#1064C3] text-white font-bold px-4 py-2.5 rounded-lg text-sm hover:bg-blue-800 transition">+ Período</button>
              </div>

              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1"><span className="text-xs font-bold text-gray-700">Dia isolado:</span><input type="date" min={hoje} value={dataUnica} onChange={(e) => setDataUnica(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 text-sm" /></div>
                <button type="button" onClick={handleAdicionarDataUnica} className="bg-gray-800 text-white font-bold px-4 py-2.5 rounded-lg text-sm hover:bg-black transition">+ Dia</button>
              </div>
            </div>

            <h4 className="font-bold text-sm text-gray-700 mt-5 mb-2">Agenda Atual de Atendimento:</h4>
            <div className="flex flex-wrap gap-2">
              {datasDisponiveis.map((dataIso) => (
                <span key={dataIso} className="bg-green-100 text-green-800 font-bold text-sm px-3 py-1.5 rounded-xl border border-green-200 shadow-sm flex items-center gap-2">
                  📅 {formatarDataBr(dataIso)}
                  <button type="button" onClick={() => handleRemoverData(dataIso)} className="text-red-500 hover:text-red-700 font-extrabold ml-1">✕</button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
            <textarea required rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full p-3 rounded-xl border border-gray-300 outline-none focus:border-[#1064C3] resize-none" />
          </div>

          <button type="submit" disabled={salvando} className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition shadow-md">
            {salvando ? "Salvando Alterações..." : "Salvar Alterações na Agenda"}
          </button>

        </form>
      </div>
    </main>
  );
}