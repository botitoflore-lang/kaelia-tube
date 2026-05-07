"use client";
import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";// Usamos ruta relativa para evitar errores
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function Home() {
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-5">
      <nav className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-5">
        <h1 className="text-xl font-bold text-pink-500 italic">KAELIA ARCHIVE NEXT</h1>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((vid) => (
          <div key={vid.id} className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900">
            <div className="aspect-video">
               <iframe src={vid.url} className="w-full h-full" />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-sm text-zinc-200">{vid.title}</h3>
              <p className="text-[10px] text-pink-400 mt-1 uppercase">Subido por {vid.uploader || 'Anon'}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}