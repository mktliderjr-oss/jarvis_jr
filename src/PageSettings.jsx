import { Sun, Moon, Palette, Desktop, Check, UserSwitch, WhatsappLogo, ArrowUpRight } from '@phosphor-icons/react';

const choices = [
  { id: 'light', label: 'Claro', description: 'Fundo claro e painéis brancos.', Icon: Sun },
  { id: 'dark', label: 'Escuro', description: 'Preto com contraste suave.', Icon: Moon },
  { id: 'beige', label: 'Bege', description: 'Tons quentes de laranja claro.', Icon: Palette },
  { id: 'system', label: 'Cores do sistema', description: 'Acompanha o tema do dispositivo.', Icon: Desktop },
];
export default function PageSettings({ theme, setTheme, resolvedTheme, usuario, onChangeUser }) {
  return <div className="page-shell settings-page">
    <div className="page-heading"><h1>Configurações</h1><p>Personalize a aparência do seu painel.</p></div>
    <section className="panel settings-panel" aria-labelledby="appearance-title">
      <div className="panel-heading"><Palette size={23} /><h2 id="appearance-title">Aparência</h2></div>
      <fieldset className="theme-fieldset"><legend>Tema do aplicativo</legend>
        <p>Escolha como você prefere visualizar o Jarvis Jr.</p>
        <div className="theme-options">
          {choices.map(({ id, label, description, Icon }) => <label className={`theme-option ${theme === id ? 'is-selected' : ''}`} key={id}>
            <input type="radio" name="theme" aria-label={label} value={id} checked={theme === id} onChange={() => setTheme(id)} />
            <span className={`theme-preview preview-${id}`} aria-hidden="true"><span className="preview-rail"/><span className="preview-content"><i/><span><b/><b/><b/></span><i/></span></span>
            <span className="theme-option-title"><Icon size={19}/><strong>{label}</strong><span className="theme-check">{theme === id && <Check size={14} weight="bold"/>}</span></span>
            <span className="theme-description">{description}</span>
          </label>)}
        </div>
      </fieldset>
      <p className="settings-save-note" role="status"><Check size={17}/> Preferência aplicada automaticamente neste navegador.{theme === 'system' && ` O sistema está no modo ${resolvedTheme === 'dark' ? 'escuro' : 'claro'}.`}</p>
    </section>
    <div className="settings-secondary">
      <section className="panel settings-detail"><div className="panel-heading"><UserSwitch size={23}/><h2>Perfil em uso</h2></div><div className="settings-profile"><span className="user-avatar">{usuario.slice(0,1)}</span><div><strong>{usuario}</strong><p>{usuario === 'Diretor' ? 'Acompanhamento da operação' : 'Equipe comercial'}</p></div><button className="button-secondary" onClick={onChangeUser}>Trocar perfil</button></div></section>
      <section className="panel settings-detail"><div className="panel-heading"><WhatsappLogo size={23}/><h2>Suporte</h2></div><p>Precisa de ajuda com o aplicativo?</p><a className="support-link" href="https://wa.me/5518981210913" target="_blank" rel="noreferrer">Falar pelo WhatsApp <ArrowUpRight size={17}/></a><small>+55 (18) 98121-0913</small></section>
    </div>
  </div>;
}
