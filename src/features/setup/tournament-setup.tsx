'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users } from 'lucide-react';
import { validateNames } from '@/domain/tournament';

export function TournamentSetup({ onCreate }: { onCreate: (title: string, names: string[]) => Promise<string> }) {
  const [title,setTitle]=useState('The Birmingham Series');
  const [names,setNames]=useState(['','','']);
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);
  const router=useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();setError('');
    try {
      const cleaned=validateNames(names);
      if(!title.trim() || Array.from(title.trim()).length>80) throw new Error('Give this tournament a title between 1 and 80 characters.');
      setSaving(true);
      const id=await onCreate(title.trim(),cleaned);
      router.push(`/tournaments/${id}`);router.refresh();
    }catch(error){setError(error instanceof Error?error.message:'The tournament could not be created. Please try again.');setSaving(false);}
  }
  return <div className="setup-layout"><aside className="setup-aside"><p className="eyebrow">A new chapter</p><h1>Every empire<br/>begins here.</h1><p className="muted">Gather your industrialists. Open a fresh ledger. Let ten evenings at the table decide the rest.</p><div className="rules"><div className="rule-row"><span>Industrialists</span><strong>Exactly three</strong></div><div className="rule-row"><span>Matches</span><strong>Ten, played in order</strong></div><div className="rule-row"><span>First / second / third</span><strong>10 / 5 / 0 points</strong></div><div className="rule-row"><span>A perfect campaign</span><strong>100 points</strong></div></div></aside><form className="panel setup-form" onSubmit={submit}><p className="eyebrow"><Users size={14} style={{display:'inline',marginRight:8}}/>The tournament register</p><h2>Meet the industrialists</h2><div className="field"><label htmlFor="tournament-title">Tournament title</label><input id="tournament-title" required value={title} onChange={e=>setTitle(e.target.value)} autoComplete="off"/></div><fieldset style={{border:0,padding:0,margin:0}} disabled={saving}><legend className="sr-only">Three player names</legend>{names.map((name,index)=><div className="field" key={index}><label htmlFor={`player-${index}`}>Player {index+1}</label><div className="player-field"><span>0{index+1}</span><input id={`player-${index}`} value={name} onChange={e=>setNames(current=>current.map((v,i)=>i===index?e.target.value:v))} placeholder="An industrialist’s name" autoComplete="off" required/></div></div>)}</fieldset>{error&&<p className="error-message" role="alert">{error}</p>}<button className="button" disabled={saving}>{saving?'Opening the ledger…':'Begin the tournament'}<ArrowRight size={16}/></button><p className="muted" style={{fontSize:12,margin:'18px 0 0'}}>Names can be changed later. Previous tournament records are preserved.</p></form></div>;
}
