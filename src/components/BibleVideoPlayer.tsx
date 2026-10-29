import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
const MuxPlayer=lazy(()=>import("@mux/mux-player-react"));
export function BibleVideoPlayer({playbackId,token,thumbnailToken}:{playbackId:string;token:string;thumbnailToken:string}){
 return <ClientOnly fallback={<div className="aspect-video w-full bg-surface"/>}><Suspense fallback={<div className="aspect-video w-full bg-surface"/>}><MuxPlayer playbackId={playbackId} tokens={{playback:token,thumbnail:thumbnailToken}} streamType="on-demand" className="aspect-video w-full"/></Suspense></ClientOnly>;
}