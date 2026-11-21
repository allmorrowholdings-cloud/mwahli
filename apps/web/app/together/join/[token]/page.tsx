import { ModuleFrame } from '@/components/module-frame';
import { TogetherRoom } from '@/components/together-room';
export default async function Page({params}:{params:Promise<{token:string}>}){const {token}=await params;return <ModuleFrame eyebrow="MWAHLI Together" title="One room. One thoughtful moment." description="Contribute privately, vote, add memories and keep the final moment coordinated."><TogetherRoom token={token}/></ModuleFrame>}
