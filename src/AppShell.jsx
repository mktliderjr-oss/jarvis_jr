import { useEffect, useRef } from 'react';
import { SquaresFour, MagnifyingGlass, Kanban, ClockCounterClockwise, Database, ChartBar, SlidersHorizontal, WhatsappLogo, CaretDown, ArrowClockwise } from '@phosphor-icons/react';
import liderLogo from './lider_jr_logo.png';

const pages = [
  { id: 'dashboard', label: 'Dashboard', Icon: SquaresFour },
  { id: 'prospeccao', label: 'Prospecção', Icon: MagnifyingGlass },
  { id: 'crm', label: 'CRM', Icon: Kanban },
  { id: 'atividades', label: 'Atividades', Icon: ClockCounterClockwise },
  { id: 'base', label: 'Base de Leads', Icon: Database },
  { id: 'analytics', label: 'Analytics', Icon: ChartBar },
];
export default function AppShell({ active, onNav, usuario, onChangeUser, onSearch, loading, lastSync, onRefresh, children }) {
  const searchRef = useRef(null);
  useEffect(() => {
    const onKey = event => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
    <aside className="app-sidebar">
      <nav className="app-nav" aria-label="Navegação principal">
        {pages.map(({ id, label, Icon }) => <button type="button" className="nav-button" key={id} aria-label={label} aria-current={active === id ? 'page' : undefined} onClick={() => onNav(id)}><Icon size={22} weight={active === id ? 'fill' : 'regular'}/><span className="nav-label">{label}</span></button>)}
      </nav>
      <nav className="app-tools" aria-label="Preferências e suporte">
        <button type="button" className="nav-button" aria-label="Configurações" aria-current={active === 'settings' ? 'page' : undefined} onClick={() => onNav('settings')}><SlidersHorizontal size={23}/><span className="nav-label">Configurações</span></button>
        <a className="nav-button support-nav" aria-label="Falar com o suporte pelo WhatsApp" href="https://wa.me/5518981210913" target="_blank" rel="noreferrer"><WhatsappLogo size={23}/><span className="nav-label">Suporte</span></a>
      </nav>
    </aside>
    <div className="app-content">
      <header className="app-topbar">
        <button className="brand-link" aria-label="Jarvis Jr. - Dashboard" onClick={() => onNav('dashboard')}><img src={liderLogo} alt="Líder Jr."/><span>Jarvis Jr.</span></button>
        <form className="global-search" role="search" onSubmit={event => { event.preventDefault(); onSearch(searchRef.current.value.trim()); }}>
          <MagnifyingGlass size={20}/><input ref={searchRef} type="search" aria-label="Buscar na base de leads" placeholder="Buscar na base de leads…"/><kbd>Ctrl K</kbd>
        </form>
        <div className="topbar-actions"><button className="icon-button sync-button" onClick={onRefresh} disabled={loading} aria-label={loading ? 'Sincronizando planilha' : 'Atualizar dados'} title={lastSync ? `Atualizado às ${lastSync.toLocaleTimeString('pt-BR')}` : 'Atualizar dados'}><ArrowClockwise size={21} className={loading ? 'spin' : undefined}/></button>
          <button type="button" className="profile-switcher" onClick={onChangeUser} aria-label={`Perfil atual: ${usuario}. Trocar perfil`}><span className="user-avatar">{usuario.slice(0,1)}</span><span className="profile-name"><strong>{usuario}</strong><small>{usuario === 'Diretor' ? 'Diretoria' : 'Comercial'}</small></span><CaretDown size={15}/></button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>{children}</main>
      <footer className="app-footer"><span>Jarvis Jr. <span className="footer-divider">/</span> Líder Jr.</span><span role="status">{loading ? 'Sincronizando planilha…' : lastSync ? `Atualizado às ${lastSync.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}` : 'Sem sincronização'}</span></footer>
    </div>
  </div>;
}
