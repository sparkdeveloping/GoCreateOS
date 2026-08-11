'use client';
import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BadgeCheck, Camera, CheckCircle2, IdCard, Printer, RefreshCw, Search, Upload, UserRound } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { EmptyState, LoadingState, StatusPill } from '@/components/AdminUi';
import { cleanBadge, formatDate } from '@/lib/utils';
import { apiFetch, assetUrl } from '@/lib/client-api';

export default function BadgeStudio() {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [person, setPerson] = useState(null);
  const [badgeNumber, setBadgeNumber] = useState('');
  const [photo, setPhoto] = useState('');
  const [camera, setCamera] = useState(false);
  const [doorAccessMode, setDoorAccessMode] = useState('auto');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forceReassign, setForceReassign] = useState(false);
  const webcam = useRef(null);

  async function load(search = query) {
    setLoading(true);
    const response = await apiFetch(`/api/people/search?q=${encodeURIComponent(search)}&limit=100`);
    const result = await response.json();
    setPeople(result.people || []);
    setLoading(false);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => load(query), query.trim() ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [query]);

  function choose(selected) {
    setPerson(selected);
    setBadgeNumber(cleanBadge(selected.badgeNumber || ''));
    setPhoto(selected.photoUrl || '');
    setDoorAccessMode(selected.doorAccessOverride === true ? 'allow' : selected.doorAccessOverride === false ? 'deny' : 'auto');
    setMessage('');
    setForceReassign(false);
  }

  function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!person || !badgeNumber) return;
    setSaving(true);
    setMessage('');
    let persistedPhotoUrl = photo;
    if (photo.startsWith('data:image/')) {
      setMessage('Saving profile image…');
      const blob = await fetch(photo).then((response) => response.blob());
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      const form = new FormData();
      form.set('personId', person.id);
      form.set('file', new File([blob], `badge-photo.${extension}`, { type: blob.type || 'image/jpeg' }));
      const imageResponse = await apiFetch('/api/profile-image', { method: 'POST', body: form });
      const imageResult = await imageResponse.json();
      if (!imageResponse.ok) {
        setSaving(false);
        setMessage(imageResult.error || 'Profile image could not be saved.');
        return;
      }
      persistedPhotoUrl = imageResult.photoUrl;
      setPhoto(persistedPhotoUrl);
    }
    const response = await apiFetch('/api/badges', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personId: person.id,
        badgeNumber,
        existingPhotoUrl: persistedPhotoUrl,
        role: person.role || 'Member',
        doorAccessOverride: doorAccessMode === 'allow' ? true : doorAccessMode === 'deny' ? false : null,
        forceReassign,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || 'Badge could not be saved.');
      if (result.code === 'BADGE_ASSIGNED') setForceReassign(true);
    } else {
      setPhoto(result.photoUrl || persistedPhotoUrl);
      setPerson(result.person || { ...person, badgeNumber: result.badgeNumber, photoUrl: result.photoUrl || persistedPhotoUrl });
      setBadgeNumber(result.badgeNumber);
      setMessage('Badge saved. It can be scanned immediately.');
      setForceReassign(false);
    }
    setSaving(false);
  }

  function printBadge() {
    window.print();
  }

  return <AppShell title="Badge Studio" subtitle="Link RFID badges, capture photos, set desired door access, and print to the HDP5600">
    <section className="split-workspace badge-workspace">
      <article className="panel card-section list-panel no-print">
        <div className="section-heading"><div><p className="eyebrow">Step 1</p><h2>Choose a person</h2></div><button className="icon-button" onClick={() => load()} aria-label="Refresh"><RefreshCw /></button></div>
        <div className="admin-search live-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or current badge" /><span>{loading ? 'Searching…' : `${people.length} found`}</span></div>
        {loading ? <LoadingState /> : people.length ? <div className="directory-list compact">{people.map((item) => <button key={item.id} className={person?.id === item.id ? 'selected' : ''} onClick={() => choose(item)}><span className="avatar-initial">{item.displayName?.[0]}</span><span className="person-main"><strong>{item.displayName}</strong><small>{item.email || item.phone}</small></span><span className="person-meta"><StatusPill tone={item.membershipStatus === 'approved' ? 'green' : item.membershipStatus === 'pending' ? 'yellow' : 'red'}>{item.membershipStatus || 'unknown'}</StatusPill><small>{item.badgeNumber ? `Badge ${item.badgeNumber}` : 'New badge'}</small></span></button>)}</div> : <EmptyState icon={UserRound} title="No profiles matched" message="The directory automatically shows profiles before you search. Try a different name or verify the member sync." />}
      </article>

      <article className="panel card-section badge-editor no-print">
        {!person ? <EmptyState icon={BadgeCheck} title="Choose a member to begin" message="Badge Studio saves the RFID number in Firestore but never prints that number on the physical badge." /> : <>
          <div className="section-heading"><div><p className="eyebrow">Steps 2–4</p><h2>Link, photograph, and print</h2></div><StatusPill tone={person.membershipStatus === 'approved' ? 'green' : 'yellow'}>{person.membershipStatus || 'unknown'}</StatusPill></div>
          <div className="badge-form-grid">
            <label className="field"><span>RFID badge number</span><div className="input-with-icon"><IdCard /><input value={badgeNumber} onChange={(event) => setBadgeNumber(cleanBadge(event.target.value))} inputMode="numeric" placeholder="Scan the badge here" /></div><small>Scanner prefixes and suffixes such as # and ? are removed automatically.</small></label>
            <label className="field"><span>Door access policy</span><select value={doorAccessMode} onChange={(event) => setDoorAccessMode(event.target.value)}><option value="auto">Automatic — membership, employee, or admin rule</option><option value="allow">Manual override — always allow</option><option value="deny">Manual override — always deny</option></select><small>Administrators and employees default to allowed. Other people follow synced membership eligibility unless overridden.</small></label>
          </div>
          <div className="photo-tools">
            <div className="photo-preview">{photo ? <img src={assetUrl(photo)} alt={person.displayName} /> : <div><Camera /><span>No photo yet</span></div>}</div>
            <div className="photo-actions">
              <button className="btn secondary" onClick={() => setCamera((value) => !value)}><Camera size={18} />{camera ? 'Close camera' : 'Use camera'}</button>
              <label className="btn secondary file-button"><Upload size={18} />Upload photo<input type="file" accept="image/*" onChange={uploadPhoto} /></label>
              {camera && <div className="camera-box"><Webcam ref={webcam} audio={false} screenshotFormat="image/jpeg" videoConstraints={{ facingMode: 'user', width: 800, height: 800 }} /><button className="btn primary" onClick={() => { setPhoto(webcam.current?.getScreenshot() || ''); setCamera(false); }}><Camera size={18} />Capture photo</button></div>}
            </div>
          </div>
          <div className="badge-person-summary"><div><strong>{person.displayName}</strong><span>{person.role || person.membershipType || 'Member'}</span></div><div><span>Membership expires</span><strong>{formatDate(person.membershipExpiresAt)}</strong></div></div>
          {message && <div className={`inline-alert ${message.startsWith('Badge saved') ? 'success' : 'error'}`}>{message}</div>}
          {forceReassign && <label className="confirmation-box"><input type="checkbox" checked={forceReassign} onChange={(event) => setForceReassign(event.target.checked)} /><span><strong>Admin reassign mode</strong><small>This badge is linked elsewhere. Saving will deactivate the former link and record an audit event.</small></span></label>}
          <div className="button-row"><button className="btn primary" onClick={save} disabled={saving || !badgeNumber}><CheckCircle2 size={18} />{saving ? 'Saving…' : 'Save badge'}</button><button className="btn secondary" onClick={printBadge} disabled={!person || !photo}><Printer size={18} />Print to HDP5600</button></div>
        </>}
      </article>
    </section>

    {person && <section className="print-zone"><div className="badge-card print-card">
      <div className="badge-accent" /><img className="badge-logo-top" src="/GCVertical_ColorAndBlack.svg" alt="GoCreate" />
      <div className="badge-photo-frame">{photo ? <img src={assetUrl(photo)} alt={person.displayName} /> : <UserRound />}</div>
      <div className="badge-copy"><p>GOCREATE MEMBER</p><h2>{person.displayName}</h2><span>{person.role || person.membershipType || 'Member'}</span></div>
      <div className="badge-footer"><span>MAKE · LEARN · COLLABORATE</span><img src="/GCVertical_ColorAndBlack.svg" alt="GoCreate" /></div>
    </div></section>}
  </AppShell>;
}
