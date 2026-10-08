import { notFound } from 'next/navigation';
import { getPublicServices } from '@/lib/treatments';
import ServiceDetail from './ServiceDetail';

export const dynamic='force-dynamic';
export default async function ServicePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  if(!(await getPublicServices()).some(service=>service.slug===slug))notFound();
  return <ServiceDetail slug={slug}/>;
}
