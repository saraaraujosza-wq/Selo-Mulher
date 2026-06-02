# 🏆 Selo de Avaliação Empresarial

Sistema web completo para avaliação de empresas via checklist, com geração de nota e relatório de feedback.

---

## 📁 Estrutura do Projeto

```
selo-avaliacao/
├── index.html          → Entrada HTML
├── main.jsx            → Bootstrap React
├── App.jsx             → Aplicação completa (componentes + lógica)
├── index.css           → Reset de estilos
├── package.json        → Dependências
├── vite.config.js      → Configuração do Vite
└── README.md           → Este arquivo
```

---

## ▶️ Rodando Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18 ou superior

### Passos

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento
npm run dev

# 3. Abrir no navegador
# http://localhost:5173
```

---

## 👤 Usuários de Demonstração

| Tipo       | Email              | Senha     |
|------------|--------------------|-----------|
| **Admin**  | admin@selo.com     | admin123  |
| Empresa    | (cadastre-se)      | (sua senha) |

---

## 🌐 Deploy Gratuito (Vercel - Recomendado)

### Passo a passo:

**1. Criar conta gratuita**
- Acesse [vercel.com](https://vercel.com) e crie conta (pode usar GitHub)

**2. Instalar Vercel CLI (opcional, mas prático)**
```bash
npm install -g vercel
```

**3. Fazer build do projeto**
```bash
npm run build
```

**4. Deploy via CLI**
```bash
vercel --prod
```
→ Siga as instruções, o site ficará em `https://seu-projeto.vercel.app`

**OU via Interface Web:**
1. Vá em [vercel.com/new](https://vercel.com/new)
2. Importe seu repositório GitHub
3. Clique em **Deploy**
4. Pronto! URL gerada automaticamente.

---

## 🌐 Deploy Alternativo (Netlify)

```bash
# Build
npm run build

# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

Ou arraste a pasta `dist/` em [app.netlify.com/drop](https://app.netlify.com/drop)

---

## 🗄️ Sobre o Armazenamento

Este projeto usa **localStorage** do navegador para persistência de dados. Isso significa:

- ✅ Funciona 100% sem backend ou servidor
- ✅ Gratuito e sem configuração de banco de dados
- ✅ Ideal para protótipos, demos e uso interno
- ⚠️ Os dados ficam apenas no navegador do usuário
- ⚠️ Para uso em produção com múltiplos usuários reais, veja abaixo

---

## 🔧 Evoluindo para Backend Real

Para uso em produção com múltiplos usuários e dados compartilhados, substitua o módulo `DB` em `App.jsx` por chamadas a uma API real:

### Stack recomendada (gratuita):

| Componente | Serviço | Plano gratuito |
|------------|---------|----------------|
| Backend/API | [Supabase](https://supabase.com) | Sim ✅ |
| Banco de dados | PostgreSQL (via Supabase) | Sim ✅ |
| Autenticação | Supabase Auth | Sim ✅ |
| Upload de arquivos | Supabase Storage | Sim (1GB) ✅ |
| Frontend | Vercel | Sim ✅ |

### Exemplo de substituição (Supabase):

```js
// Em vez de:
DB.get("submissions")

// Use:
const { data } = await supabase.from('submissions').select('*')
```

---

## 📋 Funcionalidades Implementadas

### Empresa
- [x] Cadastro com nome, CNPJ, email, telefone, responsável
- [x] Login seguro
- [x] Preenchimento do checklist (Likert 1-5 ou Atende/Não atende)
- [x] Upload de comprovantes por critério
- [x] Salvar rascunho
- [x] Envio do checklist
- [x] Acompanhamento de status com timeline visual
- [x] Visualização da nota final e plano de melhoria

### Admin
- [x] Login separado com permissões distintas
- [x] Dashboard com estatísticas
- [x] Criação, edição e exclusão de critérios
- [x] Definição de peso e tipo por critério
- [x] Lista de empresas cadastradas
- [x] Visualização completa das respostas e comprovantes
- [x] Cálculo automático de nota (ponderada por peso)
- [x] Geração automática de sugestões de melhoria
- [x] Classificação automática (Bronze, Prata, Ouro)
- [x] Inserção de comentários do avaliador
- [x] Mudança de status da avaliação

---

## 🧮 Cálculo da Nota

```
Nota = Σ(resposta × peso) / Σ(máximo × peso) × 100

Likert: resposta de 1 a 5
Binário: Atende = 5, Não atende = 0

Classificação:
≥ 85% → Ouro
≥ 70% → Prata
≥ 50% → Bronze
< 50%  → Em Desenvolvimento
```

---

## 📦 Tecnologias Utilizadas

- **React 18** — Interface de usuário
- **Vite** — Build tool e servidor de desenvolvimento
- **localStorage** — Persistência de dados (sem backend)
- **CSS-in-JS inline** — Estilização sem dependências externas
