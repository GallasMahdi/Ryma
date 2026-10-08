'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getLocalizedText, type Service } from '@/data/services';
import { getServiceName, getServicePole, getServicePrice } from '@/types/admin';
import type { Lang } from '@/lib/i18n';

type Snapshot={serviceNameJson?:string|null;servicePriceCents?:number|null;servicePole?:string|null};
const CatalogContext=createContext<Service[]>([]);
const AllCatalogContext=createContext<Service[]>([]);
export function ServiceCatalogProvider({children,initialServices=[],admin=false}: {children:ReactNode;initialServices?:Service[];admin?:boolean}) {
  const parent=useContext(CatalogContext);
  const [services,setServices]=useState(initialServices);
  const [loaded,setLoaded]=useState(!admin);
  const inFlight=useRef(false);
  const refresh=useCallback(async()=>{
    if(inFlight.current || document.visibilityState==='hidden')return;
    inFlight.current=true;
    try {
      const r=await fetch(admin?'/api/admin/treatments?catalogueOnly=1':'/api/treatments',{cache:'no-store'});
      if(r.ok){const data=await r.json();setLoaded(true);const next:Service[]=admin?data.treatments:data.services;setServices(current=>JSON.stringify(current)===JSON.stringify(next)?current:next);}
      else if(r.status===401 && admin){setServices([]);setLoaded(true);}
    } catch { /* Retain the last loaded catalogue; booking validates current availability. */ }
    finally {inFlight.current=false;}
  },[admin]);
  useEffect(()=>{
    // Server-rendered public data is fresh; avoid downloading the same catalogue at hydration.
    if(admin || !initialServices.length)void refresh();
    const timer=setInterval(refresh,30000);
    for(const e of ['focus','ryma_catalogue_changed','ryma_schedule_changed','ryma_authenticated'])window.addEventListener(e,refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{clearInterval(timer);for(const e of ['focus','ryma_catalogue_changed','ryma_schedule_changed','ryma_authenticated'])window.removeEventListener(e,refresh);document.removeEventListener('visibilitychange',refresh);};
  },[refresh]);
  const all=admin?(!loaded?parent:services):services;
  const selectable=useMemo(()=>admin?all.filter(s=>!('status' in s)||s.status==='PUBLISHED'):all,[all,admin]);
  return <AllCatalogContext.Provider value={all}><CatalogContext.Provider value={selectable}>{children}</CatalogContext.Provider></AllCatalogContext.Provider>;
}
export const useServices=()=>useContext(CatalogContext);
export const useAllServices=()=>useContext(AllCatalogContext);
export function useServiceLabels() {
  const catalogue=useAllServices();
  return useMemo(()=>({
    getServiceName:(slug:string,lang:Lang,snapshot?:Snapshot)=>snapshot?.serviceNameJson?getLocalizedText(JSON.parse(snapshot.serviceNameJson),lang):getServiceName(slug,lang,catalogue),
    getServicePrice:(slug:string,snapshot?:Snapshot)=>snapshot?.servicePriceCents!=null?snapshot.servicePriceCents/100:getServicePrice(slug,catalogue),
    getServicePole:(slug:string,snapshot?:Snapshot)=>(snapshot?.servicePole??getServicePole(slug,catalogue)) as Service['pole'],
  }),[catalogue]);
}
export function useTeamServices() {
  const services=useAllServices();
  return useMemo(()=>[...services.map(s=>({slug:s.slug,name:s.name,duration:parseInt(s.duration,10),pole:s.pole,status:('status' in s?String(s.status):'PUBLISHED')}))],[services]);
}
