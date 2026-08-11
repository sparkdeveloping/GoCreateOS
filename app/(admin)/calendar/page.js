'use client';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Plus, Save, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { apiFetch } from '@/lib/client-api';

const empty = { title: '', eventType: 'event', startsAt: '', endsAt: '', description: '', areaKey: '', closed: false };
const types = [
  ['event','Event'], ['class','Class or training'], ['special-hours','Special hours'],
  ['operating-hours-exception','Closure or hours exception'], ['machine-reservation','Machine reservation'],
  ['machine-maintenance','Machine maintenance'], ['staff-reminder','Staff reminder'],
];
function localInput(value) { if (!value) return ''; const date = new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date - offset).toISOString().slice(0,16); }
function dayKey(value) { return new Date(value).toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' }); }

export default function CalendarPage() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const range = useMemo(() => ({ start: new Date(Date.now()-30*86400000).toISOString(), end: new Date(Date.now()+180*86400000).toISOString() }), []);
  async function load() { const r=await apiFetch(`/api/calendar?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`,{cache:'no-store'}); const x=await r.json(); if(r.ok)setData(x);else setMessage(x.error); }
  useEffect(()=>{load();},[]);
  async function save() {
    setBusy(true); setMessage('');
    const r=await apiFetch('/api/calendar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({...form,startsAt:new Date(form.startsAt).toISOString(),endsAt:new Date(form.endsAt).toISOString()})});
    const x=await r.json(); setBusy(false); setMessage(r.ok?'Calendar item saved.':x.error); if(r.ok){setForm(empty);load();}
  }
  async function remove(id){ const r=await apiFetch(`/api/calendar?id=${encodeURIComponent(id)}`,{method:'DELETE'}); if(r.ok)load(); else setMessage((await r.json()).error); }
  const grouped = useMemo(()=>Object.groupBy?.(data?.events||[],(e)=>dayKey(e.startsAt)) || (data?.events||[]).reduce((a,e)=>{(a[dayKey(e.startsAt)] ||= []).push(e);return a;},{}),[data]);
  return <AppShell title="Operations calendar" subtitle="One calendar for hours, events, classes, staff reminders, machines, and special days" actions={<button className="btn secondary" onClick={()=>setForm(empty)}><Plus size={18}/>New item</button>}>
    {message&&<div className={`inline-alert ${message.includes('saved')?'success':'error'}`}>{message}</div>}
    {!data?<LoadingState/>:<section className="calendar-workspace">
      <article className="panel calendar-agenda"><div className="section-heading"><div><p className="eyebrow">Upcoming</p><h2>Operations agenda</h2></div><StatusPill tone="blue">{data.events.length} items</StatusPill></div>
        {!data.events.length?<EmptyState icon={CalendarDays} title="No calendar items yet" message="Create special hours, events, classes, or machine activity."/>:<div className="agenda-groups">{Object.entries(grouped).map(([day,events])=><section key={day}><h3>{day}</h3>{events.map(event=><article key={event.id} className="agenda-item"><span className={`calendar-type ${event.eventType}`}/><div><strong>{event.title}</strong><small>{new Date(event.startsAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}–{new Date(event.endsAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} · {event.eventType.replaceAll('-',' ')}</small>{event.description&&<p>{event.description}</p>}</div><button className="icon-button" onClick={()=>remove(event.id)} aria-label="Delete"><Trash2/></button></article>)}</section>)}</div>}
      </article>
      <article className="panel card-section calendar-editor"><div className="section-heading"><div><p className="eyebrow">Create item</p><h2>Calendar details</h2></div><Clock3/></div>
        <div className="field-grid one"><label className="field"><span>Title</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Public event, early closure, class…"/></label><label className="field"><span>Type</span><select value={form.eventType} onChange={e=>setForm({...form,eventType:e.target.value})}>{types.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label><label className="field"><span>Starts</span><input type="datetime-local" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})}/></label><label className="field"><span>Ends</span><input type="datetime-local" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})}/></label>{form.eventType==='operating-hours-exception'&&<label className="setting-toggle compact"><input type="checkbox" checked={form.closed} onChange={e=>setForm({...form,closed:e.target.checked})}/><span className="toggle-track"/><span><strong>Facility closed</strong><small>Overrides regular hours for this date.</small></span></label>}<label className="field"><span>Description</span><textarea rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label></div>
        <button className="btn primary wide" disabled={busy||!form.title||!form.startsAt||!form.endsAt} onClick={save}><Save size={18}/>{busy?'Saving…':'Save calendar item'}</button>
      </article>
    </section>}
  </AppShell>;
}
