(() => {
  const HUD = 52, VW = 960, VH = 540;
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  let SCALE = 1;
  function fit(){
    SCALE = Math.max(0.7, Math.min(1.6, Math.min((innerWidth-24)/VW, (innerHeight-24)/(VH+HUD))));
    canvas.width = VW; canvas.height = VH+HUD;
    canvas.style.width = Math.floor(VW*SCALE)+"px";
    canvas.style.height = Math.floor((VH+HUD)*SCALE)+"px";
    const fr=document.getElementById("frame");
    fr.style.width=canvas.style.width; fr.style.height=canvas.style.height;
  }
  fit(); addEventListener("resize", fit);
  addEventListener("orientationchange", fit); // en algunos navegadores viejos "resize" no alcanza al rotar

  // Detección celular vs desktop: "hover:none + pointer:coarse" es la señal
  // estándar de un dispositivo cuyo input primario es tocar (no hover con
  // mouse). Se complementa con maxTouchPoints por si algún navegador no
  // resuelve bien la media query. No se usa el user-agent a propósito —
  // rompe fácil y Anthropic/MDN lo desaconsejan para esto.
  const IS_TOUCH = matchMedia("(hover: none) and (pointer: coarse)").matches
    || navigator.maxTouchPoints > 0;
  if(IS_TOUCH) document.body.classList.add("is-touch");

  // Aviso de "girá el teléfono": el juego está diseñado para horizontal
  // (canvas 960x540). En touch+portrait tapamos todo con #rotateOverlay
  // (ver CSS en index.html) en vez de intentar que el canvas achicado
  // entre igual — se ve mejor pedir que roten que jugar en una franja
  // angosta. matchMedia + su evento "change" cubre rotar el telefono en
  // caliente sin recargar la página.
  const portraitMQ = matchMedia("(orientation: portrait)");
  function updateOrientationClass(){ document.body.classList.toggle("is-portrait", portraitMQ.matches); }
  updateOrientationClass();
  portraitMQ.addEventListener("change", updateOrientationClass);

  // Bloqueo real de orientación: best-effort nada más. Requiere fullscreen
  // y solo funciona en algunos navegadores (Chrome/Android sí, Safari/iOS
  // no lo soporta) — por eso el aviso de arriba es el fallback que SIEMPRE
  // funciona, y esto es solo un plus si el navegador lo permite. Se llama
  // desde un gesto del usuario (click en "Entrar"/"Continuar") porque tanto
  // Fullscreen API como Screen Orientation API lo exigen.
  async function tryLockLandscape(){
    try{
      if(document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      if(screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
    }catch(e){ /* no soportado o el usuario lo bloqueó — seguimos igual, sin esto */ }
  }

  const files = {
    plaza:"assets/plaza.jpg", bosque:"assets/bosque.jpg",
    capilla:"assets/capilla.jpg", cripta:"assets/cripta.jpg",
    heroF0:"assets/hero_f0.png", heroF1:"assets/hero_f1.png",
    heroB0:"assets/hero_b0.png", heroB1:"assets/hero_b1.png",
    heroS0:"assets/hero_s0.png", heroS1:"assets/hero_s1.png",
    cult:"assets/cult.png", wolf:"assets/wolf.png", witch:"assets/witch.png",
    herb:"assets/herb.png", merc:"assets/merc.png",
    ovHouseN:"assets/ov_house_n.png", ovChapel:"assets/ov_chapel.png",
    ovHouseE:"assets/ov_house_e.png", ovWell:"assets/ov_well.png",
    ovHouseSW:"assets/ov_house_sw.png", ovPews:"assets/ov_pews.png",
    elder:"assets/inq_npc.png"
  };
  // Full-screen story illustrations, loaded separately from sprites/tiles
  // because they're shown as one-off cutscenes (see showCutscene()) rather
  // than drawn every frame.
  const cutsceneFiles = { witchRise:"assets/boss.jpg" };
  const cutsceneImg = {};
  const img = {};
  let loaded=0, need=Object.keys(files).length;
  function loadAll(done){
    Object.entries(files).forEach(([k,src])=>{
      const i=new Image();
      i.onload=()=>{ img[k]=i; if(++loaded===need) done(); };
      i.onerror=()=>{ console.warn("falto",src); if(++loaded===need) done(); };
      i.src=src;
    });
    Object.entries(cutsceneFiles).forEach(([k,src])=>{
      const i=new Image();
      i.onload=()=>{ cutsceneImg[k]=i; };
      i.onerror=()=>console.warn("falto",src);
      i.src=src;
    });
  }

  const rooms = {
    plaza: {
      bg:"plaza", dark:false, spawn:{x:860,y:720},
      walk:[{x:260,y:280,w:1180,h:780}],
      block:[
        {x:160,y:400,w:280,h:250},
        {x:420,y:0,w:480,h:300},
        {x:1040,y:20,w:380,h:300},
        {x:1360,y:420,w:360,h:500},
        {x:0,y:820,w:300,h:340}
      ],
      exits:[
        {x:820,y:250,w:200,h:50,to:"bosque",sx:856,sy:1040},
        {x:1160,y:310,w:90,h:50,to:"capilla",sx:856,sy:980}
      ],
      spots:[
        {id:"well",x:300,y:540,r:80},
        {id:"herb",x:500,y:360,r:55},
        {id:"merc",x:1280,y:780,r:60},
        {id:"chapel",x:1200,y:330,r:50},
        {id:"elder",x:900,y:560,r:60}
      ],
      foes:[{kind:"cult",x:760,y:560},{kind:"cult",x:1100,y:700}],
      overlays:[
        {img:"ovHouseN",x:380,y:0,z:360},
        {img:"ovChapel",x:1000,y:10,z:400},
        {img:"ovWell",x:140,y:360,z:680},
        {img:"ovHouseE",x:1260,y:360,z:900},
        {img:"ovHouseSW",x:0,y:760,z:1120}
      ]
    },
    bosque: {
      bg:"bosque", dark:false, spawn:{x:856,y:1040},
      walk:[{x:680,y:0,w:360,h:1152},{x:620,y:400,w:500,h:500}],
      block:[],
      exits:[{x:740,y:1100,w:240,h:50,to:"plaza",sx:900,sy:300}],
      spots:[{id:"chest",x:1120,y:720,r:70}],
      foes:[{kind:"wolf",x:860,y:420},{kind:"cult",x:820,y:700}]
    },
    capilla: {
      bg:"capilla", dark:true, spawn:{x:856,y:980},
      walk:[{x:280,y:180,w:1160,h:880}],
      block:[
        {x:300,y:300,w:420,h:420},
        {x:980,y:300,w:420,h:420},
        {x:740,y:760,w:240,h:120}
      ],
      exits:[
        {x:760,y:1060,w:200,h:60,to:"plaza",sx:1200,sy:360},
        {x:760,y:160,w:200,h:60,to:"cripta",sx:856,sy:1000,need:"lantern"}
      ],
      spots:[{id:"altar",x:856,y:800,r:70},{id:"padre",x:856,y:600,r:70}],
      foes:[{kind:"cult",x:500,y:720},{kind:"cult",x:1220,y:720}],
      overlays:[{img:"ovPews",x:260,y:280,z:740}]
    },
    cripta: {
      bg:"cripta", dark:true, spawn:{x:856,y:1000},
      walk:[{x:80,y:160,w:1550,h:920}],
      block:[{x:520,y:360,w:680,h:420}],
      exits:[{x:740,y:1080,w:240,h:50,to:"capilla",sx:856,sy:220}],
      spots:[{id:"well2",x:856,y:620,r:100},{id:"record",x:1160,y:760,r:70}],
      foes:[{kind:"witch",x:856,y:540},{kind:"cult",x:280,y:900},{kind:"cult",x:1440,y:900}]
    }
  };

  // Puntos de luz ambiente (ventanas, velas, el pozo) — coordenadas
  // revisadas a mano mirando cada overlay real (no adivinadas), sumando el
  // offset x/y con el que ese overlay se planta en el mundo (ver
  // rooms.plaza.overlays arriba). "warm" parpadea rápido e irregular como
  // una vela; "cursed" pulsa lento y verdoso, para el pozo/pacto.
  const GLOWS = {
    plaza: [
      {x:635,y:145,r:22,type:"warm"}, {x:575,y:255,r:20,type:"warm"}, {x:810,y:250,r:20,type:"warm"}, // ov_house_n
      {x:1505,y:630,r:22,type:"warm"}, {x:1435,y:760,r:18,type:"warm"}, {x:1580,y:760,r:18,type:"warm"}, {x:1275,y:500,r:14,type:"warm"}, // ov_house_e
      {x:150,y:975,r:20,type:"warm"}, // ov_house_sw
      {x:1095,y:340,r:13,type:"warm"}, {x:1345,y:355,r:13,type:"warm"}, // ov_chapel, velas de la entrada
      {x:385,y:565,r:65,type:"cursed"} // pozo (ov_well) — coincide con el spot "well" interactivo
    ],
    cripta: [ {x:856,y:620,r:75,type:"cursed"} ] // well2 — sin overlay propio, el fondo ya es la cripta
  };
  function drawGlow(x,y,r,type){
    const sx=x-cam.x, sy=y-cam.y+HUD;
    if(sx<-r||sx>VW+r||sy<HUD-r||sy>VH+HUD+r) return; // no gastar tiempo dibujando fuera de cámara
    let alpha, color;
    if(type==="warm"){
      alpha = 0.5 + Math.sin(time*0.5+x*0.13)*0.16 + Math.sin(time*1.7+y*0.07)*0.08;
      color = "255,190,90";
    } else {
      alpha = 0.32 + Math.sin(time*0.06+x*0.05)*0.14;
      color = "90,200,120";
    }
    const grd=ctx.createRadialGradient(sx,sy,0,sx,sy,r);
    grd.addColorStop(0,`rgba(${color},${Math.max(0,alpha)})`);
    grd.addColorStop(1,`rgba(${color},0)`);
    ctx.fillStyle=grd; ctx.fillRect(sx-r,sy-r,r*2,r*2);
  }

  // defaultFlags() centraliza el estado inicial — la usan tanto la partida
  // nueva (const game=...) como startGame() al reiniciar y loadGame() como
  // base para mergear un save viejo (así un flag agregado después de que
  // alguien guardó no rompe la carga: falta en el save, lo cubre el default).
  function defaultFlags(){
    return {
      lantern:false,bow:false,arrows:10,witchDead:false,wellSealed:false,chest:false,
      // --- narrative flags (El Silencio arc) ---
      metElder:false,      // habló con el Encapuchado al menos una vez
      elderHint2:false,    // segunda charla con el Encapuchado (post-bruja)
      foundRecord:false,   // leyó el registro oculto en la cripta
      metPadre:false,      // primera charla con el Padre en la capilla
      padreConfessed:false,// el Padre ya contó su culpa (Acto 5)
      confessed:null        // decisión final: "reveal" | "silence" | null (no llegó todavía)
    };
  }
  const game={room:"plaza",item:"hammer",flags:defaultFlags(),hp:6,maxHp:6,invuln:0};

  // storyAct() deriva el capítulo actual a partir de los flags existentes en
  // vez de mantener un contador aparte, para que nunca queden desincronizados.
  // 1: cacería normal (tal como se ve todo al arrancar)
  // 2: dudas — ya tenés la linterna, aparece el Encapuchado en la plaza
  // 3: post-bruja — ella no maldice, dice algo que no encaja
  // 4: revelación — encontraste el registro del Obispado en la cripta
  function storyAct(){
    if(game.flags.padreConfessed) return 5;
    if(game.flags.foundRecord) return 4;
    if(game.flags.witchDead) return 3;
    if(game.flags.lantern) return 2;
    return 1;
  }
  const player={x:620,y:520,dir:0,walk:false,frame:0,atk:0,using:0};
  let enemies=[], shots=[], drops=[], dialog=null, state="title", cam={x:0,y:0}, time=0, fade=0, pending=null;
  let introSeen=false, cutsceneSeen=false, cutscene=null, pendingChoice=false;

  let AC=null;
  function beep(f,d,t,v){
    try{
      AC=AC||new (window.AudioContext||window.webkitAudioContext)();
      const o=AC.createOscillator(),g=AC.createGain();
      o.type=t||"square"; o.frequency.value=f; g.gain.value=v||.035;
      o.connect(g); g.connect(AC.destination); o.start();
      g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+(d||.08));
      o.stop(AC.currentTime+(d||.08));
    }catch(e){}
  }
  const sfx={
    slash:()=>{beep(190,.06);beep(90,.08,"sawtooth",.03);},
    hit:()=>beep(130,.1,"sawtooth",.05),
    hurt:()=>{beep(90,.12);beep(55,.2,"triangle",.04);},
    item:()=>{beep(520,.08);setTimeout(()=>beep(780,.12),70);},
    talk:()=>beep(240,.04,"triangle",.03),
    win:()=>{beep(330,.1);setTimeout(()=>beep(660,.18),160);}
  };

  const keys={};
  addEventListener("keydown",e=>{
    keys[e.key.toLowerCase()]=true;
    if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault();
    if(state==="play") onKey(e.key.toLowerCase());
  });
  addEventListener("keyup",e=>keys[e.key.toLowerCase()]=false);

  function canvasPos(e){
    const r=canvas.getBoundingClientRect();
    return {x:(e.clientX-r.left)*(VW/r.width), y:(e.clientY-r.top)*((VH+HUD)/r.height)};
  }
  function worldFromMouse(e){ const p=canvasPos(e); return {x:p.x+cam.x, y:p.y-HUD+cam.y}; }
  function faceWorld(wx,wy){
    const dx=wx-player.x, dy=wy-player.y;
    if(Math.abs(dx)>Math.abs(dy)) player.dir=dx<0?1:2; else player.dir=dy<0?3:0;
  }

  canvas.addEventListener("contextmenu",e=>e.preventDefault());
  canvas.style.touchAction="none"; // sin esto, un tap en el canvas también dispara scroll/zoom del navegador
  canvas.addEventListener("pointerdown",e=>{
    if(state!=="play") return;
    e.preventDefault();
    if(cutscene){ closeCutscene(); return; }
    if(dialog){
      if(pendingChoice){ resolveChoice(e.button===2?"silence":"reveal"); return; }
      closeDialog(); return;
    }
    const p=canvasPos(e);
    if(p.y<HUD){
      if(p.x>200&&p.x<248) setItem("hammer");
      else if(p.x>256&&p.x<304){
        if(game.flags.lantern) setItem(game.item==="lantern"&&game.flags.bow?"bow":"lantern");
        else if(game.flags.bow) setItem("bow");
      }
      return;
    }
    const w=worldFromMouse(e);
    faceWorld(w.x,w.y);
    if(e.button===2){ useItem(); return; }
    if(Math.hypot(w.x-player.x,w.y-player.y)<80 && hitSpot()) interact();
    else startAttack();
  });
  canvas.addEventListener("wheel",e=>{
    if(state!=="play") return;
    e.preventDefault(); cycleItem(e.deltaY>0?1:-1);
  },{passive:false});
  canvas.style.cursor="crosshair";

  // Controles táctiles: joystick emula las mismas flags de `keys` que ya
  // lee el movimiento (líneas de abajo, keys.w/a/s/d) — así no hace falta
  // tocar nada del código de movimiento. Los botones llaman directo a
  // onKey() con la tecla equivalente, para heredar gratis toda la lógica
  // de diálogo/cutscene/elección final que onKey ya maneja.
  function initTouchControls(){
    const base=document.getElementById("joystick"), nub=document.getElementById("joystickNub");
    const R=40; // radio máximo (px CSS) que se puede mover el nub
    const DEAD=10; // zona muerta central antes de contar como "tecla apretada"
    let activeId=null, cx=0, cy=0;

    function setFromDelta(dx,dy){
      const dist=Math.min(R,Math.hypot(dx,dy));
      const ang=Math.atan2(dy,dx);
      nub.style.transform=`translate(${Math.cos(ang)*dist}px,${Math.sin(ang)*dist}px)`;
      keys.d = dx> DEAD; keys.a = dx< -DEAD;
      keys.s = dy> DEAD; keys.w = dy< -DEAD;
    }
    function reset(){ nub.style.transform="translate(0,0)"; keys.w=keys.a=keys.s=keys.d=false; }

    base.addEventListener("pointerdown",e=>{
      if(activeId!==null) return;
      activeId=e.pointerId; base.setPointerCapture(activeId);
      const r=base.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2;
      setFromDelta(e.clientX-cx, e.clientY-cy); e.preventDefault();
    });
    base.addEventListener("pointermove",e=>{
      if(e.pointerId!==activeId) return;
      setFromDelta(e.clientX-cx, e.clientY-cy); e.preventDefault();
    });
    const end=e=>{ if(e.pointerId!==activeId) return; activeId=null; reset(); };
    base.addEventListener("pointerup",end);
    base.addEventListener("pointercancel",end);

    function bindButton(id,key){
      document.getElementById(id).addEventListener("pointerdown",e=>{
        e.preventDefault();
        if(state==="play") onKey(key);
      });
    }
    bindButton("btnAttack","z");
    bindButton("btnUse","x");
    bindButton("btnTalk","c");
  }
  if(IS_TOUCH) initTouchControls();

  function onKey(k){
    if(cutscene){ if("cz enter ".includes(k)||k==="enter") closeCutscene(); return; }
    if(dialog){
      if(pendingChoice){
        if(k==="z"||k==="j"){ resolveChoice("reveal"); return; }
        if(k==="x"||k==="k"){ resolveChoice("silence"); return; }
        return;
      }
      if("cz enter ".includes(k)||k==="enter") closeDialog();
      return;
    }
    if(k==="z"||k==="j") startAttack();
    if(k==="x"||k==="k") useItem();
    if(k==="c") interact();
    if(k==="1") setItem("hammer");
    if(k==="2"&&game.flags.lantern) setItem("lantern");
    if(k==="3"&&game.flags.bow) setItem("bow");
  }
  function setItem(it){ game.item=it; sfx.talk(); }
  function cycleItem(dir){
    const list=["hammer"];
    if(game.flags.lantern) list.push("lantern");
    if(game.flags.bow) list.push("bow");
    let i=list.indexOf(game.item); if(i<0)i=0;
    setItem(list[(i+(dir||1)+list.length)%list.length]);
  }

  function room(){ return rooms[game.room]; }
  function bg(){ return img[room().bg]; }
  function inRect(x,y,r){ return x>=r.x && y>=r.y && x<r.x+r.w && y<r.y+r.h; }
  function blocked(x,y){
    const R=room();
    if(R.walk && R.walk.length && !R.walk.some(r=>inRect(x,y,r))) return true;
    if(R.block && R.block.some(r=>inRect(x,y,r))) return true;
    const b=bg();
    if(b && (x<20||y<20||x>b.width-20||y>b.height-20)) return true;
    return false;
  }
  function tryMove(ent,dx,dy){
    if(!blocked(ent.x+dx, ent.y)) ent.x+=dx;
    if(!blocked(ent.x, ent.y+dy)) ent.y+=dy;
  }
  function spawnRoom(){
    const R=room(); enemies=[]; shots=[];
    R.foes.forEach(f=>{
      if(f.kind==="witch" && game.flags.witchDead) return;
      const st={cult:{hp:3,spd:.7,dmg:1,r:160},wolf:{hp:2,spd:1.1,dmg:1,r:200},witch:{hp:12,spd:.25,dmg:1,r:260}}[f.kind];
      enemies.push(Object.assign({},f,st,{alive:true,hit:0,cd:0}));
    });
  }
  function warp(to,x,y){ pending={to,x,y}; fade=1; }
  function applyWarp(){
    game.room=pending.to; player.x=pending.x; player.y=pending.y; pending=null; spawnRoom();
    if(game.room==="cripta" && !cutsceneSeen){
      cutsceneSeen=true;
      showCutscene("witchRise","Algo se levanta del agua antes de que bajes del todo. No parece tener prisa.");
    }
    saveGame();
  }

  function hitSpot(){ return (room().spots||[]).find(s=>Math.hypot(player.x-s.x,player.y-s.y)<s.r+20); }
  function interact(){
    const s=hitSpot();
    if(!s){ const ex=(room().exits||[]).find(e=>inRect(player.x,player.y,e)); if(ex) tryExit(ex); return; }
    sfx.talk();
    if(s.id==="herb") openDialog("Herbolaria", game.flags.witchDead
      ? "Buen trabajo. Mal oficio. La raiz cierra el corte, no la culpa."
      : "El pozo se abrio anoche. No es fiebre: es pacto. La capilla guarda una linterna. El bosque, una ballesta. No respondas si el pino grita.");
    else if(s.id==="merc") openDialog("Mercenario","Yo no bajo a criptas. El cofre del bosque tiene mi ballesta. Si quieres vivir, no te quedes mirando el agua.");
    else if(s.id==="well") openDialog("Pozo", game.flags.wellSealed
      ? "Sellado. El pueblo ya no escucha nada de noche. Nadie te lo va a agradecer."
      : game.flags.witchDead
        ? "El agua ya no habla. Golpealo con el martillo para sellar la tapa."
        : "Huele a estanque y a incienso podrido. Algo subio por aqui.");
    else if(s.id==="well2") openDialog("Brocal", game.flags.witchDead
      ? "El nombre ya esta dicho. Vuelve al pozo del pueblo y sellalo."
      : "Aqui esta el pacto. No bebas.");
    else if(s.id==="altar"){
      if(!game.flags.lantern){ game.flags.lantern=true; game.item="lantern"; sfx.item();
        openDialog("Altar","Linterna de cobre. El cono corta la cripta. Encenderla tambien te delata."); }
      else openDialog("Altar","Ya tomaste lo que habia.");
    } else if(s.id==="chest"){
      if(!game.flags.chest){ game.flags.chest=true; game.flags.bow=true; game.flags.arrows=14; game.item="bow"; sfx.item();
        openDialog("Cofre","Una ballesta de caza. El mercenario la dejo por si el martillo no alcanza."); }
      else { game.flags.arrows+=5; openDialog("Cofre","Mas virotes."); }
    } else if(s.id==="chapel") warp("capilla",590,620);
    else if(s.id==="elder"){
      // El Encapuchado: otro Martillo, mucho mas viejo. Nunca da su nombre.
      // Nota tecnica: usamos inq_npc.png SOLO como retrato de dialogo (abajo)
      // porque el archivo tiene fondo pintado, no transparencia real — usarlo
      // como sprite de mundo se veia como un rectangulo opaco flotando sobre
      // la escena. En el mundo se dibuja con drawElderSilhouette() (vectorial).
      const PORTRAIT="assets/inq_npc.png";
      const act=storyAct();
      if(act<3){
        game.flags.metElder=true;
        openDialog("Encapuchado","Yo tambien vine por un pozo, hace treinta años. Sigo sin saber si hice bien. Apurate con la linterna — el Obispo no manda dos cartas por el mismo pueblo.",PORTRAIT);
      } else if(act===3 && !game.flags.elderHint2){
        game.flags.elderHint2=true;
        openDialog("Encapuchado","¿Dijo algo, antes de callarse? Las que hablan al final siempre dicen lo mismo. Nunca es lo que el manual promete que van a decir.",PORTRAIT);
      } else {
        openDialog("Encapuchado","Bajá a la cripta otra vez. Hay algo ahi que yo no tuve el estomago de leer.",PORTRAIT);
      }
    } else if(s.id==="record"){
      if(!game.flags.witchDead){
        openDialog("Piedra suelta","Algo esta escondido debajo, pero la tierra esta compactada. Volvé cuando esto termine.");
      } else if(!game.flags.foundRecord){
        game.flags.foundRecord=true; sfx.item();
        openDialog("Registro del Obispado","'...la doctrina de El Silencio no se explica a los Martillos: se ejecuta. El agua no cura, no maldice: borra la culpa, y sin culpa no hay arrepentimiento posible. Sellar no es superstición. Es la única linea de defensa que Roma nunca reconoce en voz alta.' Hay una firma, tachada a proposito.");
      } else {
        openDialog("Registro","Ya lo leiste. Las palabras no cambian por releerlas.");
      }
    } else if(s.id==="padre"){
      const act=storyAct();
      if(!game.flags.metPadre){
        game.flags.metPadre=true;
        openDialog("Padre","Sella el pozo cuando puedas. El pueblo reza mejor sabiendo que alguien se ocupa. No hace falta que entiendas el porque — yo tampoco lo entendia, al principio.");
      } else if(act<4){
        openDialog("Padre", game.flags.witchDead
          ? "¿Todavia no bajaste a mirar bien la cripta? Andá con calma. No hay apuro ahora que ella ya no habla."
          : "Rezá antes de bajar. No por vos — por lo que vas a tener que hacer.");
      } else if(!game.flags.padreConfessed){
        game.flags.padreConfessed=true;
        openDialog("Padre","Vas a leer algo raro en ese registro. Antes de que me lo preguntes: hace años traje a alguien que amaba hasta el pozo. No para matarla. Para probar. Sigue en el pueblo. La tratan de tocada. Yo la mire a los ojos y ya no habia nadie ahi adentro. Eso es lo que guarda el manual. Eso es lo que vos leiste recien.");
      } else if(game.flags.confessed===null){
        openDialog("Padre","¿Y bien? El Obispo va a preguntar que encontraste. [Z] para decirle la verdad. [X] para decirle lo que quiere oir.");
        pendingChoice=true;
      } else {
        openDialog("Padre", game.flags.confessed==="reveal"
          ? "Ya esta hecho. No se si el Obispo te va a creer, pero al menos alguien mas lo sabe ahora."
          : "Bien. El pozo esta sellado y nadie va a preguntar de mas. Dormí, si podés.");
      }
    }
    saveGame();
  }
  function tryExit(ex){
    if(ex.need==="lantern" && !game.flags.lantern){ openDialog("Escalera","Abajo esta negro. Sin linterna te comes una pared."); return; }
    warp(ex.to, ex.sx, ex.sy);
  }
  function startAttack(){
    if(player.atk) return;
    player.atk=14; sfx.slash();
    const reach=42;
    const ox=player.dir===1?-reach:player.dir===2?reach:0;
    const oy=player.dir===3?-reach:player.dir===0?reach:0;
    enemies.forEach(e=>{
      if(!e.alive||e.hit) return;
      if(Math.abs(e.x-(player.x+ox))<28 && Math.abs(e.y-(player.y+oy))<28) hurtEnemy(e,1);
    });
    const s=hitSpot();
    if(s && s.id==="well" && game.flags.witchDead && !game.flags.wellSealed){
      game.flags.wellSealed=true; sfx.win(); saveGame();
      setTimeout(()=>showOverlay("win","EL POZO SE CIERRA","Oficio cumplido","La pactada ya no habla desde el agua. El pueblo te mira igual de mal."),600);
    }
  }
  function useItem(){
    if(player.using) return;
    if(game.item==="bow"){
      if(game.flags.arrows<=0){ beep(90,.08); return; }
      game.flags.arrows--; player.using=16;
      const vx=player.dir===1?-4.2:player.dir===2?4.2:0;
      const vy=player.dir===3?-4.2:player.dir===0?4.2:0;
      shots.push({x:player.x,y:player.y-10,vx,vy,life:55,friendly:true});
      sfx.slash();
    } else if(game.item==="lantern"){ player.using=20; sfx.talk(); }
    else startAttack();
  }
  function hurtEnemy(e,d){
    e.hp-=d; e.hit=12; sfx.hit();
    if(e.hp<=0){
      e.alive=false;
      if(e.kind==="witch"){ game.flags.witchDead=true; openDialog("Nombre","El agua suelta el nombre y se calla. Vuelve al pozo de la plaza. Sellalo con el martillo."); sfx.win(); saveGame(); }
      else if(Math.random()<.5) drops.push({kind:Math.random()<.5?"heart":"arrow",x:e.x,y:e.y});
    }
  }
  function hurtPlayer(d){
    if(game.invuln) return;
    game.hp-=d; game.invuln=40; sfx.hurt();
    if(game.hp<=0) showOverlay("dead","CAISTE","El pueblo no espera a los martires.","Solo a los que vuelven.");
  }
  function openDialog(who,text,portrait){
    dialog={who,text};
    const el=document.getElementById("dialog");
    el.classList.add("show");
    document.getElementById("dwho").textContent=who.toUpperCase();
    document.getElementById("dtxt").textContent=text;
    const p=document.getElementById("dportrait");
    if(portrait){ p.src=portrait; p.classList.add("show"); } else { p.classList.remove("show"); p.removeAttribute("src"); }
  }
  function closeDialog(){ dialog=null; document.getElementById("dialog").classList.remove("show"); }

  // =========================================================================
  // GUARDADO — localStorage, un solo slot a propósito (es un prototipo de
  // un pueblo, no hace falta más todavía). Se llama a saveGame() después de
  // cada cambio de sala (applyWarp) y cada vez que interact() cambia un
  // flag — ver esos puntos de llamada más abajo — así nunca queda un
  // progreso "a mitad de guardar" ni hace falta acordarse de llamarlo desde
  // cada lugar nuevo que agregue un flag.
  // =========================================================================
  const SAVE_KEY="malleus_save_v1";

  function saveGame(){
    try{
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        room:game.room, item:game.item, flags:game.flags,
        hp:game.hp, maxHp:game.maxHp,
        px:player.x, py:player.y, dir:player.dir
      }));
    }catch(e){ /* localStorage puede fallar (modo privado, cuota llena, etc.) —
                  no es crítico para jugar, así que no interrumpimos nada. */ }
  }
  function loadSaveData(){
    try{
      const raw=localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function hasSave(){ return !!loadSaveData(); }
  function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }

  // Final con eleccion real (Acto 5). Se dispara desde interact() cuando
  // el jugador le contesta al Padre despues de que este confeso. No hay
  // tercer final "limpio" a proposito (ver docs/STORY.md) — las dos ramas
  // usan el mismo showOverlay("win",...) pero con texto distinto.
  function resolveChoice(kind){
    game.flags.confessed=kind; pendingChoice=false; closeDialog();
    const msg = kind==="reveal"
      ? ["LA VERDAD QUEDA DICHA","Se rompe la cadena","El Obispo no te va a creer del todo. Alguien mas ya lo sabe."]
      : ["EL OFICIO SE CUMPLE","El ciclo sigue","El pozo esta sellado. Nadie pregunta de mas. Vos si."];
    clearSave(); // el arco terminó — un "Continuar" después de esto no debería reabrir un final ya jugado
    setTimeout(()=>showOverlay("win",msg[0],msg[1],msg[2]),400);
  }

  // Full-screen story cutscenes (currently just the witch reveal). These pause
  // gameplay the same way a dialog does, but render cutsceneImg[key] instead
  // of the room background. Dismissed the same way dialogs are (click/Z/Enter).
  function showCutscene(key,text){ cutscene={key,text}; }
  function closeCutscene(){ cutscene=null; }
  function showOverlay(kind,k,title,sub){
    state=kind;
    const o=document.getElementById("overlay");
    o.classList.remove("play");
    o.querySelector(".k").textContent=k;
    o.querySelector("h1").textContent=title;
    o.querySelector("p").textContent=sub;
    o.querySelector("button").textContent=kind==="dead"?"Volver al umbral":"Otra noche";
  }

  function update(){
    time++;
    if(fade>0){ fade-=.08; if(fade<=.5&&pending) applyWarp(); if(fade<0) fade=0; }
    if(state!=="play"||dialog||cutscene) return;
    let dx=0,dy=0;
    if(keys.a||keys.arrowleft) dx-=1;
    if(keys.d||keys.arrowright) dx+=1;
    if(keys.w||keys.arrowup) dy-=1;
    if(keys.s||keys.arrowdown) dy+=1;
    if(dx&&dy){dx*=.72;dy*=.72;}
    player.walk=!!(dx||dy)&&!player.atk;
    if(dx||dy){ if(Math.abs(dx)>Math.abs(dy)) player.dir=dx<0?1:2; else player.dir=dy<0?3:0; }
    if(!player.atk) tryMove(player, dx*2.3, dy*2.3);
    if(player.walk) player.frame++;
    if(player.atk) player.atk--;
    if(player.using) player.using--;
    if(game.invuln) game.invuln--;
    (room().exits||[]).forEach(ex=>{ if(inRect(player.x,player.y,ex)) tryExit(ex); });
    const b=bg();
    cam.x=Math.max(0, Math.min((b?b.width:VW)-VW, player.x-VW/2));
    cam.y=Math.max(0, Math.min((b?b.height:VH)-VH, player.y-VH/2));
    enemies.forEach(e=>{
      if(!e.alive) return;
      if(e.hit) e.hit--; e.cd--;
      const pdx=player.x-e.x, pdy=player.y-e.y, dist=Math.hypot(pdx,pdy);
      if(e.kind!=="witch" && dist<e.r && dist>28) tryMove(e,(pdx/dist)*e.spd,(pdy/dist)*e.spd);
      if(dist<26 && e.cd<=0 && e.kind!=="witch"){ hurtPlayer(e.dmg); e.cd=36; }
      if(e.kind==="witch" && e.cd<=0 && dist<280){
        e.cd=55; const a=Math.atan2(pdy,pdx);
        shots.push({x:e.x,y:e.y-20,vx:Math.cos(a)*2.2,vy:Math.sin(a)*2.2,life:90,friendly:false});
      }
    });
    shots=shots.filter(s=>{
      s.x+=s.vx; s.y+=s.vy; s.life--;
      if(s.life<=0) return false;
      if(s.friendly){
        for(const e of enemies) if(e.alive && Math.hypot(e.x-s.x,e.y-s.y)<24){ hurtEnemy(e,2); return false; }
      } else if(Math.hypot(player.x-s.x,player.y-s.y)<18){ hurtPlayer(1); return false; }
      return true;
    });
    drops=drops.filter(d=>{
      if(Math.hypot(d.x-player.x,d.y-player.y)<24){
        if(d.kind==="heart") game.hp=Math.min(game.maxHp,game.hp+2); else game.flags.arrows+=3;
        sfx.item(); return false;
      }
      return true;
    });
  }

  // =========================================================================
  // ANIMATOR — equivalente casero a un Animator/AnimatedSprite2D.
  //
  // Estados: "idle" | "walk". Direcciones: "front" | "back" | "side".
  // Cada dirección declara si tiene 2 frames de arte REALES o si por ahora
  // solo hay 1 (real:false). Cuando faltan frames reales, "walk" no falla
  // silenciosamente ni queda rígido: cae a una animación PROCEDURAL
  // (bamboleo vertical + inclinación lateral) hecha con transform de canvas,
  // hasta que se sumen los sprites que faltan.
  //
  // Para agregar el segundo frame real de una dirección: dibujar
  // assets/hero_b1.png / hero_s1.png distinto de su _0 y poner real:true acá.
  // =========================================================================
  const Animator = {
    directions: {
      front: { frames:()=>[img.heroF0,img.heroF1], real:true  },
      back:  { frames:()=>[img.heroB0,img.heroB1], real:false },
      side:  { frames:()=>[img.heroS0,img.heroS1], real:false }
    },
    dirNameFor(dirCode){
      if(dirCode===3) return "back";
      if(dirCode===0) return "front";
      return "side"; // 1 y 2 son izquierda/derecha, se resuelven con flip
    },
    state(){ return player.walk ? "walk" : "idle"; },
    // Frame de sprite a dibujar este tick.
    frame(){
      const d=this.directions[this.dirNameFor(player.dir)];
      const [f0,f1]=d.frames();
      if(this.state()==="idle" || !d.real) return f0;
      return (player.frame>>3)&1 ? f1 : f0;
    },
    // Transform procedural aplicado ADEMAS del sprite, para que "side"/"back"
    // no se sientan rígidos mientras no tengan segundo frame real.
    proceduralOffset(){
      if(this.state()!=="walk") return {bob:0, skew:0};
      const d=this.directions[this.dirNameFor(player.dir)];
      const t=player.frame;
      const bob = Math.sin(t*0.45)*3;
      const skew = d.real ? 0 : Math.sin(t*0.45)*0.06; // leve balanceo, imperceptible como "trampa"
      return {bob, skew};
    }
  };
  function heroImg(){ return Animator.frame(); }

  function drawSprite(image,x,y,h,flip){
    if(!image) return;
    const w=image.width/image.height*h;
    const isPlayer = image===heroImg();
    const {bob,skew} = isPlayer ? Animator.proceduralOffset() : {bob:0,skew:0};
    const sx=x-w/2-cam.x, sy=y-h-cam.y+HUD+bob;
    ctx.save();
    if(flip){ ctx.translate(sx+w,sy); ctx.scale(-1,1); }
    else ctx.translate(sx,sy);
    if(skew){ ctx.transform(1,0,skew,1,0,0); }
    ctx.drawImage(image,0,0,w,h);
    ctx.restore();
  }
  function drawProp(image,x,y){
    if(!image) return;
    ctx.drawImage(image, Math.floor(x-cam.x), Math.floor(y-cam.y+HUD));
  }
  // El Encapuchado: dibujado a mano con canvas (no como imagen) porque el
  // unico asset que tenemos de este personaje (assets/inq_npc.png) es un
  // retrato con fondo opaco, no un sprite recortado — ver nota en interact().
  function drawElderSilhouette(x,y){
    const g=ctx, sx=x-cam.x, sy=y-cam.y+HUD;
    g.save();
    g.translate(sx,sy);
    g.fillStyle="#1c2024";
    g.beginPath();
    g.moveTo(-26,4); g.quadraticCurveTo(-30,-70,0,-96);
    g.quadraticCurveTo(30,-70,26,4);
    g.quadraticCurveTo(14,-6,0,4);
    g.quadraticCurveTo(-14,-6,-26,4);
    g.fill();
    g.fillStyle="#2a1416";
    g.beginPath(); g.moveTo(-26,4); g.lineTo(-18,16); g.lineTo(-8,4); g.lineTo(4,18); g.lineTo(14,4); g.lineTo(26,4); g.lineTo(20,-4); g.lineTo(-20,-4); g.closePath(); g.fill();
    g.fillStyle="#0c0e10";
    g.beginPath(); g.ellipse(0,-72,13,15,0,0,Math.PI*2); g.fill();
    g.fillStyle="#c4a15a";
    g.beginPath(); g.arc(-4,-73,1.6,0,Math.PI*2); g.arc(4,-73,1.6,0,Math.PI*2); g.fill();
    g.fillStyle="#e2a23a";
    g.beginPath(); g.arc(20,10,4,0,Math.PI*2); g.fill();
    g.restore();
  }
  // El Padre del pueblo: silueta clara (sotana gris, no capa negra) para que
  // se distinga de un vistazo del Encapuchado. Sin capucha (cara visible,
  // simple), con una estola oscura al cuello — unica seña distintiva.
  function drawPadreSilhouette(x,y){
    const g=ctx, sx=x-cam.x, sy=y-cam.y+HUD;
    g.save();
    g.translate(sx,sy);
    g.fillStyle="#3a3630";
    g.beginPath();
    g.moveTo(-22,4); g.quadraticCurveTo(-26,-58,0,-88);
    g.quadraticCurveTo(26,-58,22,4);
    g.quadraticCurveTo(11,-6,0,4);
    g.quadraticCurveTo(-11,-6,-22,4);
    g.fill();
    g.fillStyle="#241a16";
    g.beginPath(); g.moveTo(-6,-70); g.lineTo(6,-70); g.lineTo(9,10); g.lineTo(-9,10); g.closePath(); g.fill();
    g.fillStyle="#d8bfa0";
    g.beginPath(); g.ellipse(0,-76,12,13,0,0,Math.PI*2); g.fill();
    g.fillStyle="#050403";
    g.beginPath(); g.arc(-4,-77,1.3,0,Math.PI*2); g.arc(4,-77,1.3,0,Math.PI*2); g.fill();
    g.restore();
  }

  function draw(){
    const g=ctx;
    g.fillStyle="#050403"; g.fillRect(0,0,VW,VH+HUD);
    const b=bg();
    if(b) g.drawImage(b, -cam.x, HUD-cam.y);
    drops.forEach(d=>{
      g.fillStyle=d.kind==="heart"?"#8a2a2a":"#c4a15a";
      g.beginPath(); g.arc(d.x-cam.x, d.y-cam.y+HUD, 6,0,Math.PI*2); g.fill();
    });
    const actors=[];
    (room().overlays||[]).forEach(ov=>{
      actors.push({z:ov.z, draw:()=>drawProp(img[ov.img], ov.x, ov.y)});
    });
    (GLOWS[game.room]||[]).forEach(gl=>{
      actors.push({z:gl.y, draw:()=>drawGlow(gl.x,gl.y,gl.r,gl.type)});
    });
    if(game.room==="plaza"){
      actors.push({z:360, draw:()=>drawSprite(img.herb,500,360,118,false)});
      actors.push({z:790, draw:()=>drawSprite(img.merc,1280,790,128,false)});
      // El Encapuchado only shows up once the story has advanced past Acto 1
      // (see story.act in interact()/spawnRoom-adjacent logic below).
      if(storyAct()>=2) actors.push({z:560, draw:()=>drawElderSilhouette(900,560)});
    }
    if(game.room==="capilla"){
      actors.push({z:600, draw:()=>drawPadreSilhouette(856,600)});
    }
    enemies.forEach(e=>{
      if(!e.alive) return;
      actors.push({z:e.y, draw:()=>{
        if(e.hit && time%2===0) return;
        const spr=e.kind==="cult"?img.cult:e.kind==="wolf"?img.wolf:img.witch;
        // Bob de "quieto": sin esto los enemigos son estatuas hasta que
        // atacan. No reemplaza una animación real, pero evita que se vean
        // congelados — mismo criterio procedural que el resto del proyecto.
        const bob = e.hit ? 0 : Math.sin(time*0.08 + e.x*0.05)*3;
        drawSprite(spr,e.x,e.y+bob, e.kind==="witch"?150:e.kind==="wolf"?48:88, e.x>player.x);
      }});
    });
    actors.push({z:player.y, draw:()=>{
      if(game.invuln && time%2===0) return;
      // Lunge: como no tenemos un frame de arte dedicado al golpe, el
      // cuerpo se adelanta unos px hacia donde ataca y vuelve — sale y
      // entra en un solo arco de seno a lo largo de player.atk (14→0).
      let lx=0, ly=0;
      if(player.atk){
        const t=1-player.atk/14;
        const lunge=Math.sin(Math.min(1,t*1.6)*Math.PI)*10;
        lx=player.dir===1?-lunge:player.dir===2?lunge:0;
        ly=player.dir===3?-lunge:player.dir===0?lunge:0;
      }
      drawSprite(heroImg(), player.x+lx, player.y+ly, 124, player.dir===1);
      if(player.atk){
        const t=1-player.atk/14;
        const ang=player.dir===0?Math.PI/2:player.dir===3?-Math.PI/2:player.dir===1?Math.PI:0;
        // El barrido se completa rapido (primer 45% del golpe) y despues
        // se desvanece — antes esto dibujaba el arco entero de una, fijo,
        // sin sensacion de movimiento.
        const sweep=Math.min(1,t/0.45);
        const a0=ang-0.95, a1=ang-0.95+1.9*sweep;
        const cx=player.x-cam.x+lx, cy=player.y-28-cam.y+HUD+ly;
        g.save();
        g.globalAlpha=1-Math.max(0,(t-0.55)/0.45);
        g.fillStyle="rgba(232,220,200,.32)";
        g.beginPath(); g.moveTo(cx,cy); g.arc(cx,cy,34,a0,a1); g.closePath(); g.fill();
        g.strokeStyle="#e8dcc8"; g.lineWidth=3;
        g.beginPath(); g.arc(cx,cy,34,a0,a1); g.stroke();
        // cabeza del martillo en la punta del barrido, para que se lea
        // como un golpe con peso y no solo una linea curva
        g.fillStyle="#c9c9cf";
        g.beginPath(); g.arc(cx+Math.cos(a1)*34, cy+Math.sin(a1)*34, 5,0,Math.PI*2); g.fill();
        g.restore();
      }
    }});
    actors.sort((a,c)=>a.z-c.z); actors.forEach(a=>a.draw());
    shots.forEach(s=>{ g.fillStyle=s.friendly?"#e8dcc8":"#6a8a4a"; g.fillRect(s.x-cam.x-2,s.y-cam.y+HUD-2,5,5); });

    const R=room();
    const lx=player.x-cam.x, ly=player.y-cam.y+HUD-30;
    if(R.dark){
      const rad=game.item==="lantern"&&game.flags.lantern?210:game.flags.lantern?120:70;
      const grd=g.createRadialGradient(lx,ly,20,lx,ly,rad);
      grd.addColorStop(0,"rgba(0,0,0,0)"); grd.addColorStop(.45,"rgba(0,0,0,.35)"); grd.addColorStop(1,"rgba(0,0,0,.88)");
      g.fillStyle=grd; g.fillRect(0,HUD,VW,VH);
    } else {
      const grd=g.createRadialGradient(lx,ly,80,lx,ly,420);
      grd.addColorStop(0,"rgba(0,0,0,0)"); grd.addColorStop(1,"rgba(0,0,0,.38)");
      g.fillStyle=grd; g.fillRect(0,HUD,VW,VH);
    }
    if(fade>0){ g.fillStyle="rgba(0,0,0,"+Math.min(1,fade*1.4)+")"; g.fillRect(0,HUD,VW,VH); }

    g.fillStyle="#120e0b"; g.fillRect(0,0,VW,HUD);
    g.fillStyle="#3a3024"; g.fillRect(0,HUD-2,VW,2);
    g.fillStyle="#c4a15a"; g.font="12px Georgia"; g.fillText("MALLEUS",16,22);
    g.fillStyle="#8a2a2a";
    for(let i=0;i<game.maxHp;i+=2){ g.globalAlpha=game.hp>i?1:.25; g.fillText("♥",130+i*14,24); }
    g.globalAlpha=1;
    function slot(x,on,label){
      g.strokeStyle=on?"#c4a15a":"#5a4a32"; g.fillStyle=on?"#2a2218":"#1a1410";
      g.fillRect(x,8,44,34); g.strokeRect(x+.5,8.5,43,33);
      g.fillStyle="#e8dcc8"; g.font="11px Georgia"; g.fillText(label,x+6,28);
    }
    slot(200, game.item==="hammer","maza");
    slot(256, game.item!=="hammer", game.item==="bow"?"arco":"luz");
    g.fillStyle="#9a8b74"; g.font="12px Georgia";
    g.fillText("virotes "+game.flags.arrows+(game.flags.lantern?"  ·  linterna":"")+(game.flags.witchDead?"  ·  nombre":""),320,30);

    // Encargo actual (quest tracker) — quién te está dirigiendo en este capítulo.
    g.fillStyle="#c4a15a"; g.font="11px Georgia"; g.textAlign="right";
    g.fillText(questText(), VW-14, 24);
    g.textAlign="left";

    if(cutscene) drawCutscene();
  }

  function questText(){
    const act=storyAct();
    if(act===1) return "Encargo · Obispo — investigá el pozo del pueblo";
    if(act===2) return "Encargo · Obispo — encontrá la linterna y bajá a la cripta";
    if(act===3) return "Encargo · Padre — sellá el pozo con el martillo";
    if(act===4) return "Encargo · nadie te dijo que hacer con esto";
    return game.flags.confessed ? "Encargo · cumplido" : "Encargo · hablá con el Padre";
  }

  function drawCutscene(){
    const g=ctx, im=cutsceneImg[cutscene.key];
    g.fillStyle="#050403"; g.fillRect(0,0,VW,VH+HUD);
    if(im){
      const scale=Math.min(VW/im.width,(VH+HUD)/im.height);
      const w=im.width*scale, h=im.height*scale;
      g.drawImage(im,(VW-w)/2,(VH+HUD-h)/2,w,h);
    }
    g.fillStyle="rgba(5,4,3,.72)"; g.fillRect(0,VH+HUD-70,VW,70);
    g.fillStyle="#e8dcc8"; g.font="15px Georgia";
    g.fillText(cutscene.text, 24, VH+HUD-38, VW-48);
    g.fillStyle="#9a8b74"; g.font="11px Georgia"; g.textAlign="right";
    g.fillText("clic / Z / Enter para continuar", VW-14, VH+HUD-14);
    g.textAlign="left";
  }

  function loop(){ update(); if(state==="play"||state==="dead"||state==="win") draw(); requestAnimationFrame(loop); }

  // startGame(true) intenta continuar desde localStorage; si no hay save (o
  // está corrupto), cae a partida nueva sin romper nada — mismo botón sirve
  // para los dos casos si hace falta, aunque el HTML expone botones separados.
  function startGame(fromSave){
    document.getElementById("overlay").classList.add("play");
    closeDialog();
    const save = fromSave ? loadSaveData() : null;
    if(save){
      game.room=save.room; game.item=save.item;
      game.flags=Object.assign(defaultFlags(), save.flags);
      game.hp=save.hp; game.maxHp=save.maxHp; game.invuln=0;
      player.x=save.px; player.y=save.py; player.dir=save.dir; player.atk=0;
      introSeen=true; cutsceneSeen=true; // ya vio la intro y el cutscene en la partida original
      spawnRoom(); state="play";
      try{AC=AC||new (window.AudioContext||window.webkitAudioContext)(); AC.resume();}catch(e){}
      return;
    }
    game.room="plaza"; game.hp=game.maxHp; game.invuln=0;
    game.flags=defaultFlags();
    clearSave();
    player.x=rooms.plaza.spawn.x; player.y=rooms.plaza.spawn.y; player.dir=0; player.atk=0;
    cutsceneSeen=false;
    spawnRoom(); state="play";
    try{AC=AC||new (window.AudioContext||window.webkitAudioContext)(); AC.resume();}catch(e){}
    introSeen=true;
    openDialog("Carta del Obispo","Roma manda martillos, no explicaciones. Este pueblo reportó un pozo que habla de noche. El Padre local te va a decir qué hacer. Hacé lo que diga. No preguntes por qué el manual dice lo que dice.");
  }
  document.getElementById("overlay").style.backgroundImage="url('assets/title.jpg')";
  document.getElementById("btnGo").onclick=()=>{ if(IS_TOUCH) tryLockLandscape(); startGame(false); };
  const btnContinue=document.getElementById("btnContinue");
  if(hasSave()){
    btnContinue.style.display="inline-block";
    btnContinue.onclick=()=>{ if(IS_TOUCH) tryLockLandscape(); startGame(true); };
    document.getElementById("btnGo").textContent="Nueva partida"; // ya hay un save — aclarar que este botón lo pisa
  }
  loadAll(()=>loop());
})();
