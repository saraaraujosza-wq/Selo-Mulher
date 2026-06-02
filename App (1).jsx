// ============================================================
// SISTEMA DE AVALIAÇÃO EMPRESARIAL - SELO DE EQUIDADE
// Arquivo principal: App.jsx
// Tecnologia: React + localStorage (sem backend externo)
// Para deploy: Vite + Vercel/Netlify (ver README)
// ============================================================

import { useState, useEffect, useRef } from "react";

// ─── BANCO DE DADOS LOCAL ────────────────────────────────────
const DB = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getObj: (key) => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } },
};

// ─── DADOS INICIAIS ──────────────────────────────────────────
const SEED_ADMIN = { id: "admin-1", role: "admin", name: "Avaliador Principal", email: "admin@selo.com", password: "admin123" };

const SEED_CRITERIA = [
  { id: "c1", title: "Política de Igualdade Salarial", description: "A empresa possui e divulga internamente uma política formal de igualdade salarial entre gêneros?", type: "likert", weight: 3, improvement: "Elabore uma política formal de igualdade salarial, documente e comunique a todos os colaboradores." },
  { id: "c2", title: "Representatividade em Cargos de Liderança", description: "Mulheres ocupam pelo menos 30% dos cargos de liderança (gerência, diretoria, C-level)?", type: "binary", weight: 4, improvement: "Crie programas de desenvolvimento e mentoria para mulheres visando cargos de liderança." },
  { id: "c3", title: "Programa de Combate ao Assédio", description: "Existe canal de denúncia confidencial e treinamentos periódicos sobre assédio moral e sexual?", type: "likert", weight: 4, improvement: "Implante canal de denúncia anônima e realize treinamentos semestrais obrigatórios." },
  { id: "c4", title: "Licença Parental Ampliada", description: "A empresa oferece licença parental além do mínimo legal para todos os gêneros?", type: "binary", weight: 2, improvement: "Adote política de licença parental ampliada igualitária para todos os gêneros." },
  { id: "c5", title: "Metas de Diversidade e Inclusão", description: "A empresa tem metas formais de D&I com acompanhamento periódico e relatório público?", type: "likert", weight: 3, improvement: "Estabeleça metas mensuráveis de D&I com relatórios trimestrais e responsável designado." },
];

function initDB() {
  if (!DB.getObj("initialized")) {
    DB.set("users", [SEED_ADMIN]);
    DB.set("criteria", SEED_CRITERIA);
    DB.set("submissions", []);
    DB.set("companies", []);
    localStorage.setItem("initialized", "true");
  }
}

// ─── UTILITÁRIOS ─────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 10);
const formatDate = (d) => new Date(d).toLocaleDateString("pt-BR");
const calcScore = (responses, criteria) => {
  let total = 0, maxTotal = 0;
  criteria.forEach(c => {
    const r = responses[c.id];
    const w = c.weight;
    if (c.type === "likert") {
      total += (r?.value || 0) * w;
      maxTotal += 5 * w;
    } else {
      total += (r?.value === "atende" ? 1 : 0) * w * 5;
      maxTotal += w * 5;
    }
  });
  return maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
};
const getClassification = (score) => {
  if (score >= 85) return { label: "Ouro", color: "#B8860B", bg: "#FFFBEA" };
  if (score >= 70) return { label: "Prata", color: "#6B7280", bg: "#F3F4F6" };
  if (score >= 50) return { label: "Bronze", color: "#92400E", bg: "#FEF3C7" };
  return { label: "Em Desenvolvimento", color: "#DC2626", bg: "#FEF2F2" };
};

// ─── COMPONENTES BASE ─────────────────────────────────────────
const Badge = ({ label, color, bg }) => (
  <span style={{ background: bg, color, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${color}33` }}>{label}</span>
);

const StatusBadge = ({ status }) => {
  const map = {
    "nao_enviado": { label: "Não enviado", color: "#6B7280", bg: "#F9FAFB" },
    "enviado": { label: "Enviado", color: "#1D4ED8", bg: "#EFF6FF" },
    "recebido": { label: "Recebido", color: "#7C3AED", bg: "#F5F3FF" },
    "em_analise": { label: "Em análise", color: "#D97706", bg: "#FFFBEB" },
    "avaliado": { label: "Avaliado", color: "#059669", bg: "#ECFDF5" },
  };
  const s = map[status] || map["nao_enviado"];
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>}
    <input {...props} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#FAFAFA", ...props.style }} />
  </div>
);

const Select = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>}
    <select {...props} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, background: "#FAFAFA", boxSizing: "border-box" }}>{children}</select>
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>}
    <textarea {...props} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, background: "#FAFAFA", boxSizing: "border-box", minHeight: 100, resize: "vertical", ...props.style }} />
  </div>
);

const Button = ({ children, variant = "primary", small, ...props }) => {
  const styles = {
    primary: { background: "#1a56db", color: "#fff", border: "none" },
    secondary: { background: "#fff", color: "#374151", border: "1.5px solid #D1D5DB" },
    danger: { background: "#DC2626", color: "#fff", border: "none" },
    success: { background: "#059669", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "#1a56db", border: "1.5px solid #1a56db" },
  };
  return (
    <button {...props} style={{ padding: small ? "6px 14px" : "10px 20px", borderRadius: 8, fontSize: small ? 13 : 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, ...styles[variant], ...props.style }}>
      {children}
    </button>
  );
};

const Card = ({ children, style }) => (
  <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "20px 24px", ...style }}>{children}</div>
);

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #E5E7EB" }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111827" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9CA3AF" }}>×</button>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
};

// ─── LOGIN / CADASTRO ─────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "", cnpj: "", phone: "", responsible: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    const users = DB.get("users");
    const user = users.find(u => u.email === form.email && u.password === form.password);
    if (!user) return setError("Email ou senha incorretos.");
    onLogin(user);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) return setError("Senhas não coincidem.");
    if (form.password.length < 6) return setError("Senha deve ter ao menos 6 caracteres.");
    const users = DB.get("users");
    if (users.find(u => u.email === form.email)) return setError("Email já cadastrado.");
    const newUser = { id: genId(), role: "company", name: form.name, email: form.email, password: form.password, cnpj: form.cnpj, phone: form.phone, responsible: form.responsible, createdAt: Date.now() };
    DB.set("users", [...users, newUser]);
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(newUser); }, 500);
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1a56db 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, background: "#1a56db", borderRadius: 16, marginBottom: 16, boxShadow: "0 0 0 6px rgba(26,86,219,0.25)" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 style={{ color: "#fff", fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: -0.5 }}>Selo de Avaliação</h1>
          <p style={{ color: "#93C5FD", margin: 0, fontSize: 14 }}>Sistema de Certificação Empresarial</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
            {["login", "register"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "16px", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700, color: tab === t ? "#1a56db" : "#6B7280", borderBottom: tab === t ? "2px solid #1a56db" : "2px solid transparent", transition: "all 0.2s" }}>
                {t === "login" ? "Entrar" : "Cadastrar Empresa"}
              </button>
            ))}
          </div>

          <div style={{ padding: "28px" }}>
            {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

            {tab === "login" ? (
              <form onSubmit={handleLogin}>
                <Input label="Email" type="email" value={form.email} onChange={f("email")} placeholder="seu@email.com" required />
                <Input label="Senha" type="password" value={form.password} onChange={f("password")} placeholder="••••••••" required />
                <div style={{ marginTop: 8, marginBottom: 16, fontSize: 12, color: "#6B7280" }}>
                  Demo admin: <strong>admin@selo.com</strong> / <strong>admin123</strong>
                </div>
                <Button type="submit" style={{ width: "100%" }}>Entrar</Button>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <Input label="Nome da Empresa" value={form.name} onChange={f("name")} placeholder="Empresa Exemplo S.A." required />
                <Input label="CNPJ" value={form.cnpj} onChange={f("cnpj")} placeholder="00.000.000/0001-00" required />
                <Input label="Email" type="email" value={form.email} onChange={f("email")} placeholder="contato@empresa.com" required />
                <Input label="Telefone" value={form.phone} onChange={f("phone")} placeholder="(11) 99999-9999" />
                <Input label="Nome do Responsável" value={form.responsible} onChange={f("responsible")} placeholder="João da Silva" required />
                <Input label="Senha" type="password" value={form.password} onChange={f("password")} placeholder="Mínimo 6 caracteres" required />
                <Input label="Confirmar Senha" type="password" value={form.confirmPassword} onChange={f("confirmPassword")} placeholder="Repita a senha" required />
                <Button type="submit" style={{ width: "100%" }} disabled={loading}>{loading ? "Cadastrando..." : "Criar Conta"}</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LAYOUT SIDEBAR ───────────────────────────────────────────
function Layout({ user, page, setPage, onLogout, children }) {
  const isAdmin = user.role === "admin";
  const menuItems = isAdmin
    ? [
        { id: "dashboard", label: "Dashboard", icon: "📊" },
        { id: "companies", label: "Empresas", icon: "🏢" },
        { id: "criteria", label: "Critérios", icon: "📋" },
        { id: "evaluations", label: "Avaliações", icon: "⭐" },
      ]
    : [
        { id: "dashboard", label: "Início", icon: "🏠" },
        { id: "checklist", label: "Checklist", icon: "📝" },
        { id: "status", label: "Meu Status", icon: "📈" },
      ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", background: "#F8FAFC" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: "#0f172a", color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "#1a56db", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>Selo</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>{isAdmin ? "Administrador" : "Empresa"}</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px" }}>
          {menuItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 4, background: page === item.id ? "#1a56db" : "transparent", color: page === item.id ? "#fff" : "#94A3B8", fontSize: 14, fontWeight: page === item.id ? 600 : 400, textAlign: "left", transition: "all 0.15s" }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#E2E8F0" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{user.email}</div>
          </div>
          <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.1)", color: "#FCA5A5", fontSize: 13 }}>
            🚪 Sair
          </button>
        </div>
      </aside>
      {/* Main Content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}

const PageHeader = ({ title, subtitle, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: -0.5 }}>{title}</h1>
      {subtitle && <p style={{ margin: 0, color: "#64748B", fontSize: 14 }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const StatCard = ({ label, value, color = "#1a56db", icon }) => (
  <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: "20px 22px", display: "flex", alignItems: "center", gap: 16 }}>
    <div style={{ width: 48, height: 48, background: `${color}18`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

// ─── ADMIN: DASHBOARD ─────────────────────────────────────────
function AdminDashboard({ user }) {
  const submissions = DB.get("submissions");
  const companies = DB.get("users").filter(u => u.role === "company");
  const criteria = DB.get("criteria");
  const evaluated = submissions.filter(s => s.status === "avaliado").length;
  const pending = submissions.filter(s => s.status === "em_analise" || s.status === "enviado" || s.status === "recebido").length;

  return (
    <div style={{ padding: "32px 36px" }}>
      <PageHeader title="Dashboard" subtitle={`Bem-vindo, ${user.name}`} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        <StatCard label="Empresas Cadastradas" value={companies.length} icon="🏢" color="#1a56db" />
        <StatCard label="Submissões Recebidas" value={submissions.length} icon="📬" color="#7C3AED" />
        <StatCard label="Pendentes de Análise" value={pending} icon="⏳" color="#D97706" />
        <StatCard label="Avaliações Concluídas" value={evaluated} icon="✅" color="#059669" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#111827" }}>Submissões Recentes</h3>
          {submissions.slice(-5).reverse().map(s => {
            const company = companies.find(c => c.id === s.companyId);
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{company?.name || "Empresa"}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{formatDate(s.submittedAt)}</div>
                </div>
                <StatusBadge status={s.status} />
              </div>
            );
          })}
          {submissions.length === 0 && <p style={{ color: "#9CA3AF", fontSize: 14 }}>Nenhuma submissão ainda.</p>}
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#111827" }}>Critérios Ativos</h3>
          {criteria.map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: 14, color: "#374151", flex: 1, paddingRight: 12 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "#6B7280", background: "#F9FAFB", padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>Peso {c.weight}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── ADMIN: CRITÉRIOS ─────────────────────────────────────────
function AdminCriteria() {
  const [criteria, setCriteria] = useState(DB.get("criteria"));
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", type: "likert", weight: 1, improvement: "" });

  const save = () => {
    const all = DB.get("criteria");
    if (editing) {
      const updated = all.map(c => c.id === editing ? { ...c, ...form } : c);
      DB.set("criteria", updated);
      setCriteria(updated);
    } else {
      const newC = { id: genId(), ...form };
      DB.set("criteria", [...all, newC]);
      setCriteria([...all, newC]);
    }
    setModal(false);
    setEditing(null);
    setForm({ title: "", description: "", type: "likert", weight: 1, improvement: "" });
  };

  const remove = (id) => {
    if (!confirm("Excluir este critério?")) return;
    const updated = DB.get("criteria").filter(c => c.id !== id);
    DB.set("criteria", updated);
    setCriteria(updated);
  };

  const openEdit = (c) => { setEditing(c.id); setForm({ title: c.title, description: c.description, type: c.type, weight: c.weight, improvement: c.improvement }); setModal(true); };
  const openNew = () => { setEditing(null); setForm({ title: "", description: "", type: "likert", weight: 1, improvement: "" }); setModal(true); };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ padding: "32px 36px" }}>
      <PageHeader title="Critérios do Checklist" subtitle={`${criteria.length} critérios cadastrados`} action={<Button onClick={openNew}>+ Novo Critério</Button>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {criteria.map(c => (
          <Card key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{c.title}</span>
                <Badge label={c.type === "likert" ? "Escala 1-5" : "Atende/Não atende"} color="#1a56db" bg="#EFF6FF" />
                <Badge label={`Peso ${c.weight}`} color="#7C3AED" bg="#F5F3FF" />
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "#6B7280" }}>{c.description}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#D97706", background: "#FFFBEB", padding: "4px 8px", borderRadius: 6, display: "inline-block" }}>💡 {c.improvement}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Button variant="secondary" small onClick={() => openEdit(c)}>Editar</Button>
              <Button variant="danger" small onClick={() => remove(c.id)}>Excluir</Button>
            </div>
          </Card>
        ))}
        {criteria.length === 0 && <Card style={{ textAlign: "center", color: "#9CA3AF", padding: 40 }}>Nenhum critério cadastrado.</Card>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Editar Critério" : "Novo Critério"}>
        <Input label="Título do Critério" value={form.title} onChange={f("title")} placeholder="Ex: Política de Igualdade Salarial" required />
        <Textarea label="Descrição / Pergunta" value={form.description} onChange={f("description")} placeholder="Descreva o que deve ser avaliado..." />
        <Select label="Tipo de Resposta" value={form.type} onChange={f("type")}>
          <option value="likert">Escala Likert (1 a 5)</option>
          <option value="binary">Atende / Não atende</option>
        </Select>
        <Input label="Peso do Critério" type="number" min={1} max={5} value={form.weight} onChange={f("weight")} />
        <Textarea label="Sugestão de Melhoria (se não atender)" value={form.improvement} onChange={f("improvement")} placeholder="Ex: Elabore uma política formal..." />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="secondary" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={save}>{editing ? "Salvar" : "Criar Critério"}</Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── ADMIN: EMPRESAS ──────────────────────────────────────────
function AdminCompanies({ setPage, setSelectedCompany }) {
  const companies = DB.get("users").filter(u => u.role === "company");
  const submissions = DB.get("submissions");

  const getSubmission = (id) => submissions.find(s => s.companyId === id);

  return (
    <div style={{ padding: "32px 36px" }}>
      <PageHeader title="Empresas Cadastradas" subtitle={`${companies.length} empresa(s) no sistema`} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {companies.map(c => {
          const sub = getSubmission(c.id);
          return (
            <Card key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>{c.email} · CNPJ: {c.cnpj}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Responsável: {c.responsible}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <StatusBadge status={sub?.status || "nao_enviado"} />
                {sub && (
                  <Button small onClick={() => { setSelectedCompany(c.id); setPage("evaluations"); }}>Ver Avaliação</Button>
                )}
              </div>
            </Card>
          );
        })}
        {companies.length === 0 && <Card style={{ textAlign: "center", color: "#9CA3AF", padding: 40 }}>Nenhuma empresa cadastrada ainda.</Card>}
      </div>
    </div>
  );
}

// ─── ADMIN: AVALIAÇÕES ────────────────────────────────────────
function AdminEvaluations({ selectedCompany, setSelectedCompany }) {
  const [submissions, setSubmissions] = useState(DB.get("submissions"));
  const [modal, setModal] = useState(null);
  const [evalForm, setEvalForm] = useState({ comments: "", status: "em_analise" });
  const criteria = DB.get("criteria");
  const users = DB.get("users");

  const getCompany = (id) => users.find(u => u.id === id);

  const pendingSubs = submissions.filter(s => s.status !== "avaliado");
  const evaluatedSubs = submissions.filter(s => s.status === "avaliado");

  const openEval = (sub) => {
    setModal(sub);
    setEvalForm({ comments: sub.adminComments || "", status: sub.status });
  };

  const saveEval = () => {
    const score = calcScore(modal.responses, criteria);
    const cls = getClassification(score);
    const improvements = criteria.filter(c => {
      const r = modal.responses[c.id];
      if (!r) return true;
      if (c.type === "likert") return (r.value || 0) < 3;
      return r.value !== "atende";
    }).map(c => c.improvement);

    const updated = submissions.map(s => s.id === modal.id
      ? { ...s, status: evalForm.status, adminComments: evalForm.comments, score, classification: cls.label, improvements, evaluatedAt: Date.now() }
      : s
    );
    DB.set("submissions", updated);
    setSubmissions(updated);
    setModal(null);
  };

  const renderSub = (sub) => {
    const company = getCompany(sub.companyId);
    const score = sub.score || calcScore(sub.responses, criteria);
    const cls = getClassification(score);
    return (
      <Card key={sub.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 2 }}>{company?.name}</div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>Enviado em {formatDate(sub.submittedAt)}</div>
          {sub.score !== undefined && <div style={{ fontSize: 13, fontWeight: 600, color: cls.color, marginTop: 4 }}>Nota: {score}% · {cls.label}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge status={sub.status} />
          <Button small onClick={() => openEval(sub)}>Avaliar</Button>
        </div>
      </Card>
    );
  };

  // Se selectedCompany, abrir diretamente
  useEffect(() => {
    if (selectedCompany) {
      const sub = submissions.find(s => s.companyId === selectedCompany);
      if (sub) { openEval(sub); setSelectedCompany(null); }
    }
  }, [selectedCompany]);

  return (
    <div style={{ padding: "32px 36px" }}>
      <PageHeader title="Gerenciar Avaliações" subtitle="Revise e avalie as submissões das empresas" />

      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 12 }}>⏳ Pendentes ({pendingSubs.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {pendingSubs.map(renderSub)}
        {pendingSubs.length === 0 && <Card style={{ textAlign: "center", color: "#9CA3AF", padding: 30 }}>Nenhuma avaliação pendente.</Card>}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 12 }}>✅ Avaliadas ({evaluatedSubs.length})</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {evaluatedSubs.map(renderSub)}
        {evaluatedSubs.length === 0 && <Card style={{ textAlign: "center", color: "#9CA3AF", padding: 30 }}>Nenhuma avaliação concluída.</Card>}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title="Avaliar Submissão">
        {modal && (() => {
          const company = getCompany(modal.companyId);
          const score = calcScore(modal.responses, criteria);
          const cls = getClassification(score);
          return (
            <div>
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{company?.name}</div>
                <div style={{ fontSize: 13, color: "#6B7280" }}>Enviado: {formatDate(modal.submittedAt)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: cls.color }}>{score}%</div>
                  <Badge label={cls.label} color={cls.color} bg={cls.bg} />
                </div>
              </div>

              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Respostas por Critério:</h4>
              {criteria.map(c => {
                const r = modal.responses?.[c.id];
                return (
                  <div key={c.id} style={{ marginBottom: 14, padding: "12px 14px", background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: "#374151" }}>
                      Resposta: <strong>{c.type === "likert" ? `${r?.value || "—"}/5` : (r?.value || "—")}</strong>
                    </div>
                    {r?.fileUrl && <div style={{ fontSize: 12, color: "#1a56db", marginTop: 4 }}>📎 Comprovante enviado</div>}
                    {(!r || (c.type === "likert" && (r.value || 0) < 3) || r.value === "nao_atende") && (
                      <div style={{ fontSize: 12, color: "#D97706", marginTop: 6, background: "#FFFBEB", padding: "4px 8px", borderRadius: 4 }}>💡 {c.improvement}</div>
                    )}
                  </div>
                );
              })}

              <Select label="Status da Avaliação" value={evalForm.status} onChange={e => setEvalForm(p => ({ ...p, status: e.target.value }))}>
                <option value="recebido">Recebido</option>
                <option value="em_analise">Em Análise</option>
                <option value="avaliado">Avaliado (Finalizar)</option>
              </Select>
              <Textarea label="Comentários do Avaliador" value={evalForm.comments} onChange={e => setEvalForm(p => ({ ...p, comments: e.target.value }))} placeholder="Insira feedback adicional para a empresa..." />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
                <Button variant="success" onClick={saveEval}>Salvar Avaliação</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ─── EMPRESA: DASHBOARD ───────────────────────────────────────
function CompanyDashboard({ user, setPage }) {
  const submission = DB.get("submissions").find(s => s.companyId === user.id);
  const criteria = DB.get("criteria");

  return (
    <div style={{ padding: "32px 36px" }}>
      <PageHeader title={`Olá, ${user.responsible || user.name}! 👋`} subtitle="Acompanhe aqui o status da sua avaliação." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Status da Avaliação</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StatusBadge status={submission?.status || "nao_enviado"} />
            {submission?.evaluatedAt && <span style={{ fontSize: 12, color: "#9CA3AF" }}>Avaliado em {formatDate(submission.evaluatedAt)}</span>}
          </div>
          {!submission && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 12px" }}>Você ainda não enviou o checklist.</p>
              <Button onClick={() => setPage("checklist")}>Preencher Checklist →</Button>
            </div>
          )}
          {submission?.status === "avaliado" && submission.score !== undefined && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: getClassification(submission.score).color }}>{submission.score}%</div>
              <Badge label={submission.classification} color={getClassification(submission.score).color} bg={getClassification(submission.score).bg} />
            </div>
          )}
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>Critérios</h3>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1a56db", marginBottom: 4 }}>{criteria.length}</div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>critérios para avaliação</div>
          {submission && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#6B7280" }}>
              {Object.keys(submission.responses || {}).length} respondidos
            </div>
          )}
        </Card>
      </div>

      {submission?.status === "avaliado" && (
        <Card style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#065F46" }}>📋 Seu Relatório Final</h3>
          {submission.adminComments && (
            <div style={{ marginBottom: 16 }}>
              <strong style={{ fontSize: 13, color: "#065F46" }}>Feedback do Avaliador:</strong>
              <p style={{ margin: "6px 0", fontSize: 13, color: "#374151" }}>{submission.adminComments}</p>
            </div>
          )}
          {submission.improvements?.length > 0 && (
            <div>
              <strong style={{ fontSize: 13, color: "#065F46" }}>Pontos de Melhoria:</strong>
              <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
                {submission.improvements.map((imp, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── EMPRESA: CHECKLIST ───────────────────────────────────────
function CompanyChecklist({ user }) {
  const criteria = DB.get("criteria");
  const existing = DB.get("submissions").find(s => s.companyId === user.id);
  const [responses, setResponses] = useState(existing?.responses || {});
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(!!existing);
  const [status, setStatus] = useState(existing?.status || "nao_enviado");

  const setResponse = (id, field, value) => {
    setResponses(p => ({ ...p, [id]: { ...p[id], [field]: value } }));
  };

  const handleFile = (id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResponse(id, "fileUrl", reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const all = DB.get("submissions");
    if (existing) {
      DB.set("submissions", all.map(s => s.id === existing.id ? { ...s, responses } : s));
    } else {
      const newSub = { id: genId(), companyId: user.id, responses, status: "nao_enviado", submittedAt: null };
      DB.set("submissions", [...all, newSub]);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSubmit = () => {
    if (!confirm("Confirmar envio do checklist? Após o envio, as respostas não poderão ser alteradas.")) return;
    const all = DB.get("submissions");
    const now = Date.now();
    if (existing) {
      DB.set("submissions", all.map(s => s.id === existing.id ? { ...s, responses, status: "enviado", submittedAt: now } : s));
    } else {
      const newSub = { id: genId(), companyId: user.id, responses, status: "enviado", submittedAt: now };
      DB.set("submissions", [...all, newSub]);
    }
    setSubmitted(true);
    setStatus("enviado");
  };

  const isLocked = submitted && status !== "nao_enviado";

  return (
    <div style={{ padding: "32px 36px" }}>
      <PageHeader title="Checklist de Avaliação" subtitle="Responda todos os critérios e anexe os comprovantes necessários." />

      {isLocked && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "14px 18px", marginBottom: 24, fontSize: 14, color: "#1E40AF" }}>
          ✅ Checklist enviado com sucesso! Status: <StatusBadge status={status} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {criteria.map((c, i) => {
          const resp = responses[c.id] || {};
          return (
            <Card key={c.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ background: "#1a56db", color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{c.title}</span>
                    <Badge label={c.type === "likert" ? "Escala 1-5" : "Atende/Não atende"} color="#6B7280" bg="#F3F4F6" />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#6B7280", lineHeight: 1.6 }}>{c.description}</p>
                </div>
              </div>

              {/* Resposta */}
              {c.type === "likert" ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                    Avaliação: {resp.value ? `${resp.value}/5` : "Não respondido"}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} disabled={isLocked} onClick={() => setResponse(c.id, "value", v)}
                        style={{ width: 44, height: 44, borderRadius: 8, border: `2px solid ${resp.value === v ? "#1a56db" : "#E5E7EB"}`, background: resp.value === v ? "#1a56db" : "#fff", color: resp.value === v ? "#fff" : "#374151", fontWeight: 700, cursor: isLocked ? "not-allowed" : "pointer", fontSize: 16, transition: "all 0.15s" }}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#9CA3AF" }}>
                    <span>Não atende</span><span>Atende plenamente</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  {["atende", "nao_atende"].map(v => (
                    <button key={v} disabled={isLocked} onClick={() => setResponse(c.id, "value", v)}
                      style={{ padding: "10px 20px", borderRadius: 8, border: `2px solid ${resp.value === v ? (v === "atende" ? "#059669" : "#DC2626") : "#E5E7EB"}`, background: resp.value === v ? (v === "atende" ? "#ECFDF5" : "#FEF2F2") : "#fff", color: resp.value === v ? (v === "atende" ? "#065F46" : "#991B1B") : "#374151", fontWeight: 600, cursor: isLocked ? "not-allowed" : "pointer" }}>
                      {v === "atende" ? "✓ Atende" : "✗ Não atende"}
                    </button>
                  ))}
                </div>
              )}

              {/* Upload */}
              <div style={{ background: "#F8FAFC", border: "1.5px dashed #CBD5E1", borderRadius: 8, padding: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>📎 Comprovante obrigatório</label>
                {resp.fileUrl ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, color: "#059669" }}>✅ Arquivo enviado</span>
                    {!isLocked && <button onClick={() => setResponse(c.id, "fileUrl", null)} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", fontSize: 12 }}>Remover</button>}
                    {resp.fileUrl?.startsWith("data:image") && <img src={resp.fileUrl} alt="comprovante" style={{ maxWidth: 120, maxHeight: 60, borderRadius: 4, objectFit: "cover" }} />}
                  </div>
                ) : (
                  <div>
                    {!isLocked && (
                      <input type="file" accept=".pdf,image/*" onChange={e => handleFile(c.id, e)} style={{ fontSize: 13 }} />
                    )}
                    <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 6 }}>Aceito: PDF, JPG, PNG</div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {!isLocked && (
        <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
          {saved && <span style={{ color: "#059669", fontSize: 14, alignSelf: "center" }}>✅ Rascunho salvo!</span>}
          <Button variant="secondary" onClick={handleSave}>Salvar Rascunho</Button>
          <Button variant="success" onClick={handleSubmit}>Enviar Checklist ✓</Button>
        </div>
      )}
    </div>
  );
}

// ─── EMPRESA: STATUS ──────────────────────────────────────────
function CompanyStatus({ user }) {
  const submission = DB.get("submissions").find(s => s.companyId === user.id);
  const criteria = DB.get("criteria");

  const steps = [
    { key: "nao_enviado", label: "Não enviado" },
    { key: "enviado", label: "Enviado" },
    { key: "recebido", label: "Recebido" },
    { key: "em_analise", label: "Em análise" },
    { key: "avaliado", label: "Avaliado" },
  ];
  const currentStep = submission ? steps.findIndex(s => s.key === submission.status) : 0;

  return (
    <div style={{ padding: "32px 36px" }}>
      <PageHeader title="Status da Avaliação" />

      {/* Timeline */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", position: "relative", padding: "20px 0" }}>
          <div style={{ position: "absolute", top: "50%", left: "5%", right: "5%", height: 3, background: "#E5E7EB", zIndex: 0 }} />
          {steps.map((s, i) => (
            <div key={s.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 1, flex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: i <= currentStep ? "#1a56db" : "#E5E7EB", color: i <= currentStep ? "#fff" : "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
                {i < currentStep ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: i <= currentStep ? "#1a56db" : "#9CA3AF", textAlign: "center" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {submission?.status === "avaliado" && submission.score !== undefined && (
        <>
          <Card style={{ marginBottom: 20, background: getClassification(submission.score).bg, border: `1px solid ${getClassification(submission.score).color}55` }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 800, color: "#111827" }}>🏆 Resultado Final</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ fontSize: 60, fontWeight: 900, color: getClassification(submission.score).color, lineHeight: 1 }}>{submission.score}%</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: getClassification(submission.score).color }}>{submission.classification}</div>
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>Avaliado em {formatDate(submission.evaluatedAt)}</div>
              </div>
            </div>
          </Card>

          {submission.adminComments && (
            <Card style={{ marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>💬 Feedback do Avaliador</h3>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{submission.adminComments}</p>
            </Card>
          )}

          {submission.improvements?.length > 0 && (
            <Card>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>📈 Plano de Melhoria</h3>
              {submission.improvements.map((imp, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#D97706", fontWeight: 700 }}>{i + 1}.</span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{imp}</span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {!submission && (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <h3 style={{ color: "#374151" }}>Checklist não enviado</h3>
          <p style={{ color: "#9CA3AF", fontSize: 14 }}>Preencha o checklist para iniciar sua avaliação.</p>
        </Card>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => DB.getObj("currentUser"));
  const [page, setPage] = useState("dashboard");
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => { initDB(); }, []);

  const handleLogin = (u) => { DB.set("currentUser", u); setUser(u); setPage("dashboard"); };
  const handleLogout = () => { localStorage.removeItem("currentUser"); setUser(null); };

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const renderPage = () => {
    if (user.role === "admin") {
      if (page === "dashboard") return <AdminDashboard user={user} />;
      if (page === "criteria") return <AdminCriteria />;
      if (page === "companies") return <AdminCompanies setPage={setPage} setSelectedCompany={setSelectedCompany} />;
      if (page === "evaluations") return <AdminEvaluations selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany} />;
    } else {
      if (page === "dashboard") return <CompanyDashboard user={user} setPage={setPage} />;
      if (page === "checklist") return <CompanyChecklist user={user} />;
      if (page === "status") return <CompanyStatus user={user} />;
    }
  };

  return (
    <Layout user={user} page={page} setPage={setPage} onLogout={handleLogout}>
      {renderPage()}
    </Layout>
  );
}
