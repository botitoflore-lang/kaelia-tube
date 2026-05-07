"use client";
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, 
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, updateDoc 
} from 'firebase/firestore';

export default function KaeliaNexusV2() {
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({}); 
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserPanelOpen, setUserPanelOpen] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);
  const [editVid, setEditVid] = useState<any>(null); // Estado para edición
  
  const [adminInput, setAdminInput] = useState("");
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [upCover, setUpCover] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  useEffect(() => {
    const localUser = localStorage.getItem('kaelia_user');
    if (localUser) setCurrentUser(JSON.parse(localUser));
    if (localStorage.getItem('kaelia_admin') === 'true') setIsAdmin(true);

    onSnapshot(collection(db, "users"), (snap) => {
      const uMap: any = {};
      snap.forEach(d => uMap[d.id] = d.data());
      setUsers(uMap);
    });

    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const checkAdminKey = () => {
    if (adminInput === "KAELIA2024") {
      setIsAdmin(true);
      localStorage.setItem('kaelia_admin', 'true');
      setShowAdminModal(false);
    } else { alert("Llave incorrecta"); }
  };

  const reproducirSiguiente = (actual: any) => {
    const otros = videos.filter(v => v.id !== actual.id);
    if (otros.length) setSelectedVid(otros[Math.floor(Math.random() * otros.length)]);
  };

  // --- LÓGICA DE RECOMENDADOS ---
  const getSugerencias = (vActual: any) => {
    return videos
      .filter(v => v.id !== vActual.id)
      .map(v => ({
        ...v,
        puntos: (v.tags?.filter((t: any) => vActual.tags?.includes(t)).length || 0) + (v.featured ? 5 : 0)
      }))
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, 6);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 font-sans selection:bg-pink-500/30">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 bg-black/80 backdrop-blur-2xl border-b border-white/5 p-4 z-[100]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-6">
          <button onClick={() => setSidebarOpen(true)} className="text-pink-500 text-2xl p-2 hover:scale-110 transition-transform">☰</button>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en Kaelia..." className="flex-1 max-w-xl bg-white/5 border border-white/10 p-3 px-6 rounded-2xl outline-none focus:border-pink-500/50" />
          <button onClick={() => setUserPanelOpen(true)} className="w-12 h-12 rounded-full border-2 border-pink-500/20 overflow-hidden">
            <img src={users[currentUser?.user]?.pfp || 'https://i.imgur.com/6VBx3io.png'} className="w-full h-full object-cover" />
          </button>
        </div>
      </nav>

      {/* --- SIDEBAR IZQUIERDA --- */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-[#050505] border-r border-white/5 z-[400] transition-transform duration-500 p-8 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black text-pink-500 italic">KAELIA.</h2>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-500">✕</button>
        </div>
        
        {currentUser && (
          <div className="space-y-4">
            <p className="text-[10px] font-black tracking-[3px] text-zinc-500 uppercase">Publicar Recuerdo</p>
            <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título" className="w-full bg-white/5 p-4 rounded-xl text-xs border border-white/5" />
            <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="URL Video (.mp4)" className="w-full bg-white/5 p-4 rounded-xl text-xs border border-white/5" />
            <input value={upCover} onChange={e => setUpCover(e.target.value)} placeholder="URL Portada (Imagen)" className="w-full bg-white/5 p-4 rounded-xl text-xs border border-white/5" />
            <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (separados por coma)" className="w-full bg-white/5 p-4 rounded-xl text-xs border border-white/5" />
            <button onClick={async () => {
              if(!upUrl || !upTitle) return;
              await addDoc(collection(db, "videos"), {
                title: upTitle, url: upUrl, cover: upCover, uploader: currentUser.user,
                tags: upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ""),
                featured: false, timestamp: serverTimestamp()
              });
              setSidebarOpen(false);
            }} className="w-full bg-pink-600 p-4 rounded-xl font-black text-[10px] uppercase">Publicar</button>
          </div>
        )}
        <button onClick={() => setShowAdminModal(true)} className="absolute bottom-8 left-8 text-[9px] font-black text-zinc-700 tracking-[3px] uppercase">
          {isAdmin ? "ADMIN ACTIVO" : "LLAVE SISTEMA"}
        </button>
      </div>

      {/* --- FEED PRINCIPAL --- */}
      <main className="p-6 md:p-12 max-w-[1900px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {videos.filter(v => v.title.toLowerCase().includes(search.toLowerCase())).map(vid => (
            <div key={vid.id} className="group relative flex flex-col rounded-[35px] overflow-hidden border border-white/5 bg-zinc-900/20 hover:border-pink-500/30 transition-all">
              
              {/* ADMIN EXTERNO */}
              {isAdmin && (
                <div className="absolute top-4 left-4 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => {e.stopPropagation(); setEditVid(vid);}} className="p-3 bg-blue-600 rounded-xl text-[10px] font-black">✎ EDITAR</button>
                  <button onClick={(e) => {e.stopPropagation(); updateDoc(doc(db, "videos", vid.id), {featured: !vid.featured});}} className="p-3 bg-yellow-500 text-black rounded-xl text-[10px] font-black">{vid.featured ? '★' : '☆'}</button>
                </div>
              )}

              <div onClick={() => setSelectedVid(vid)} className="cursor-pointer">
                <div className="aspect-video relative overflow-hidden bg-black">
                  <img src={vid.cover || 'https://i.imgur.com/8N7mZ6I.png'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {vid.featured && <div className="absolute top-3 right-4 text-2xl drop-shadow-[0_0_10px_#ff00ff] rotate-[-15deg] text-pink-500">👑</div>}
                </div>
                <div className="p-6">
                  <div className="flex gap-4 items-center mb-4">
                    <img src={users[vid.uploader]?.pfp} className="w-10 h-10 rounded-2xl object-cover border border-white/10" />
                    <div className="overflow-hidden">
                      <h3 className="font-black text-sm truncate uppercase italic text-zinc-100">{vid.title}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold">@{vid.uploader}</p>
                    </div>
                  </div>
                  {/* TAGS VISIBLES EN FEED */}
                  <div className="flex flex-wrap gap-1">
                    {vid.tags?.slice(0, 3).map((t:any) => (
                      <span key={t} className="text-[8px] bg-white/5 border border-white/5 px-2 py-1 rounded-md text-zinc-400 uppercase font-black">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- REPRODUCTOR + RECOMENDADOS --- */}
      {selectedVid && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[500] p-4 md:p-10 overflow-y-auto">
          <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* LADO IZQUIERDO: VIDEO E INFO */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex justify-between items-center">
                <button onClick={() => setSelectedVid(null)} className="text-[10px] font-black uppercase bg-white/5 px-6 py-3 rounded-xl border border-white/5">← Volver</button>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => setEditVid(selectedVid)} className="bg-blue-600 p-3 rounded-xl text-[10px] font-black uppercase">Editar Info</button>
                    <button onClick={() => updateDoc(doc(db, "videos", selectedVid.id), {featured: !selectedVid.featured})} className="bg-yellow-500 text-black p-3 rounded-xl text-[10px] font-black">Corona</button>
                    <button onClick={async () => {if(confirm("¿Eliminar?")){ await deleteDoc(doc(db, "videos", selectedVid.id)); setSelectedVid(null);}}} className="bg-red-600 p-3 rounded-xl text-[10px] font-black">Eliminar</button>
                  </div>
                )}
              </div>

              <div className={`aspect-video w-full rounded-[40px] overflow-hidden border-4 bg-black shadow-2xl ${selectedVid.featured ? 'border-yellow-500' : 'border-white/10'}`}>
                <video key={selectedVid.url} controls autoPlay onEnded={() => reproducirSiguiente(selectedVid)} className="w-full h-full object-contain">
                  <source src={selectedVid.url} />
                </video>
              </div>

              <div className="p-8 bg-white/[0.02] rounded-[40px] border border-white/5">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-4xl font-black italic uppercase text-pink-500 leading-none mb-2">{selectedVid.title}</h2>
                    <div className="flex items-center gap-3">
                      <img src={users[selectedVid.uploader]?.pfp} className="w-8 h-8 rounded-xl" />
                      <span className="text-zinc-400 font-bold text-sm">@{selectedVid.uploader}</span>
                    </div>
                  </div>
                  {selectedVid.featured && <span className="text-5xl text-pink-500 drop-shadow-[0_0_15px_#ff00ff] animate-pulse">👑</span>}
                </div>
                {/* TAGS EN REPRODUCTOR */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                  {selectedVid.tags?.map((t:any) => (
                    <span key={t} className="px-4 py-2 bg-pink-500/5 border border-pink-500/20 rounded-xl text-[10px] font-black text-pink-400 uppercase">#{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* LADO DERECHO: RECOMENDADOS */}
            <div className="lg:col-span-4 space-y-6">
              <h3 className="text-pink-500 font-black text-xs uppercase tracking-[5px] italic mb-4">Visiones Similares</h3>
              <div className="grid gap-4">
                {getSugerencias(selectedVid).map(rec => (
                  <div key={rec.id} onClick={() => setSelectedVid(rec)} className="flex gap-4 p-3 rounded-[25px] bg-white/[0.03] border border-transparent hover:border-pink-500/30 cursor-pointer transition-all">
                    <div className="w-32 aspect-video rounded-xl overflow-hidden bg-black flex-shrink-0">
                      <img src={rec.cover || 'https://i.imgur.com/8N7mZ6I.png'} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
                      <h4 className="text-[11px] font-black uppercase truncate text-zinc-200">{rec.title}</h4>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase">@{rec.uploader}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL EDITAR VIDEO --- */}
      {editVid && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[1000] flex items-center justify-center p-6">
          <div className="bg-[#111] p-10 rounded-[45px] border border-white/10 w-full max-w-lg space-y-6">
            <h2 className="text-xl font-black uppercase italic text-pink-500">Editar Archivo</h2>
            <div className="space-y-4 text-xs font-bold text-zinc-500">
              <div><p className="mb-1 ml-2">TÍTULO</p>
                <input value={editVid.title} onChange={e => setEditVid({...editVid, title: e.target.value})} className="w-full bg-black p-4 rounded-2xl border border-white/5 outline-none focus:border-pink-500" />
              </div>
              <div><p className="mb-1 ml-2">PORTADA (URL)</p>
                <input value={editVid.cover} onChange={e => setEditVid({...editVid, cover: e.target.value})} className="w-full bg-black p-4 rounded-2xl border border-white/5 outline-none focus:border-pink-500" />
              </div>
              <div><p className="mb-1 ml-2">TAGS (COMA)</p>
                <input value={editVid.tags?.join(', ')} onChange={e => setEditVid({...editVid, tags: e.target.value.split(',').map(t => t.trim())})} className="w-full bg-black p-4 rounded-2xl border border-white/5 outline-none focus:border-pink-500" />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setEditVid(null)} className="flex-1 p-4 rounded-2xl bg-zinc-800 text-[10px] font-black uppercase">Cancelar</button>
              <button onClick={async () => {
                await updateDoc(doc(db, "videos", editVid.id), { title: editVid.title, cover: editVid.cover, tags: editVid.tags });
                setEditVid(null);
                if(selectedVid?.id === editVid.id) setSelectedVid(editVid);
              }} className="flex-1 p-4 rounded-2xl bg-pink-600 text-[10px] font-black uppercase">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ADMIN KEY --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/95 z-[2000] flex items-center justify-center">
          <div className="bg-[#111] p-12 rounded-[50px] border border-white/10 text-center">
            <h2 className="text-xl font-black uppercase italic text-white mb-8">Llave Maestra</h2>
            <input type="password" placeholder="••••" className="w-full bg-black p-6 rounded-3xl text-center text-2xl tracking-[10px] text-pink-500 outline-none mb-6 border border-white/10" onChange={e => setAdminInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkAdminKey()} />
            <button onClick={checkAdminKey} className="w-full bg-pink-600 p-5 rounded-2xl font-black uppercase tracking-widest">Activar</button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
