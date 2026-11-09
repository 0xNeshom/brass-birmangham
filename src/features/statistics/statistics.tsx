'use client';
import { useState } from 'react';
import Link from 'next/link';
import { scaleLinear, scaleBand } from 'd3-scale';
import { line } from 'd3-shape';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { completedCount, standings, type Tournament } from '@/domain/tournament';
import './statistics.css';

export const PLAYER_COLORS=['#c4a365','#88adb2','#cb9276'];
export function Statistics({tournament,full=false}:{tournament:Tournament;full?:boolean}){
  const rows=standings(tournament).sort((a,b)=>a.slot-b.slot);
  const count=completedCount(tournament);
  const [selected,setSelected]=useState<number|null>(null);
  const active=selected===null?count:Math.min(selected,count);
  const width=900,height=250,left=46,right=24,top=18,bottom=34;
  const x=scaleLinear().domain([0,10]).range([left,width-right]);
  const y=scaleLinear().domain([0,100]).range([height-bottom,top]);
  const path=line<number>().x((_,i)=>x(i)).y(value=>y(value));
  const bands=scaleBand().domain(rows.map(row=>row.name)).range([48,840]).padding(.35);
  const finishScale=scaleLinear().domain([0,10]).range([0,135]);
  function inspect(event:React.PointerEvent<SVGSVGElement>){const rect=event.currentTarget.getBoundingClientRect();const local=(event.clientX-rect.left)/rect.width*width;setSelected(Math.max(0,Math.min(count,Math.round(x.invert(local)))));}
  return <section className="statistics-section" aria-label="Tournament statistics">
    <div className="statistics-heading"><div><p className="eyebrow">The shape of the campaign</p><h2>Fortunes over time</h2></div>{!full&&<Link className="text-link" href={`/tournaments/${tournament.id}/statistics`}>Explore statistics <ArrowUpRight size={15}/></Link>}</div>
    <div className="panel progression-panel"><div className="chart-top"><p><TrendingUp size={16}/> Cumulative points</p><div className="chart-legend">{rows.map(row=><span key={row.slot}><i style={{background:PLAYER_COLORS[row.slot-1]}}/>{row.name}</span>)}</div></div>
      <svg className="progression-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`progression-title-${full}`} onPointerMove={inspect} onPointerDown={inspect}>
        <title id={`progression-title-${full}`}>{`Cumulative player scores through ${count} recorded matches. Use the match selector below to inspect scores.`}</title>
        {[0,25,50,75,100].map(tick=><g key={tick}><line x1={left} x2={width-right} y1={y(tick)} y2={y(tick)} stroke="#34372e" strokeDasharray={tick===0?'0':'3 5'}/><text x={left-14} y={y(tick)+4} textAnchor="end" fill="#b7b09f" fontSize="11">{tick}</text></g>)}
        {Array.from({length:11},(_,i)=><text key={i} x={x(i)} y={height-8} fill={i>count?'#777e6b':'#b7b09f'} fontSize="11" textAnchor="middle">{i===0?'Start':String(i).padStart(2,'0')}</text>)}
        {count<10&&<rect x={x(count)} y={top} width={x(10)-x(count)} height={height-bottom-top} fill="#111210" opacity=".3"/>}
        <line x1={x(active)} x2={x(active)} y1={top} y2={height-bottom} stroke="#7e826e" strokeDasharray="3 5"/>
        {rows.map(row=><g key={row.slot}><path d={path(row.progression)??''} fill="none" stroke={PLAYER_COLORS[row.slot-1]} strokeWidth="2.5" strokeDasharray={row.slot===2?'6 3':row.slot===3?'2 3':undefined}/>{row.progression.map((value,i)=>row.slot===1?<circle key={i} cx={x(i)} cy={y(value)} r={i===active?5:2.6} fill={PLAYER_COLORS[row.slot-1]} stroke="#1b1d19" strokeWidth="1.5"/>:row.slot===2?<rect key={i} x={x(i)-3.5} y={y(value)-3.5} width="7" height="7" fill={PLAYER_COLORS[row.slot-1]} stroke="#1b1d19" strokeWidth="1"/>:<path key={i} d={`M${x(i)},${y(value)-4.5}l4.5,4.5 -4.5,4.5 -4.5,-4.5Z`} fill={PLAYER_COLORS[row.slot-1]} stroke="#1b1d19" strokeWidth="1"/>)}</g>)}
      </svg>
      <div className="chart-selector"><label htmlFor={`match-inspector-${full}`}>Inspect match <strong>{active===0?'Start':String(active).padStart(2,'0')}</strong></label><input id={`match-inspector-${full}`} type="range" min="0" max={count} value={active} onChange={e=>setSelected(Number(e.target.value))} aria-valuetext={active===0?'Before the first match':`After match ${active}`}/><span>{count===0?'No results yet':`${count} recorded`}</span></div>
      <div className="chart-readout" aria-live="polite">{rows.map(row=><div key={row.slot} style={{borderColor:PLAYER_COLORS[row.slot-1]}}><span>{row.name}</span><strong>{row.progression[active]} <small>pts</small></strong><small>{active===0?'Before the campaign':`Match ${active}: +${row.progression[active]-row.progression[active-1]} points`}</small></div>)}</div>
      {count===0&&<p className="chart-empty">A blank ledger, full of possibility. Score lines begin with your first recorded match.</p>}
    </div>
    {full&&<><div className="statistics-heading"><div><p className="eyebrow">Consistency &amp; distinction</p><h2>Performance at the table</h2></div></div><div className="panel finish-panel"><div className="chart-top"><p>Finishing positions</p><div className="chart-legend"><span><i style={{background:'#c4a365'}}/>1st place</span><span><i style={{background:'#88adb2'}}/>2nd place</span><span><i style={{background:'#cb9276'}}/>3rd place</span></div></div><svg className="finish-svg" viewBox="0 0 900 250" role="img" aria-label="Finish counts for all three players; exact values are in the comparison table below.">{rows.map(row=><g key={row.slot} transform={`translate(${bands(row.name)},0)`}>{[row.firsts,row.seconds,row.thirds].map((value,index)=><g key={index}><rect x={index*24} y={178-finishScale(value)} width="18" height={finishScale(value)} fill={PLAYER_COLORS[index]} rx="1"/><text x={index*24+9} y={166-finishScale(value)} textAnchor="middle" fill="#f2e8d5" fontSize="12">{value}</text></g>)}<text x="33" y="212" textAnchor="middle" fill="#f2e8d5" fontSize="13">{row.name}</text></g>)}</svg></div>
      <div className="panel stats-table-wrap"><table className="stats-table"><caption>Player statistics comparison · {count} recorded matches</caption><thead><tr><th scope="col">Industrialist</th><th scope="col">Rank</th><th scope="col">Points</th><th scope="col">1st</th><th scope="col">2nd</th><th scope="col">3rd</th><th scope="col">Avg / match</th></tr></thead><tbody>{rows.map(row=><tr key={row.slot}><th scope="row">{row.name}</th><td>{row.rank}</td><td>{row.points}</td><td>{row.firsts}</td><td>{row.seconds}</td><td>{row.thirds}</td><td>{row.average===null?'—':row.average.toFixed(1)}</td></tr>)}</tbody></table></div></>}
    <details className="chart-data"><summary>View score progression as a table</summary><div className="stats-table-wrap"><table className="stats-table"><caption>Cumulative scores after each recorded match</caption><thead><tr><th scope="col">Match</th>{rows.map(row=><th scope="col" key={row.slot}>{row.name}</th>)}</tr></thead><tbody>{Array.from({length:count+1},(_,index)=><tr key={index}><th scope="row">{index===0?'Start':index}</th>{rows.map(row=><td key={row.slot}>{row.progression[index]}</td>)}</tr>)}</tbody></table></div></details>
  </section>;
}
