"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, 
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, updateDoc
} from 'firebase/firestore';

export default function KaeliaDeluxe() {
  const [videos, setVideos] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({}); 
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isUserPanelOpen, setUserPanelOpen] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedVid, setSelectedVid] = useState<any>(null);
  
  const [adminInput, setAdminInput] = useState("");
  const [upUrl, setUpUrl] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upTags, setUpTags] = useState("");
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const localUser = localStorage.getItem('kaelia_user');
    if (localUser) setCurrentUser(JSON.parse(localUser));
    if (localStorage.getItem('kaelia_admin') === 'true') setIsAdmin(true);

    onSnapshot(collection(db, "users"), (snap) => {
      const uMap: any = {};
      snap.forEach(d => uMap[d.id] = d.data().pfp);
      setUsers(uMap);
    });

    const q = query(collection(db, "videos"), orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      setVideos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const getRecommended = (currentVid: any) => {
    if (!currentVid) return [];
    return videos
      .filter(v => v.id !== currentVid.id)
      .map(v => ({
        ...v,
        score: (v.tags?.filter((t: string) => currentVid.tags?.includes(t)).length || 0) + (v.featured ? 5 : 0)
      }))
      .sort((a, b) => b.score - a.score || Math.random() - 0.5).slice(0, 8);
  };

  const handleFeatured = async (vidId: string, currentStatus: boolean) => {
    const vidRef = doc(db, "videos", vidId);
    await updateDoc(vidRef, { featured: !currentStatus });
  };

  const checkAdminKey = () => {
    if (adminInput === "1234") {
      setIsAdmin(true);
      localStorage.setItem('kaelia_admin', 'true');
      setShowAdminModal(false);
      setAdminInput("");
    } else { alert("Llave incorrecta"); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 selection:bg-pink-500/30">
      
      {/* --- NAVBAR --- */}
      <nav className="sticky top-0 bg-[#050505]/90 backdrop-blur-2xl border-b border-white/5 p-4 z-[100]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <button onClick={() => setSidebarOpen(true)} className="p-3 hover:bg-white/5 rounded-full text-pink-500 text-2xl transition-all active:scale-90">☰</button>
          
          <div className="flex-1 max-w-2xl relative">
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar contenido, tags o usuarios..." 
              className="w-full bg-white/5 border border-white/10 p-3 px-6 rounded-[20px] outline-none focus:border-pink-500/50 transition-all text-sm shadow-inner"
            />
          </div>

          <button onClick={() => setUserPanelOpen(true)} className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden bg-zinc-900 hover:border-pink-500 transition-all active:scale-95 shadow-xl">
            {currentUser ? (
              <img src={users[currentUser.user] || currentUser.pfp} className="w-full h-full object-cover" />
            ) : ( <span className="text-xl">👤</span> )}
          </button>
        </div>
      </nav>

      {/* --- PANEL USUARIO --- */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-[#080808] border-l border-white/5 z-[200] transition-transform duration-500 p-8 shadow-2xl ${isUserPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-10">
          <span className="font-black text-[10px] tracking-[4px] uppercase text-zinc-600">Account Control</span>
          <button onClick={() => setUserPanelOpen(false)} className="hover:rotate-90 transition-transform">✕</button>
        </div>
        {currentUser ? (
          <div className="space-y-8">
            <div className="text-center">
              <img src={users[currentUser.user] || currentUser.pfp} className="w-32 h-32 rounded-[40px] mx-auto border-2 border-pink-500 object-cover p-1 shadow-2xl shadow-pink-500/20" />
              <h2 className="mt-6 font-black text-2xl italic tracking-tighter">@{currentUser.user}</h2>
              {isAdmin && <p className="text-[9px] text-pink-500 font-bold mt-2 tracking-[3px]">SYSTEM ADMIN</p>}
            </div>
            <div className="space-y-3">
              <button onClick={() => {const n = prompt("URL Foto:"); if(n) setDoc(doc(db, "users", currentUser.user), {pfp: n}, {merge: true});}} className="w-full bg-white/5 p-4 rounded-2xl text-[10px] font-bold hover:bg-pink-500/10 transition-all uppercase tracking-widest">Cambiar Imagen</button>
              <button onClick={() => {localStorage.clear(); location.reload();}} className="w-full bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-bold hover:bg-red-500/20 transition-all uppercase tracking-widest">Logout</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="text" placeholder="User" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm" onChange={e => setLoginUser(e.target.value)} />
            <input type="password" placeholder="PIN" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm" onChange={e => setLoginPass(e.target.value)} />
            <button onClick={handleLogin} className="w-full bg-pink-600 p-4 rounded-2xl font-black text-xs shadow-lg shadow-pink-600/20">ENTRAR</button>
          </div>
        )}
      </div>

      {/* --- SIDEBAR --- */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#080808] border-r border-white/5 z-[200] transition-transform duration-500 p-8 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <h3 className="font-black text-pink-500 italic text-2xl mb-10">KAELIA.</h3>
        <div className="space-y-3 mb-12 text-sm font-bold">
            <button onClick={() => {setSearch(""); setSidebarOpen(false);}} className="w-full text-left p-4 rounded-2xl hover:bg-white/5 transition-all">Explorar</button>
            {currentUser && <button onClick={() => {setSearch(currentUser.user); setSidebarOpen(false);}} className="w-full text-left p-4 rounded-2xl hover:bg-white/5 transition-all">Mis Archivos</button>}
        </div>
        {currentUser && (
          <div className="space-y-4">
            <p className="text-[10px] text-zinc-600 font-black tracking-widest uppercase">Upload Area</p>
            <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="URL Video" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs outline-none" />
            <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs outline-none" />
            <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Tags (pov, 4k...)" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xs outline-none" />
            <button onClick={async () => {
              if(!upUrl) return;
              await addDoc(collection(db, "videos"), {
                title: upTitle || "Sin título", url: upUrl, uploader: currentUser.user,
                tags: upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ""),
                featured: false, timestamp: serverTimestamp()
              });
              setUpUrl(""); setUpTitle(""); setUpTags(""); setSidebarOpen(false);
            }} className="w-full bg-white text-black py-4 rounded-2xl font-black text-[10px] tracking-widest shadow-xl">SUBIR</button>
          </div>
        )}
        <button onClick={() => setShowAdminModal(true)} className="absolute bottom-8 left-8 right-8 p-3 bg-zinc-900 border border-white/5 rounded-2xl text-[9px] font-black text-zinc-500 hover:text-white transition-all uppercase tracking-widest">
          {isAdmin ? 'ADMIN ACTIVE' : 'SYSTEM KEY'}
        </button>
      </div>

      {/* --- MODAL ADMIN --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#111] border border-white/10 p-10 rounded-[40px] w-full max-w-sm text-center shadow-2xl">
            <h2 className="text-xl font-black mb-6 tracking-tighter uppercase italic text-white">System Access</h2>
            <input 
              type="password" autoFocus
              className="w-full bg-black border border-white/10 p-5 rounded-3xl text-center text-3xl tracking-[10px] outline-none focus:border-pink-500/50 transition-all mb-6 font-mono text-pink-500"
              value={adminInput} onChange={e => setAdminInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && checkAdminKey()}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowAdminModal(false)} className="flex-1 p-4 bg-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest">Cerrar</button>
              <button onClick={checkAdminKey} className="flex-1 p-4 bg-pink-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">Validar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- FEED --- */}
      <main className="p-6 md:p-10 max-w-[1900px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {videos.filter(v => v.title?.toLowerCase().includes(search.toLowerCase()) || v.tags?.some((t:any) => t.includes(search.toLowerCase())) || v.uploader?.toLowerCase().includes(search.toLowerCase()))
          .map((vid) => (
            <div key={vid.id} className="group cursor-pointer relative" onClick={() => setSelectedVid(vid)}>
              
              {/* BOTONES ADMIN DE ESTRELLA Y BORRADO */}
              {isAdmin && (
                <div className="absolute top-4 left-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => {e.stopPropagation(); handleFeatured(vid.id, vid.featured);}} className={`p-2 rounded-xl border backdrop-blur-md transition-all ${vid.featured ? 'bg-yellow-500 border-yellow-400 text-black' : 'bg-black/50 border-white/20 text-white'}`}>
                    {vid.featured ? '★' : '☆'}
                  </button>
                  <button onClick={(e) => {e.stopPropagation(); if(confirm("¿Eliminar?")) deleteDoc(doc(db, "videos", vid.id));}} className="p-2 bg-red-600/80 border border-red-500 rounded-xl text-[10px] font-black">🗑️</button>
                </div>
              )}

              {/* CORONITA DESTACADA */}
              {vid.featured && (
                <div className="absolute -top-3 -right-3 z-20 text-3xl drop-shadow-lg animate-bounce">👑</div>
              )}

              {/* CONTENEDOR VIDEO CON BORDES */}
              <div className={`aspect-video bg-black rounded-[35px] overflow-hidden border-2 transition-all duration-500 relative shadow-2xl ${vid.featured ? 'border-yellow-500 shadow-yellow-500/20 scale-[1.02]' : 'border-white/5 group-hover:border-pink-500/30'}`}>
                {vid.url.includes('mp4') ? (
                  <video muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => {e.currentTarget.pause(); e.currentTarget.currentTime = 0;}} className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 transition-all">
                    <source src={vid.url} />
                  </video>
                ) : (
                  <iframe src={vid.url} className="w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                )}
                {vid.featured && <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent pointer-events-none" />}
              </div>

              <div className="p-5 flex gap-4">
                <img src={users[vid.uploader] || vid.pfp} className={`w-10 h-10 rounded-[15px] object-cover border ${vid.featured ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' : 'border-white/10'}`} />
                <div className="overflow-hidden flex-1">
                  <h3 className={`font-black text-[14px] truncate transition-colors leading-tight ${vid.featured ? 'text-yellow-500' : 'group-hover:text-pink-400'}`}>{vid.title}</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">@{vid.uploader}</p>
                  <div className="flex gap-1 mt-2 overflow-hidden">
                    {vid.tags?.slice(0, 2).map((tag: string) => (
                      <span key={tag} className="text-[8px] bg-white/5 text-zinc-400 px-2 py-0.5 rounded-lg border border-white/5 uppercase font-black tracking-tighter">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- MODAL PLAYER --- */}
      {selectedVid && (
        <div className="fixed inset-0 bg-[#050505] z-[2000] overflow-y-auto p-4 md:p-12 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
            <div className="lg:col-span-3">
              <button onClick={() => setSelectedVid(null)} className="mb-8 bg-white/5 p-4 px-10 rounded-full text-[10px] font-black tracking-widest hover:bg-white/10 transition-all uppercase">← Volver</button>
              
              <div key={selectedVid.id} className={`aspect-video w-full bg-black rounded-[50px] overflow-hidden border-4 shadow-2xl transition-all ${selectedVid.featured ? 'border-yellow-500 shadow-yellow-500/10' : 'border-white/10 shadow-pink-500/5'}`}>
                {selectedVid.url.includes('mp4') ? (
                  <video onEnded={() => {const n = getRecommended(selectedVid)[0]; if(n) setSelectedVid(n);}} controls autoPlay className="w-full h-full object-contain"><source src={selectedVid.url} /></video>
                ) : (
                  <iframe src={`${selectedVid.url}${selectedVid.url.includes('?') ? '&' : '?'}autoplay=1`} className="w-full h-full" allowFullScreen allow="autoplay" />
                )}
              </div>

              <div className="mt-10 p-2 space-y-6">
                <div className="flex items-start justify-between">
                    <h2 className={`text-4xl font-black italic tracking-tighter uppercase leading-none ${selectedVid.featured ? 'text-yellow-500' : 'text-white'}`}>{selectedVid.title}</h2>
                    {selectedVid.featured && <span className="text-4xl">👑</span>}
                </div>
                <div className="flex items-center gap-4">
                  <img src={users[selectedVid.uploader]} className={`w-14 h-14 rounded-[20px] border-2 object-cover shadow-xl ${selectedVid.featured ? 'border-yellow-500 shadow-yellow-500/10' : 'border-pink-500/20'}`} />
                  <div>
                    <span className="text-zinc-500 font-black text-[10px] tracking-[4px] uppercase block">Shared by</span>
                    <span className="text-white font-black italic text-xl tracking-tighter">@{selectedVid.uploader.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-6">
                  {selectedVid.tags?.map((tag: string) => (
                    <span key={tag} className={`text-[10px] font-black border px-5 py-2.5 rounded-2xl tracking-widest uppercase transition-all ${selectedVid.featured ? 'bg-yellow-500/5 border-yellow-500/30 text-yellow-500' : 'bg-pink-500/5 border-pink-500/20 text-pink-500 hover:bg-pink-500 hover:text-white'}`}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-20">
              <h3 className="text-pink-500 font-black text-[10px] uppercase tracking-[5px] px-2 mb-8 italic">Up next</h3>
              <div className="space-y-4">
                {getRecommended(selectedVid).map(rec => (
                  <div key={rec.id} onClick={() => setSelectedVid(rec)} className={`flex gap-4 group cursor-pointer p-4 rounded-[35px] transition-all border ${rec.featured ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
                    <div className="w-28 aspect-video bg-black rounded-[18px] overflow-hidden flex-shrink-0 relative shadow-lg">
                      {rec.url.includes('mp4') ? <video muted className="w-full h-full object-cover opacity-50"><source src={rec.url}/></video> : <div className="w-full h-full bg-zinc-900"/>}
                      {rec.featured && <div className="absolute top-1 right-1 text-[10px]">👑</div>}
                    </div>
                    <div className="overflow-hidden justify-center flex flex-col space-y-1">
                      <h4 className={`text-[11px] font-black truncate transition-colors uppercase tracking-tight ${rec.featured ? 'text-yellow-500' : 'group-hover:text-pink-500'}`}>{rec.title}</h4>
                      <p className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">@{rec.uploader}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
