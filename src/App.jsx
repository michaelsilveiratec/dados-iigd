import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import "./App.css";
import churchLogo from "./assets/lg.jpg";

const DEFAULT_CHURCHES = [
  "Sede - Osasco",
  "Quitauna",
  "Baronesa",
  "Helena Maria",
  "Novo Osasco",
  "Santa Maria",
  "Jardim de Abril",
  "Padroeira, Jardim Veloso",
  "Vila Menck",
  "Rochdale",
];
const DEMO_ENTRIES = [
  {
    id: 1,
    church: "Sede - Osasco",
    guest: "Mariana Costa",
    phone: "(11) 98842-1010",
    createdAt: "Hoje, 09:42",
  },
  {
    id: 2,
    church: "Sede - Osasco",
    guest: "Paulo Henrique",
    phone: "(11) 99618-4430",
    createdAt: "Hoje, 09:18",
  },
  {
    id: 3,
    church: "Quitauna",
    guest: "Rafael Souza",
    phone: "(11) 99103-7721",
    createdAt: "Ontem, 20:07",
  },
  {
    id: 4,
    church: "Santa Maria",
    guest: "Ana Paula Lima",
    phone: "(11) 98740-2199",
    createdAt: "Ontem, 18:33",
  },
  {
    id: 5,
    church: "Vila Menck",
    guest: "Joao Vitor",
    phone: "(11) 99220-0088",
    createdAt: "Ontem, 17:11",
  },
];
const DEFAULT_EVENT = {
  id: "encontro-de-fe-2026-10-18",
  name: "Encontro de Fé com o Missionário R. R. Soares",
  date: "2026-10-18",
  target: 250,
  logo: "",
};

function eventIdFor(eventData) {
  return `${eventData.name}-${eventData.date}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function App() {
  const [view, setView] = useState("form");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [churches, setChurches] = useState(() =>
    JSON.parse(
      localStorage.getItem("evento-churches") ||
        JSON.stringify(DEFAULT_CHURCHES),
    ),
  );
  const [event, setEvent] = useState(() => {
    const storedEvent = JSON.parse(
      localStorage.getItem("evento-config") || JSON.stringify(DEFAULT_EVENT),
    );
    return { ...DEFAULT_EVENT, ...storedEvent, id: storedEvent.id || eventIdFor(storedEvent) };
  });
  const [entries, setEntries] = useState(() =>
    JSON.parse(
      localStorage.getItem(
        `evento-entries-${eventIdFor(JSON.parse(localStorage.getItem("evento-config") || JSON.stringify(DEFAULT_EVENT)))}`,
      ) || localStorage.getItem("evento-entries") || JSON.stringify(DEMO_ENTRIES),
    ),
  );
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [editingChurch, setEditingChurch] = useState(null);
  const [churchName, setChurchName] = useState("");
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryForm, setEntryForm] = useState({ guest: "", phone: "" });
  const total = entries.length;
  const counts = useMemo(
    () =>
      churches.map((church) => ({
        church,
        count: entries.filter((entry) => entry.church === church).length,
      })),
    [churches, entries],
  );
  const maxCount = Math.max(...counts.map((item) => item.count), 1);
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        `${entry.guest} ${entry.phone} ${entry.church}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [entries, search],
  );

  function submitEntry(formData) {
    const entry = {
      id: Date.now(),
      church: formData.get("church"),
      guest: formData.get("guest").trim(),
      phone: formData.get("phone").trim(),
      createdAt: "Agora",
    };
    const nextEntries = [entry, ...entries];
    setEntries(nextEntries);
    localStorage.setItem(`evento-entries-${event.id}`, JSON.stringify(nextEntries));
    setNotice("Inscrição registrada com sucesso. Até o evento!");
  }
  function handleLogin(eventSubmit) {
    eventSubmit.preventDefault();
    if (password === "osasco2026") {
      setIsAdmin(true);
      setView("dashboard");
      setShowLogin(false);
      setPassword("");
    } else setNotice("Senha incorreta. Tente novamente.");
  }
  function saveEvent(eventSubmit) {
    eventSubmit.preventDefault();
    const nextEvent = { ...event, id: eventIdFor(event) };
    const entriesForEvent = JSON.parse(localStorage.getItem(`evento-entries-${nextEvent.id}`) || "[]");
    if (nextEvent.id !== event.id) setEntries(entriesForEvent);
    localStorage.setItem(`evento-entries-${nextEvent.id}`, JSON.stringify(nextEvent.id === event.id ? entries : entriesForEvent));
    localStorage.setItem("evento-config", JSON.stringify(nextEvent));
    setEvent(nextEvent);
    setSearch("");
    setNotice("Configurações do evento salvas.");
  }
  function saveChurch(churchSubmit) {
    churchSubmit.preventDefault();
    const normalizedName = churchName.trim();
    if (!normalizedName) return;
    if (editingChurch) {
      const nextChurches = churches.map((church) =>
        church === editingChurch ? normalizedName : church,
      );
      const nextEntries = entries.map((entry) =>
        entry.church === editingChurch
          ? { ...entry, church: normalizedName }
          : entry,
      );
      setChurches(nextChurches);
      setEntries(nextEntries);
      localStorage.setItem("evento-churches", JSON.stringify(nextChurches));
      localStorage.setItem(`evento-entries-${event.id}`, JSON.stringify(nextEntries));
      setNotice("Igreja alterada com sucesso.");
    } else if (
      churches.some(
        (church) => church.toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      setNotice("Essa igreja já está cadastrada.");
      return;
    } else {
      const nextChurches = [...churches, normalizedName];
      setChurches(nextChurches);
      localStorage.setItem("evento-churches", JSON.stringify(nextChurches));
      setNotice("Igreja adicionada com sucesso.");
    }
    setChurchName("");
    setEditingChurch(null);
  }
  function editChurch(church) {
    setEditingChurch(church);
    setChurchName(church);
    setNotice("");
  }
  function deleteChurch(church) {
    if (
      !window.confirm(
        `Excluir a igreja "${church}"? Os convidados cadastrados nela também serão removidos.`,
      )
    )
      return;
    const nextChurches = churches.filter((item) => item !== church);
    const nextEntries = entries.filter((entry) => entry.church !== church);
    setChurches(nextChurches);
    setEntries(nextEntries);
    localStorage.setItem("evento-churches", JSON.stringify(nextChurches));
    localStorage.setItem(`evento-entries-${event.id}`, JSON.stringify(nextEntries));
    setNotice("Igreja e seus convidados foram removidos.");
  }
  function startEditEntry(entry) {
    setEditingEntry(entry);
    setEntryForm({ guest: entry.guest, phone: entry.phone });
  }
  function saveEntry(entrySubmit) {
    entrySubmit.preventDefault();
    const guest = entryForm.guest.trim();
    const phone = entryForm.phone.trim();
    if (!guest || !phone) return;
    const nextEntries = entries.map((entry) =>
      entry.id === editingEntry.id ? { ...entry, guest, phone } : entry,
    );
    setEntries(nextEntries);
    localStorage.setItem(`evento-entries-${event.id}`, JSON.stringify(nextEntries));
    setEditingEntry(null);
    setNotice("Cadastro atualizado com sucesso.");
  }
  function deleteEntry(entry) {
    if (!window.confirm(`Excluir o cadastro de ${entry.guest}?`)) return;
    const nextEntries = entries.filter((item) => item.id !== entry.id);
    setEntries(nextEntries);
    localStorage.setItem(`evento-entries-${event.id}`, JSON.stringify(nextEntries));
    setNotice("Cadastro excluído com sucesso.");
  }
  function handleLogo(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setEvent((current) => ({ ...current, logo: reader.result }));
    reader.readAsDataURL(file);
  }
  function exportCsv() {
    const csv = [
      "Igreja,Nome do convidado,Telefone,Data do cadastro",
      ...entries.map((entry) =>
        [entry.church, entry.guest, entry.phone, entry.createdAt]
          .map((value) => `"${value}"`)
          .join(","),
      ),
    ].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    link.download = "inscricoes-evento.csv";
    link.click();
  }
  function exportPdf() {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 18;
    const addHeader = () => {
      pdf.setFillColor(7, 91, 135);
      pdf.rect(0, 0, pageWidth, 28, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(15);
      pdf.text("Inscrições de Eventos", 14, 12);
      pdf.setFontSize(9);
      pdf.text("Região de Osasco", 14, 20);
      pdf.setTextColor(28, 45, 56);
      y = 40;
    };
    const ensureSpace = (height = 8) => {
      if (y + height > 280) {
        pdf.addPage();
        addHeader();
      }
    };
    addHeader();
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text(event.name, 14, y);
    y += 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Data: ${new Date(`${event.date}T12:00:00`).toLocaleDateString("pt-BR")}    Total: ${entries.length} inscritos`, 14, y);
    y += 12;
    pdf.setFillColor(241, 201, 0);
    pdf.rect(14, y - 5, pageWidth - 28, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("IGREJA", 17, y);
    pdf.text("NOME DO CONVIDADO", 78, y);
    pdf.text("TELEFONE", 145, y);
    pdf.text("CADASTRO", 180, y);
    y += 8;
    churches.forEach((church) => {
      const churchEntries = entries.filter((entry) => entry.church === church);
      if (!churchEntries.length) return;
      ensureSpace(10);
      pdf.setTextColor(7, 91, 135);
      pdf.setFont("helvetica", "bold");
      pdf.text(church, 14, y);
      y += 6;
      pdf.setTextColor(55, 65, 72);
      pdf.setFont("helvetica", "normal");
      churchEntries.forEach((entry) => {
        ensureSpace(7);
        pdf.setFontSize(8);
        pdf.text(entry.church.substring(0, 25), 17, y);
        pdf.text(entry.guest.substring(0, 31), 78, y);
        pdf.text(entry.phone, 145, y);
        pdf.text(entry.createdAt, 180, y);
        y += 6;
      });
      y += 3;
    });
    pdf.save(`inscricoes-${event.id}.pdf`);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div
          className="brand"
          onClick={() => {
            setView("form");
            setNotice("");
          }}
        >
          <img className="brand-logo" src={churchLogo} alt="Igreja Internacional da Graca de Deus" />
          <div>
            <strong>Inscrições de Eventos</strong>
            <span>Região de Osasco</span>
          </div>
        </div>
        <div className="top-actions">
          {isAdmin && (
            <button
              className="ghost-button"
              onClick={() =>
                setView(view === "dashboard" ? "settings" : "dashboard")
              }
            >
              {view === "dashboard" ? "Configurar evento" : "Ver painel"}
            </button>
          )}
          <button
            className="admin-link"
            onClick={() =>
              isAdmin
                ? (setIsAdmin(false), setView("form"))
                : setShowLogin(true)
            }
          >
            {isAdmin ? "Sair do painel" : "Acesso administrativo"}{" "}
            <span>↗</span>
          </button>
        </div>
      </header>

      {view === "form" && (
        <main className="form-layout">
          <section className="intro-panel">
            <img className="event-logo" src={churchLogo} alt="Igreja Internacional da Graca de Deus" />
            <div className="eyebrow">
              <span className="live-dot" /> INSCRIÇÕES ABERTAS
            </div>
            <h1>{event.name}</h1>
            <p className="intro-copy">
              Confirme a presença dos convidados da sua igreja e ajude a nossa
              região a se preparar para este momento especial.
            </p>
            <div className="event-meta">
              <div className="calendar-icon">▣</div>
              <div>
                <small>DATA DO EVENTO</small>
                <strong>
                  {new Date(`${event.date}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "long", year: "numeric" },
                  )}
                </strong>
              </div>
            </div>
            <div className="privacy-note">
              <span>⌁</span>
              <div>
                <strong>Seus dados estão protegidos</strong>
                <p>
                  As informações serão visualizadas apenas pela administração do
                  evento.
                </p>
              </div>
            </div>
            <div className="wave-mark" aria-hidden="true">
              ⌁⌁
            </div>
          </section>
          <section className="form-card">
            <div className="form-card-heading">
              <div>
                <span className="section-kicker">PARTICIPAÇÃO</span>
                <h2>Inscrever convidado</h2>
              </div>
              <span className="step-pill">01 / 01</span>
            </div>
            <p className="muted">
              Preencha os dados abaixo para registrar uma pessoa.
            </p>
            <form
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault();
                submitEntry(new FormData(submitEvent.currentTarget));
                submitEvent.currentTarget.reset();
              }}
            >
              <label>
                Igreja responsável{" "}
                <select name="church" required defaultValue="">
                  <option value="" disabled>
                    Selecione a igreja
                  </option>
                  {churches.map((church) => (
                    <option key={church}>{church}</option>
                  ))}
                </select>
              </label>
              <label>
                Nome do convidado{" "}
                <input
                  name="guest"
                  required
                  placeholder="Digite o nome completo"
                />
              </label>
              <label>
                Telefone / WhatsApp{" "}
                <input
                  name="phone"
                  required
                  type="tel"
                  placeholder="(11) 99999-9999"
                />
              </label>
              <button className="primary-button" type="submit">
                Adicionar inscrição <span>→</span>
              </button>
            </form>
            {notice && (
              <div className="success-message">
                <span>✓</span>
                {notice}
              </div>
            )}
            <div className="form-footer">
              <span>
                Já temos <strong>{total} pessoas</strong> inscritas neste
                evento.
              </span>
              <span className="mini-lock">⌁ Privado</span>
            </div>
          </section>
        </main>
      )}

      {view === "dashboard" && isAdmin && (
        <main className="admin-page">
          <div className="admin-heading">
            <div>
              <span className="section-kicker">VISÃO GERAL</span>
              <h1>Painel do evento</h1>
              <p>Acompanhe as inscrições da região em tempo real.</p>
            </div>
            <div className="export-actions"><button className="outline-button" onClick={exportCsv}>↓ CSV</button><button className="outline-button pdf-button" onClick={exportPdf}>↓ PDF</button></div>
          </div>
          <div className="stats-grid">
            <div className="stat-card accent">
              <span>Total de inscritos</span>
              <strong>{total}</strong>
              <small>pessoas confirmadas</small>
            </div>
            <div className="stat-card">
              <span>Meta do evento</span>
              <strong>{event.target}</strong>
              <small className="orange-text">
                {Math.round((total / event.target) * 100)}% alcançado
              </small>
            </div>
            <div className="stat-card">
              <span>Igrejas participantes</span>
              <strong>
                {counts.filter((item) => item.count > 0).length}
                <em> / {churches.length}</em>
              </strong>
              <small>com inscrições</small>
            </div>
          </div>
          <section className="dashboard-grid">
            <div className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">DISTRIBUIÇÃO</span>
                  <h2>Inscritos por igreja</h2>
                </div>
                <span className="total-badge">{total} total</span>
              </div>
              <div className="bars">
                {counts.map(({ church, count }) => (
                  <div className="bar-row" key={church}>
                    <div className="bar-label">
                      <span>{church}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.max((count / maxCount) * 100, count ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel goal-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-kicker">PROGRESSO</span>
                  <h2>Meta do evento</h2>
                </div>
                <span className="target-icon">◎</span>
              </div>
              <div
                className="progress-ring"
                style={{
                  "--progress": `${Math.min((total / event.target) * 100, 100)}%`,
                }}
              >
                <div>
                  <strong>{Math.round((total / event.target) * 100)}%</strong>
                  <span>alcançado</span>
                </div>
              </div>
              <p>
                Faltam{" "}
                <strong>{Math.max(event.target - total, 0)} inscrições</strong>{" "}
                para chegar ao alvo.
              </p>
              <button
                className="text-button"
                onClick={() => setView("settings")}
              >
                Editar meta <span>→</span>
              </button>
            </div>
          </section>
          <section className="panel recent-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">ATIVIDADE RECENTE</span>
                <h2>Inscrições por igreja</h2>
              </div>
              <input className="search-input" value={search} onChange={(inputEvent) => setSearch(inputEvent.target.value)} placeholder="Pesquisar nome, telefone ou igreja" aria-label="Pesquisar inscrições" />
            </div>
            <div className="entry-table">
                  <div className="table-row table-head">
                <span>CONVIDADO</span>
                <span>IGREJA</span>
                <span>TELEFONE</span>
                <span>CADASTRO</span>
                    <span>AÇÕES</span>
              </div>
              {filteredEntries.length === 0 && <div className="empty-search">Nenhuma inscrição encontrada para essa pesquisa.</div>}
              {churches.map((church) => {
                const churchEntries = filteredEntries.filter((entry) => entry.church === church)
                if (!churchEntries.length) return null
                return <div className="church-group" key={church}><div className="church-group-title"><strong>{church}</strong><span>{churchEntries.length} {churchEntries.length === 1 ? 'pessoa' : 'pessoas'}</span></div>{churchEntries.map((entry) => <div className="table-row" key={entry.id}><span className="person"><i>{entry.guest.charAt(0)}</i><strong>{entry.guest}</strong></span><span>{entry.church}</span><span>{entry.phone}</span><span className="muted">{entry.createdAt}</span><span className="entry-actions"><button className="icon-button" type="button" onClick={() => startEditEntry(entry)} aria-label={`Editar ${entry.guest}`}>✎</button><button className="icon-button danger" type="button" onClick={() => deleteEntry(entry)} aria-label={`Excluir ${entry.guest}`}>×</button></span></div>)}</div>
              })}
            </div>
          </section>
        </main>
      )}

      {view === "settings" && isAdmin && (
        <main className="admin-page settings-page">
          <div className="admin-heading">
            <div>
              <span className="section-kicker">ADMINISTRAÇÃO</span>
              <h1>Configurar evento</h1>
              <p>
                Personalize as informações que aparecem no formulário público.
              </p>
            </div>
            <button
              className="outline-button"
              onClick={() => setView("dashboard")}
            >
              ← Voltar ao painel
            </button>
          </div>
          <form className="settings-form panel" onSubmit={saveEvent}>
            <div className="settings-logo">
              <div className="logo-preview">
                {event.logo ? (
                  <img src={event.logo} alt="Logo do evento" />
                ) : (
                  <img src={churchLogo} alt="Logo da Igreja Internacional da Graca de Deus" />
                )}
              </div>
              <div>
                <h3>Logo do evento</h3>
                <p>Adicione uma imagem para identificar este encontro.</p>
                <label className="upload-button">
                  ↑ Escolher imagem
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(inputEvent) =>
                      handleLogo(inputEvent.target.files[0])
                    }
                  />
                </label>
              </div>
            </div>
            <div className="settings-fields">
              <label>
                Nome do evento
                <input
                  value={event.name}
                  onChange={(inputEvent) =>
                    setEvent({ ...event, name: inputEvent.target.value })
                  }
                />
              </label>
              <label>
                Data do evento
                <input
                  type="date"
                  value={event.date}
                  onChange={(inputEvent) =>
                    setEvent({ ...event, date: inputEvent.target.value })
                  }
                />
              </label>
              <label>
                Alvo de inscrições
                <input
                  type="number"
                  min="1"
                  value={event.target}
                  onChange={(inputEvent) =>
                    setEvent({
                      ...event,
                      target: Number(inputEvent.target.value),
                    })
                  }
                />
              </label>
            </div>
            <button className="primary-button save-button" type="submit">
              Salvar configurações <span>✓</span>
            </button>
            {notice && (
              <div className="success-message">
                <span>✓</span>
                {notice}
              </div>
            )}
          </form>
          <section className="church-manager panel">
            <div className="panel-heading"><div><span className="section-kicker">CADASTRO</span><h2>Gerenciar igrejas</h2></div><span className="total-badge">{churches.length} cadastradas</span></div>
            <form className="church-form" onSubmit={saveChurch}><input value={churchName} onChange={(inputEvent) => setChurchName(inputEvent.target.value)} placeholder="Nome da nova igreja" aria-label="Nome da igreja" /><button className="outline-button" type="submit">{editingChurch ? 'Salvar alteração' : 'Adicionar igreja'}</button>{editingChurch && <button className="text-button cancel-edit" type="button" onClick={() => { setEditingChurch(null); setChurchName('') }}>Cancelar</button>}</form>
            <div className="church-list">{churches.map((church) => <div className="church-item" key={church}><span><strong>{church}</strong><small>{entries.filter((entry) => entry.church === church).length} inscritos</small></span><div><button className="icon-button" type="button" onClick={() => editChurch(church)} aria-label={`Editar ${church}`}>✎</button><button className="icon-button danger" type="button" onClick={() => deleteChurch(church)} aria-label={`Excluir ${church}`}>×</button></div></div>)}</div>
          </section>
        </main>
      )}

      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <form
            className="login-modal"
            onSubmit={handleLogin}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <button
              type="button"
              className="close-button"
              onClick={() => setShowLogin(false)}
            >
              ×
            </button>
            <div className="brand-mark large">IE</div>
            <span className="section-kicker">ÁREA RESTRITA</span>
            <h2>Acesso administrativo</h2>
            <p>Entre para visualizar os dados e acompanhar o evento.</p>
            <label>
              Senha de administrador
              <input
                autoFocus
                type="password"
                value={password}
                onChange={(inputEvent) => setPassword(inputEvent.target.value)}
                placeholder="Digite sua senha"
              />
            </label>
            <button className="primary-button" type="submit">
              Entrar no painel <span>→</span>
            </button>
            <small>
              Protótipo: senha inicial <strong>osasco2026</strong>
            </small>
          </form>
        </div>
      )}

      {editingEntry && (
        <div className="modal-backdrop" onClick={() => setEditingEntry(null)}>
          <form className="login-modal entry-modal" onSubmit={saveEntry} onClick={(clickEvent) => clickEvent.stopPropagation()}>
            <button type="button" className="close-button" onClick={() => setEditingEntry(null)}>×</button>
            <span className="section-kicker">EDITAR CADASTRO</span>
            <h2>Alterar pessoa</h2>
            <p>Atualize o nome e o telefone. A igreja permanece a mesma.</p>
            <label>Nome do convidado<input autoFocus value={entryForm.guest} onChange={(inputEvent) => setEntryForm({ ...entryForm, guest: inputEvent.target.value })} /></label>
            <label>Telefone / WhatsApp<input type="tel" value={entryForm.phone} onChange={(inputEvent) => setEntryForm({ ...entryForm, phone: inputEvent.target.value })} /></label>
            <button className="primary-button" type="submit">Salvar alteração <span>✓</span></button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
