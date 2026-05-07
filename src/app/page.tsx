"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, addDoc, 
  doc, getDoc, setDoc, deleteDoc, serverTimestamp, updateDoc 
} from 'firebase/firestore';

export default function KaeliaDeluxeEspanol() {
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

  // --- LOGICA DE REPRODUCCIÓN ALEATORIA ---
  const reproducirSiguienteAleatorio = (vidActual: any) => {
    const filtrados = videos.filter(v => v.id !== vidActual.id);
    if (filtrados.length > 0) {
      const siguiente = filtrados[Math.floor(Math.random() * filtrados.length)];
      setSelectedVid(siguiente);
    }
  };

  const handleLogin = async () => {
    const userKey = loginUser.toLowerCase().trim();
    if (!userKey || !loginPass) return alert("Por favor, introduce usuario y PIN.");
    try {
      const userRef = doc(db, "users", userKey);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        if (snap.data().pass === loginPass) {
          const userData = snap.data();
          setCurrentUser(userData);
          localStorage.setItem('kaelia_user', JSON.stringify(userData));
          setUserPanelOpen(false);
        } else { alert("PIN de acceso incorrecto."); }
      } else {
        const newUser = { user: userKey, pass: loginPass, pfp: 'https://cdn-icons-png.flaticon.com/512/149/149071.png' };
        await setDoc(userRef, newUser);
        setCurrentUser(newUser);
        localStorage.setItem('kaelia_user', JSON.stringify(newUser));
        setUserPanelOpen(false);
      }
    } catch (e) { console.error(e); }
  };

  const getSugerencias = (currentVid: any) => {
    if (!currentVid) return [];
    return videos
      .filter(v => v.id !== currentVid.id)
      .map(v => ({
        ...v,
        score: (v.tags?.filter((t: string) => currentVid.tags?.includes(t)).length || 0) + (v.featured ? 10 : 0)
      }))
      .sort((a, b) => b.score - a.score).slice(0, 10);
  };

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-100 selection:bg-pink-500/40 font-sans tracking-tight">
      
      {/* Decoración de fondo mística */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] -right-[10%] w-[30%] h-[30%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      {/* --- BARRA DE NAVEGACIÓN --- */}
      <nav className="sticky top-0 bg-black/60 backdrop-blur-3xl border-b border-white/5 p-4 z-[100]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-6">
          <button onClick={() => setSidebarOpen(true)} className="w-12 h-12 flex items-center justify-center hover:bg-white/5 rounded-2xl text-pink-500 text-2xl transition-all shadow-lg">☰</button>
          
          <div className="flex-1 max-w-xl relative group">
            <input 
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar en el archivo Kaelia..." 
              className="w-full bg-white/[0.03] border border-white/10 p-3.5 px-8 rounded-2xl outline-none focus:border-pink-500/50 focus:bg-white/[0.05] transition-all text-sm group-hover:border-white/20"
            />
          </div>

          <button onClick={() => setUserPanelOpen(true)} className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-20 group-hover:opacity-50 transition duration-500"></div>
            <div className="relative w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden bg-zinc-900 transition-all group-active:scale-90 shadow-2xl flex items-center justify-center">
              {currentUser ? <img src={users[currentUser.user] || currentUser.pfp} className="w-full h-full object-cover" /> : <span className="text-xl">👤</span>}
            </div>
          </button>
        </div>
      </nav>

      {/* --- PANEL LATERAL IZQUIERDO (MENU Y CARGA) --- */}
      <div className={`fixed inset-y-0 left-0 w-80 bg-black/80 backdrop-blur-3xl border-r border-white/5 z-[200] transition-all duration-700 p-8 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-12">
          <h3 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400 italic text-3xl tracking-tighter">KAELIA.</h3>
          <button onClick={() => setSidebarOpen(false)} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-500 transition-all">✕</button>
        </div>
        
        <div className="space-y-2 mb-12">
            <button onClick={() => {setSearch(""); setSidebarOpen(false);}} className="w-full text-left p-4 rounded-2xl hover:bg-white/5 transition-all font-bold text-zinc-400 hover:text-white flex items-center gap-3"><span>🏠</span> Galería Principal</button>
            {currentUser && <button onClick={() => {setSearch(currentUser.user); setSidebarOpen(false);}} className="w-full text-left p-4 rounded-2xl hover:bg-white/5 transition-all font-bold text-zinc-400 hover:text-white flex items-center gap-3"><span>📂</span> Mis Recuerdos</button>}
        </div>

        {currentUser && (
          <div className="space-y-4 p-6 bg-white/[0.02] rounded-[32px] border border-white/5">
            <p className="text-[10px] text-zinc-500 font-black tracking-[3px] uppercase ml-2">Cámara de Carga</p>
            <input value={upUrl} onChange={e => setUpUrl(e.target.value)} placeholder="Enlace del video" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-pink-500/40" />
            <input value={upTitle} onChange={e => setUpTitle(e.target.value)} placeholder="Título del recuerdo" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-pink-500/40" />
            <input value={upTags} onChange={e => setUpTags(e.target.value)} placeholder="Etiquetas (separadas por comas)" className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-pink-500/40" />
            <button onClick={async () => {
               if(!upUrl) return;
               await addDoc(collection(db, "videos"), {
                 title: upTitle || "Sin Título", url: upUrl, uploader: currentUser.user,
                 tags: upTags.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ""),
                 featured: false, timestamp: serverTimestamp()
               });
               setUpUrl(""); setUpTitle(""); setUpTags(""); setSidebarOpen(false);
            }} className="w-full bg-gradient-to-r from-pink-600 to-rose-500 text-white py-4 rounded-2xl font-black text-[11px] shadow-lg shadow-pink-600/20 active:scale-95 transition-all uppercase tracking-widest">Inmortalizar Video</button>
          </div>
        )}
      </div>

      {/* --- PANEL DE USUARIO (DERECHA) --- */}
      <div className={`fixed inset-y-0 right-0 w-85 bg-black/90 backdrop-blur-3xl border-l border-white/10 z-[300] transition-all duration-500 p-10 shadow-2xl ${isUserPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex justify-between items-center mb-12">
          <span className="font-black text-[10px] tracking-[4px] text-zinc-500 uppercase">Acceso al Sistema</span>
          <button onClick={() => setUserPanelOpen(false)} className="text-2xl hover:text-pink-500 transition-colors">✕</button>
        </div>

        {currentUser ? (
          <div className="space-y-8">
            <div className="text-center">
              <img src={users[currentUser.user] || currentUser.pfp} className="w-32 h-32 rounded-[40px] border-2 border-pink-500 mx-auto object-cover shadow-2xl" />
              <h2 className="mt-8 font-black text-3xl italic tracking-tighter uppercase">@{currentUser.user}</h2>
              {isAdmin && <p className="text-[9px] text-pink-500 font-bold mt-2 tracking-[4px]">ADMINISTRADOR DE SISTEMA</p>}
            </div>
            <button onClick={() => {localStorage.clear(); location.reload();}} className="w-full bg-red-500/10 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">Cerrar Sesión</button>
          </div>
        ) : (
          <div className="space-y-6">
            <input type="text" placeholder="Usuario" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" onChange={e => setLoginUser(e.target.value)} />
            <input type="password" placeholder="PIN de Seguridad" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none" onChange={e => setLoginPass(e.target.value)} />
            <button onClick={handleLogin} className="w-full bg-gradient-to-r from-pink-600 to-rose-500 p-5 rounded-2xl font-black text-xs uppercase tracking-[2px]">Entrar al Sistema</button>
          </div>
        )}
      </div>

      {/* --- GALERÍA DE VIDEOS (FEED) --- */}
      <main className="p-6 md:p-12 max-w-[1900px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10">
          {videos.filter(v => v.title?.toLowerCase().includes(search.toLowerCase()) || v.tags?.some((t:any) => t.includes(search.toLowerCase())) || v.uploader?.toLowerCase().includes(search.toLowerCase()))
          .map((vid) => (
            <div key={vid.id} className="group relative" onClick={() => setSelectedVid(vid)}>
              
              {isAdmin && (
                <div className="absolute top-4 left-4 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={(e) => {e.stopPropagation(); updateDoc(doc(db, "videos", vid.id), {featured: !vid.featured});}} className={`p-3 rounded-2xl border transition-all ${vid.featured ? 'bg-yellow-500 border-yellow-400 text-black shadow-lg shadow-yellow-500/30' : 'bg-black/60 border-white/20 text-white hover:bg-yellow-500/20'}`}>{vid.featured ? '★' : '☆'}</button>
                  <button onClick={(e) => {e.stopPropagation(); if(confirm("¿Eliminar este recuerdo?")) deleteDoc(doc(db, "videos", vid.id));}} className="p-3 bg-red-600/60 hover:bg-red-600 border border-red-500 rounded-2xl text-white shadow-lg transition-all">🗑️</button>
                </div>
              )}

              <div className={`relative flex flex-col rounded-[40px] transition-all duration-500 cursor-pointer border-2 overflow-hidden bg-zinc-900/40 backdrop-blur-sm ${vid.featured ? 'border-yellow-500/40 shadow-xl scale-[1.02]' : 'border-white/5 hover:border-pink-500/40'}`}>
                  
                  {vid.featured && (
                    <div className="absolute top-3 right-4 z-20 text-3xl drop-shadow-[0_0_15px_#ff00ff] rotate-[-15deg] origin-center animate-pulse">👑</div>
                  )}

                  <div className="aspect-video bg-black overflow-hidden relative">
                    {vid.url.includes('mp4') ? (
                      <video muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => {e.currentTarget.pause(); e.currentTarget.currentTime = 0;}} className="w-full h-full object-cover grayscale-[15%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110">
                        <source src={vid.url} />
                      </video>
                    ) : (
                      <iframe src={vid.url} className="w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  <div className="p-6 border-t border-white/[0.03]">
                    <div className="flex gap-4 items-center mb-4">
                      <img src={users[vid.uploader] || vid.pfp} className={`w-11 h-11 rounded-[18px] object-cover border-2 ${vid.featured ? 'border-yellow-500' : 'border-white/10'}`} />
                      <div className="overflow-hidden flex-1">
                        <h3 className={`font-black text-[15px] truncate leading-tight tracking-tight ${vid.featured ? 'text-yellow-400' : 'text-white group-hover:text-pink-400'} transition-colors`}>{vid.title}</h3>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">@{vid.uploader}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {vid.tags?.slice(0, 3).map((tag: string) => (
                        <span key={tag} className={`text-[8px] px-3 py-1.5 rounded-xl border font-black uppercase tracking-tighter ${vid.featured ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' : 'bg-white/5 text-zinc-500'}`}>#{tag}</span>
                      ))}
                    </div>
                  </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- REPRODUCTOR (MODAL PLAYER) --- */}
      {selectedVid && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[2000] overflow-y-auto animate-in fade-in duration-500 p-4 md:p-12">
          <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <div className="lg:col-span-9 space-y-8">
              <button onClick={() => setSelectedVid(null)} className="group flex items-center gap-3 bg-white/5 p-4 px-8 rounded-2xl text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-all border border-white/5">
                ← Volver a la Galería
              </button>

              <div className={`relative aspect-video w-full bg-black rounded-[50px] overflow-hidden border-4 shadow-2xl transition-all duration-700 ${selectedVid.featured ? 'border-yellow-500/50 shadow-yellow-500/20' : 'border-white/10 shadow-pink-500/10'}`}>
                {selectedVid.url.includes('mp4') ? (
                  /* FIX: onEnded para reproducir aleatorio */
                  <video 
                    key={selectedVid.url} 
                    controls 
                    autoPlay 
                    onEnded={() => reproducirSiguienteAleatorio(selectedVid)}
                    className="w-full h-full object-contain"
                  >
                    <source src={selectedVid.url} />
                  </video>
                ) : (
                  <iframe src={`${selectedVid.url}${selectedVid.url.includes('?') ? '&' : '?'}autoplay=1`} className="w-full h-full" allowFullScreen allow="autoplay" />
                )}
              </div>

              <div className="p-8 bg-white/[0.02] rounded-[40px] border border-white/5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div className="flex items-center gap-6">
                    <img src={users[selectedVid.uploader]} className={`w-20 h-20 rounded-[28px] border-4 object-cover shadow-2xl ${selectedVid.featured ? 'border-yellow-500' : 'border-pink-500/50'}`} />
                    <div>
                      <h2 className={`text-4xl font-black italic tracking-tighter uppercase mb-1 ${selectedVid.featured ? 'text-yellow-500' : 'text-white'}`}>{selectedVid.title}</h2>
                      <p className="text-zinc-500 font-bold tracking-[4px] uppercase text-xs">Compartido por: <span className="text-pink-500">@{selectedVid.uploader}</span></p>
                    </div>
                  </div>
                  {selectedVid.featured && <div className="text-6xl drop-shadow-[0_0_20px_rgba(255,0,255,0.6)] animate-bounce text-pink-500">👑</div>}
                </div>
                <div className="flex flex-wrap gap-3">
                  {selectedVid.tags?.map((tag: string) => (
                    <span key={tag} className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-pink-500 transition-all cursor-pointer">#{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* LISTA DE SUGERENCIAS */}
            <div className="lg:col-span-3 space-y-6">
              <h3 className="text-pink-500 font-black text-xs uppercase tracking-[6px] italic mb-8 flex items-center gap-2">
                <span className="w-8 h-[1px] bg-pink-500" /> Próximas Visiones
              </h3>
              <div className="space-y-5">
                {getSugerencias(selectedVid).map(rec => (
                  <div key={rec.id} onClick={() => setSelectedVid(rec)} className={`group/item flex gap-4 p-4 rounded-[32px] transition-all border cursor-pointer hover:scale-[1.02] ${rec.featured ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-white/5 border-transparent hover:border-white/10'}`}>
                    <div className="w-32 aspect-video bg-black rounded-2xl overflow-hidden flex-shrink-0 relative shadow-lg">
                       <div className="w-full h-full bg-zinc-900 opacity-40 group-hover/item:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-zinc-500 italic">Previsualización</div>
                       {rec.featured && <div className="absolute top-1 right-1 text-xs text-pink-500">👑</div>}
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
                      <h4 className={`text-xs font-black truncate uppercase tracking-tight mb-1 ${rec.featured ? 'text-yellow-400' : 'text-zinc-200 group-hover/item:text-pink-500'}`}>{rec.title}</h4>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">@{rec.uploader}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- ESTILOS EXTRA --- */}
      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #020202; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #ec4899; }
      `}</style>
    </div>
  );
}
