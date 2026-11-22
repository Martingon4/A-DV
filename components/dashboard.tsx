"use client";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Boxes, LayoutDashboard, HandHeart, History, LogOut, Plus, Check, PackageCheck, X, RefreshCw } from "lucide-react";
type RequestRow = {id:string;name:string;location:string;requested:number;reserved:number;delivered:number;pending:number};
type Line = {id:string;quantity:number;status:string;explanation:string;request:{center:{name:string}}};
type Data = {role:string;requests:RequestRow[];balance:{onHand:number;reserved:number}|null;lines:Line[];events:{id:string;action:string;quantity:number|null;reference:string|null;createdAt:string;actor:string}[]};
type Proposal = {id:string;lines:{id:string;quantity:number;pendingAfter:number;explanation:string}[]};
const tabs = [{label:"Resumen",icon:LayoutDashboard},{label:"Inventario",icon:Boxes},{label:"Solicitudes",icon:HandHeart},{label:"Entregas",icon:PackageCheck},{label:"Historial",icon:History}];
export default function Dashboard() {
  const [data,setData]=useState<Data|null>(null);
  const [tab,setTab]=useState("Resumen");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const [modal,setModal]=useState(false);
  const [proposal,setProposal]=useState<Proposal|null>(null);
  const [donationKey,setDonationKey]=useState("");
  async function load() {
    const response=await fetch("/api/data");
    const result=await response.json();
    if(!response.ok) throw new Error(result.error);
    setData(result);
  }
  useEffect(()=>{load().catch(e=>setError(e.message));},[]);
  async function act(input:object) {
    setBusy(true);setError("");setNotice("");
    try {
      const response=await fetch("/api/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error);
      if(result.proposal) setProposal(result.proposal); else setProposal(null);
      setNotice(result.message);setModal(false);
      await load();
    } catch(e) {setError(e instanceof Error?e.message:"Ocurrió un error. Puedes reintentar.");}
    finally {setBusy(false);}
  }
  useEffect(() => {
    if (!modal && !proposal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const elements = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled),input,summary') ?? []);
    elements()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if(event.key === "Escape" && !busy) { setModal(false); setProposal(null); }
      if(event.key !== "Tab") return;
      const focusable = elements();
      const first = focusable[0], last = focusable.at(-1);
      if(event.shiftKey && document.activeElement===first) { event.preventDefault(); last?.focus(); }
      else if(!event.shiftKey && document.activeElement===last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown",handleKey);
    return () => { document.removeEventListener("keydown",handleKey); previous?.focus(); };
  },[modal,proposal,busy]);
  const coordinator=data?.role==="COORDINATOR";
  const total=data?.requests.reduce((s,r)=>s+r.requested,0)??0;
  const delivered=data?.requests.reduce((s,r)=>s+r.delivered,0)??0;
  const pending=data?.requests.reduce((s,r)=>s+r.pending,0)??0;
  return <div className="shell">
    <aside><a className="logo" href="/"><span className="brandmark">d.</span><span>Donaciones<span className="logo-sub">donde hacen falta</span></span></a>
      <p className="nav-caption">ESPACIO DE TRABAJO</p><nav>{tabs.filter(t=>coordinator || t.label!=="Inventario").map(t=><button key={t.label} className={tab===t.label?"nav-item active":"nav-item"} onClick={()=>setTab(t.label)}><t.icon size={19}/>{t.label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="avatar">{coordinator?"RC":"CE"}</div><div><strong>{coordinator?"Red comunitaria":"Centro Esperanza"}</strong><small>{coordinator?"Coordinación":"Centro receptor"}</small></div><button className="icon" aria-label="Cerrar sesión" onClick={()=>signOut()}><LogOut size={18}/></button></div>
    </aside>
    <main className="workspace"><header className="topbar"><span><span className="desktop-label">Red comunitaria / </span>{tab}</span><span className="campaign-tag">Campaña de higiene</span><button className="icon mobile-logout" aria-label="Cerrar sesión" onClick={()=>signOut()}><LogOut size={18}/></button></header>
      <div className="content"><div className="page-heading"><div><p className="eyebrow">DONACIONES DONDE HACEN FALTA</p><h1>{tab==="Resumen"?"Cada kit cuenta.":tab}</h1><p className="muted">{tab==="Resumen"?"Una mirada clara a lo que tenemos y a lo que todavía hace falta.":"Campaña de higiene · cantidades en kits"}</p></div>
        {coordinator&&<button disabled={busy||!data} onClick={()=>{setDonationKey(crypto.randomUUID());setModal(true);}}><Plus size={18}/>Registrar donación</button>}</div>
      {error&&<div className="alert error" role="alert">{error}<button className="secondary" onClick={()=>load().catch(e=>setError(e.message))}>Reintentar</button></div>}
      {notice&&<div className="alert success" role="status"><Check size={18}/>{notice}</div>}
      {!data?<div className="empty">Cargando campaña…</div>:<>
      {tab==="Resumen"&&<>
        <div className="stats">{[{label:coordinator?"Disponibles para repartir":"Mi necesidad pendiente",value:coordinator?data.balance!.onHand-data.balance!.reserved:pending,detail:coordinator?"Listos para llegar a un centro":"Unidades por cubrir"},
          {label:"Reservados",value:coordinator?data.balance!.reserved:data.requests.reduce((s,r)=>s+r.reserved,0),detail:"Con destino confirmado"},
          {label:"Entregados",value:delivered,detail:"Recepciones registradas"},
          {label:"Necesidad pendiente",value:pending,detail:"Después de las reservas"}].map(s=><article className="stat" key={s.label}><p>{s.label}</p><strong>{s.value}<span> kits</span></strong><small>{s.detail}</small></article>)}</div>
        <section className="overview"><div><p className="eyebrow">AVANCE DE LA CAMPAÑA</p><h2>Del almacén a las personas.</h2><p className="muted">Cada entrega acerca la campaña a su objetivo.</p><div className="progress"><span style={{width:`${total?delivered/total*100:0}%`}}/></div><p><strong>{delivered} de {total} kits entregados</strong><span className="right">{total?Math.round(delivered/total*100):0}%</span></p></div>
          <div className="overview-action"><div className="circle-icon"><HandHeart size={30}/></div><h3>{coordinator?"Un reparto con explicación":"Tu centro, al día"}</h3><p>{coordinator?"Distribuye según la necesidad pendiente de cada centro. Revisa las cantidades antes de confirmar.":"Consulta las reservas y entregas destinadas a tu centro."}</p>{coordinator&&<button disabled={busy} onClick={()=>act({action:"preview"})}>Preparar reparto</button>}</div></section>
      </>}
      {(tab==="Resumen"||tab==="Solicitudes")&&<section className="panel"><div className="section-title"><div><h2>Necesidades de los centros</h2><p className="muted">{data.requests.length} centros · {pending} kits pendientes</p></div><span className="tag">Kits de higiene</span></div>
        <div className="table-wrap"><table><thead><tr><th>Centro</th><th>Solicitados</th><th>Reservados</th><th>Entregados</th><th>Pendientes</th>{tab==="Solicitudes"&&<th>Actualizar necesidad</th>}</tr></thead>
        <tbody>{data.requests.map(r=><tr key={r.id}><td><strong>{r.name}</strong><small>{r.location}</small></td><td data-label="Solicitados">{r.requested}</td><td data-label="Reservados">{r.reserved}</td><td data-label="Entregados">{r.delivered}</td><td data-label="Pendientes"><span className="quantity-pill">{r.pending}</span></td>{tab==="Solicitudes"&&<td><form className="inline-form" onSubmit={e=>{e.preventDefault();act({action:"request",id:r.id,quantity:Number(new FormData(e.currentTarget).get("quantity"))});}}><input aria-label={`Necesidad de ${r.name}`} name="quantity" type="number" min={r.reserved+r.delivered} max="1000000" defaultValue={r.requested} required/><button className="secondary" disabled={busy}>Guardar</button></form></td>}</tr>)}</tbody></table></div></section>}
      {tab==="Inventario"&&<section className="panel"><div className="section-title"><h2>Inventario de kits</h2><Boxes/></div><div className="inventory-totals"><p>En almacén <strong>{data.balance?.onHand}</strong></p><p>Reservados <strong>{data.balance?.reserved}</strong></p><p>Disponibles <strong>{data.balance!.onHand-data.balance!.reserved}</strong></p></div><p className="muted">Las reservas se descuentan del disponible. Al registrar una entrega, las unidades salen del almacén.</p></section>}
      {tab==="Entregas"&&<section className="panel"><div className="section-title"><h2>Asignaciones y entregas</h2></div>{!data.lines.length?<div className="empty">Las asignaciones aparecerán después de confirmar un reparto.</div>:<div className="line-list">{data.lines.map(l=><article key={l.id}><div><h3>{l.request.center.name}</h3><p>{l.quantity} kits · <span className="tag">{l.status==="RESERVED"?"Reservado":l.status==="DELIVERED"?"Entregado":"Cancelado"}</span></p><details><summary>Cómo se calculó</summary><p>{l.explanation}</p></details></div>{coordinator&&l.status==="RESERVED"&&<div className="actions"><button disabled={busy} onClick={()=>{if(confirm(`¿Confirmas la entrega de ${l.quantity} kits a ${l.request.center.name}?`))act({action:"deliver",id:l.id});}}>Registrar entrega</button><button className="secondary" disabled={busy} onClick={()=>{if(confirm("¿Liberar esta reserva?"))act({action:"cancel",id:l.id});}}>Cancelar reserva</button></div>}</article>)}</div>}</section>}
      {(tab==="Historial"||tab==="Inventario")&&<section className="panel"><div className="section-title"><h2>Historial de movimientos</h2><History size={20}/></div>{!data.events.length?<div className="empty">Los movimientos de la campaña aparecerán aquí.</div>:data.events.filter(e=>tab!=="Inventario"||["Donación recibida","Entrega registrada"].includes(e.action)).map(e=><div className="event" key={e.id}><span className="event-icon"><Check size={16}/></span><div><strong>{e.action}</strong><small>{e.reference||e.actor} · {new Date(e.createdAt).toLocaleString("es")}</small></div><strong>{e.quantity??""} kits</strong></div>)}</section>}
      </>}
      <footer>Red comunitaria · Reparto proporcional con confirmación humana</footer></div>
    </main>
    {proposal&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="proposal-title" className="dialog"><button className="close icon" aria-label="Cerrar propuesta" onClick={()=>setProposal(null)}><X/></button><p className="eyebrow">REVISIÓN DEL REPARTO</p><h2 id="proposal-title">Una propuesta para cada centro.</h2><p className="muted">El inventario se reserva al confirmar. Las cantidades se calculan según la necesidad pendiente.</p>{proposal.lines.map(l=><div className="proposal-line" key={l.id}><div><strong>{data?.requests.find(r=>r.id===l.id)?.name}</strong><p>{l.explanation}</p><small>Quedan {l.pendingAfter} kits pendientes</small></div><strong>{l.quantity}<small>kits</small></strong></div>)}<div className="actions"><button disabled={busy||!proposal.lines.some(l=>l.quantity>0)} onClick={()=>act({action:"confirm",id:proposal.id})}>Confirmar y reservar</button><button className="secondary" disabled={busy} onClick={()=>act({action:"preview"})}><RefreshCw size={16}/>Recalcular</button></div>{error&&<p className="error" role="alert">{error}</p>}</section></div>}
    {modal&&<div className="overlay"><section role="dialog" aria-modal="true" aria-labelledby="donation-title" className="dialog small-dialog"><button className="close icon" aria-label="Cerrar formulario" onClick={()=>setModal(false)}><X/></button><p className="eyebrow">UNA NUEVA CONTRIBUCIÓN</p><h2 id="donation-title">Registrar donación</h2><p className="muted">Añade kits recibidos al inventario disponible.</p><form onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);act({action:"donate",quantity:Number(form.get("quantity")),reference:form.get("reference"),key:donationKey});}}><label>Cantidad de kits<input name="quantity" type="number" min="1" max="1000000" required autoFocus placeholder="90"/></label><label>Referencia de recepción<input name="reference" maxLength={160} required placeholder="Donación de la asociación vecinal"/></label><button disabled={busy}>{busy?"Guardando…":"Guardar donación"}</button></form>{error&&<p className="error" role="alert">{error}</p>}</section></div>}
  </div>;
}
