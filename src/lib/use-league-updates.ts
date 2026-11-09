'use client';
import {useEffect,useState} from 'react';
import {browserClient} from './supabase/browser';
/** Realtime invalidates complete snapshots; never assemble individual row events. */
export function useLeagueUpdates(groupId:string,onChange:()=>void){
  const [connection,setConnection]=useState('Connecting to the league…');
  useEffect(()=>{
    const client=browserClient();let subscribed=false;let active=true;
    // Realtime invalidations must not be discarded by background documents;
    // otherwise an active session can miss updates until it reconnects.
    const refresh=()=>{if(active&&navigator.onLine)onChange();};
    const channel=client.channel(`ledger:${groupId}:${crypto.randomUUID()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'tournaments',filter:`group_id=eq.${groupId}`},()=>{
        refresh();
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'tournaments',filter:`group_id=eq.${groupId}`},()=>{
        refresh();
      })
      .subscribe(status=>{
      if(!active)return;subscribed=status==='SUBSCRIBED';setConnection(subscribed?'Live · shared with your league':navigator.onLine?'Reconnecting · results may be delayed':'Offline · viewing last loaded results');if(subscribed)refresh();
    });
    const online=()=>{setConnection('Reconnecting to the league…');refresh();};
    const offline=()=>{subscribed=false;setConnection('Offline · viewing last loaded results');};
    const poll=setInterval(()=>{if(!subscribed&&document.visibilityState==='visible')refresh();},30000);
    window.addEventListener('focus',refresh);window.addEventListener('online',online);window.addEventListener('offline',offline);document.addEventListener('visibilitychange',refresh);
    return()=>{active=false;clearInterval(poll);void client.removeChannel(channel);window.removeEventListener('focus',refresh);window.removeEventListener('online',online);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',refresh);};
  },[groupId,onChange]);
  return connection;
}
