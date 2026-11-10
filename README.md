# 🛠️ LIGA Pra Quem? - Plataforma de Serviços

Bem-vindos ao repositório do nosso projeto! Este é um aplicativo web construído com **Next.js**, **React**, **Tailwind CSS** e **Firebase** para conectar clientes a trabalhadores autônomos.

## ⚙️ Pré-requisitos
Antes de começar, você precisa ter instalado no seu computador:
- [Node.js](https://nodejs.org/) (Recomendado a versão LTS)
- [Git](https://git-scm.com/)

---

## 🚀 Passo a Passo para rodar o projeto localmente

### 1. Clone o repositório
Abra o seu terminal (ou o terminal do VS Code) e rode o comando abaixo para baixar o código para a sua máquina:

git clone COLE_AQUI_O_LINK_DO_SEU_GITHUB

*(Dica: Após clonar, não se esqueça de entrar na pasta do projeto digitando `cd nome-da-pasta`)*

### 2. Instale as dependências
Com o terminal aberto dentro da pasta do projeto, instale todas as bibliotecas necessárias rodando:

npm install

### 3. Configuração do Banco de Dados (Firebase)
⚠️ **Atenção:** Nosso projeto usa o Firebase. Peça ao administrador do projeto (Samuel) o arquivo de configuração de banco de dados (as chaves de acesso). 
Você precisará garantir que o arquivo `firebase.ts` (ou as variáveis de ambiente `.env.local`) estejam configurados corretamente na sua máquina antes de rodar.

### 4. Rode o Servidor de Desenvolvimento
Com tudo instalado e configurado, inicie o site rodando o comando:

npm run dev

### 5. Acesse o Aplicativo
Abra o seu navegador de preferência e acesse o endereço abaixo. A mágica vai acontecer!
👉 **http://localhost:3000**

---

## 📦 Como enviar suas atualizações para o GitHub (Fluxo de Trabalho)
Sempre que você criar uma funcionalidade nova ou corrigir um bug, use o "Combo de 3 Passos" no terminal para enviar as mudanças para o GitHub:

1. Prepara todos os arquivos alterados:
git add .

2. Cria um pacote com uma mensagem explicando o que você fez:
git commit -m "Sua mensagem aqui"

3. Envia para o GitHub:
git push
