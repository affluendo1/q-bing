
 (() => {
// ===================== Storage =====================
const LS_KEY = "qb_v3";
// NEW schema (sessions own puzzle + banish zone)
const LS_OLD = "qb_v2";
// migration path
const SIDEBAR_KEY = "qb_sidebar_collapsed"; const THEME_KEY = "qb_theme";
const DEFAULT_SETTINGS = {
  holdMs:550, runningDp:1, finalDp:3,
  zenAutoEnter:false, zenAutoExit:false,
  pbFeedbackMode:"color+anim", pbScope:"session",
  scrambleLengthMode:"default", scrambleMoveCount:25, multiBlindCount:2, megaLines:7, megaPerLine:10,
  scrambleAutoHide:false, scrambleHideStyle:"fade",
  scrambleWrap:true, scrambleMonospace:true,
  scrambleAfterStop:true, scrambleManualOnly:false,
  scrambleCopyFormat:"moves", showStatsOnTimer:true, timerShowScramble:true,
  showAo5:true, showAo12:true, showAo50:true, showAo100:true,
  dnfHandling:"wca", statsPrecision:3,
  disableKeysWhileRunning:false, preventAccidentalRestart:true, touchMode:false,
  animations:true, reducedMotion:false, theme:"dark", spacingScale:"normal",
  uiFont:"system", timerFont:"system",
  defaultSessionNaming:"sessionN", autoCreateOnPuzzleSwitch:false,
  sessionSorting:"active", sessionArchive:false,
  manualEntryEnabled:false, manualEntryHotkey:"t",
  inspectionEnabled:false, inspectionSeconds:15, inspectionOvertime:2
};
// ===================== Scramble Engine (semi-accurate) =====================
// Helpers
function randInt(n){ return (Math.random() * n) | 0; } function choice(arr){ return arr[randInt(arr.length)]; } 
// Build a scramble with: // - fixed length // - no same face twice in a row // - no 3 moves in a row on the same axis
function buildScramble({ length, facesByAxis, suffixes }) {
const moves = [];
let lastFace = null;
let lastAxis = null;
let axisStreak = 0;
for(let i=0; i<length; i++){
const axes = Object.keys(facesByAxis);
// pick axis (prevent 3-in-a-row axis spam)
let axis = null;
for(let tries=0; tries<80; tries++){
const a = choice(axes);
const wouldStreak = (a === lastAxis) ? (axisStreak + 1) : 1;
if(wouldStreak >= 3) continue;
axis = a;
break;
}
if(!axis) axis = axes[0];
// pick face (prevent repeating face)
const faces = facesByAxis[axis];
let face = null;
for(let tries=0; tries<80; tries++){
const f = choice(faces);
if(f === lastFace) continue;
face = f;
break;
}
if(!face) face = faces[0];
moves.push(face + choice(suffixes));
// update streak
if(axis === lastAxis) axisStreak++;
else axisStreak = 1;
lastAxis = axis;
lastFace = face;
}
return moves.join(" "); }
// ---------- NxN ----------
function scrambleNxN(n){
// Defaults aligned with common timer expectations
// (WCA official is TNoodle-based, but these are very close for general use.)
const defaultLen = ({
2: 9,
3: 25,
4: 40,
5: 60,
6: 80,
7: 100
})[n] || 25;
const len = getScrambleLen(`n${n}`, defaultLen);
// Faces: for 4+ include wide turns; for 5+ include 3w turns
const suffixes = ["", "'", "2"];
const facesByAxis = { UD: ["U","D"], RL: ["R","L"], FB: ["F","B"] };
if(n >= 4){
facesByAxis.UD = ["U","D","Uw","Dw"];
facesByAxis.RL = ["R","L","Rw","Lw"];
facesByAxis.FB = ["F","B","Fw","Bw"];
}
if(n >= 5){
// 3-layer wide turns for 5x5, 6x6, 7x7 (approx standard notation)
facesByAxis.UD = facesByAxis.UD.concat(["3Uw","3Dw"]);
facesByAxis.RL = facesByAxis.RL.concat(["3Rw","3Lw"]);
facesByAxis.FB = facesByAxis.FB.concat(["3Fw","3Bw"]);
}
// For 4x4+ we should avoid base-face repeats (R vs Rw vs 3Rw all count as R)
if(n >= 4){
const moves = [];
let lastAxis = null;
let axisStreak = 0;
let lastBase = null;
const axes = Object.keys(facesByAxis);
const baseOf = (face) => face.replace("w","").replace("3","").replace("U","U").replace("D","D")
.replace("R","R").replace("L","L").replace("F","F").replace("B","B")
.charAt(0);
for(let i=0; i<len; i++){
let axis = null;
for(let tries=0; tries<120; tries++){
const a = choice(axes);
const wouldStreak = (a === lastAxis) ? (axisStreak + 1) : 1;
if(wouldStreak >= 3) continue;
axis = a;
break;
}
if(!axis) axis = axes[0];
const faces = facesByAxis[axis];
let face = null;
for(let tries=0; tries<140; tries++){
const f = choice(faces);
const base = baseOf(f);
if(base === lastBase) continue;
face = f;
break;
}
if(!face) face = faces[0];
moves.push(face + choice(suffixes));
lastBase = baseOf(face);
if(axis === lastAxis) axisStreak++;
else axisStreak = 1;
lastAxis = axis;
}
return moves.join(" ");
}
// 2x2 / 3x3 can use generic builder
return buildScramble({ length: len, facesByAxis, suffixes }); }
// ---------- Pyraminx ----------
function scramblePyra(){
const len = getScrambleLen("pyra", 11);
const main = [];
let last = null;
for(let i=0; i<len; i++){
let face = null;
for(let tries=0; tries<60; tries++){
const f = choice(["U","L","R","B"]);
if(f === last) continue;
face = f;
break;
}
if(!face) face = "U";
const suf = choice(["", "'"]);
main.push(face + suf);
last = face;
}
function tip(letter){
const r = randInt(3);
if(r === 0) return "";
if(r === 1) return letter;
return letter + "'";
}
const tips = [tip("u"), tip("l"), tip("r"), tip("b")].filter(Boolean);
return main.concat(tips).join(" "); }
// ---------- Skewb (approx) ----------
function scrambleSkewb(){
const len = getScrambleLen("skewb", 11);
const moves = [];
let last = null;
const faces = ["R","L","U","B"]; // common skewb move set
for(let i=0; i<len; i++){
let f = choice(faces);
for(let t=0; t<50 && f === last; t++) f = choice(faces);
moves.push(f + choice(["", "'"]));
last = f;
}
return moves.join(" "); }
// ---------- Megaminx (approx) ----------
function scrambleMega(){
// Common display: 7 lines of 10 moves (R++ D-- etc.), last line sometimes fewer
// We'll do 7 lines x 10 = 70 tokens-ish (close enough for timers)
const lines = clamp(parseInt(getSetting("megaLines") || "7", 10) || 7, 4, 10);
const perLine = clamp(parseInt(getSetting("megaPerLine") || "10", 10) || 10, 6, 12);
const moveR = ["R++","R--"];
const moveD = ["D++","D--"];
const out = [];
for(let i=0; i<lines; i++){
const row = [];
for(let j=0; j<perLine; j++){
row.push(choice(moveR));
row.push(choice(moveD));
}
out.push(row.join(" "));
}
return out.join("\n"); }
// ---------- Square-1 (approx) ----------
function scrambleSq1(){
// Produces tuples (a,b) / ... like typical Sq-1 scrambles.
// Constraints: keep a,b in [-5..6] and avoid (0,0) spam.
const len = getScrambleLen("sq1", 12);
const parts = [];
for(let i=0; i<len; i++){
let a = randInt(12) - 5; // -5..6
let b = randInt(12) - 5;
// avoid (0,0) too often
if(a === 0 && b === 0){
if(randInt(2) === 0) a = 1;
else b = -1;
}
parts.push(`(${a},${b})`);
parts.push(`/`);
}
// remove trailing slash sometimes for variety
if(randInt(3) === 0) parts.pop();
return parts.join(" "); }
// ---------- Clock (approx) ----------
function scrambleClock(){
// Real clock scrambles are very structured with pins + wheel turns.
// This is a "looks right, works for practice" generator.
const pins = ["UR","UL","DR","DL"];
const wheel = ["U","R","D","L","ALL"];
const turns = ["0","1","2","3","4","5","6"];
const pinState = () => pins.map(p => `${p}${choice(["+","-"])}`).join(" ");
const wheelTurn = () => `${choice(wheel)}${choice(["+","-"])}${choice(turns)}`;
const out = [];
out.push(pinState());
for(let i=0; i<12; i++) out.push(wheelTurn());
out.push("y2");
out.push(pinState());
for(let i=0; i<12; i++) out.push(wheelTurn());
return out.join(" "); }
// ---------- FMC ----------
function scrambleFMC(){
// FMC uses official scrambles, but timers usually just show a 3x3 scramble.
// We'll generate a 3x3 scramble and label the event as FMC.
return scrambleNxN(3); }
// ---------- MultiBLD (rows of 3BLD scrambles) ----------
function scrambleMultiBLD(count){
const n = clamp(parseInt(count, 10) || 2, 1, 50); // don't let someone request 9000 and nuke DOM
const scr = [];
for(let i=0; i<n; i++){
scr.push(scrambleNxN(3));
}
return scr.join("\n"); // "rows" exactly as requested
}
// ---------- Default lengths + length mode ----------
function getDefaultLen(puzzleKey){
// puzzleKey can be "n3", "pyra", etc.
const defaults = {
n2: 9,
n3: 25,
n4: 40,
n5: 60,
n6: 80,
n7: 100,
pyra: 11,
skewb: 11,
mega: 70,
// not used directly; mega uses lines/perLine
sq1: 12,
clock: 24,
// not used directly; clock is structured
fmc: 25,
bld3: 25,
bld4: 40,
bld5: 60,
mbld: 0,
// handled separately
oh: 25
};
return defaults[puzzleKey] ?? 25; }
function getScrambleLen(puzzleKey, fallbackDefault){
const def = fallbackDefault ?? getDefaultLen(puzzleKey);
if(getSetting("scrambleLengthMode") === "custom"){
const v = clamp(parseInt(getSetting("scrambleMoveCount"),10) || def, 5, 200);
return v;
}
return def; }
// ---------- Puzzle registry (ALL WCA EVENTS) ----------
const WCA_EVENTS = {
// NxN
"222": { label:"2×2", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(2), lenKey:"n2" },
"333": { label:"3×3", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(3), lenKey:"n3" },
"444": { label:"4×4", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(4), lenKey:"n4" },
"555": { label:"5×5", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(5), lenKey:"n5" },
"666": { label:"6×6", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(6), lenKey:"n6" },
"777": { label:"7×7", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(7), lenKey:"n7" },
// BLD
"333bf": { label:"3×3 BLD", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(3), lenKey:"bld3" },
"444bf": { label:"4×4 BLD", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(4), lenKey:"bld4" },
"555bf": { label:"5×5 BLD", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(5), lenKey:"bld5" },
// MultiBLD
"333mbf": { label:"MultiBLD", scrLabel:"MULTI SCRAMBLES", gen: () => {
const c = getSetting("multiBlindCount") || 2;
return scrambleMultiBLD(c);
}, lenKey:"mbld" },
// OH
"333oh": { label:"3×3 OH", scrLabel:"SCRAMBLE", gen: () => scrambleNxN(3), lenKey:"oh" },
// FMC
"333fm": { label:"3×3 FMC", scrLabel:"SCRAMBLE", gen: () => scrambleFMC(), lenKey:"fmc" },
// Other WCA puzzles
"clock": { label:"Clock", scrLabel:"SCRAMBLE", gen: () => scrambleClock(), lenKey:"clock" },
"mega": { label:"Megaminx", scrLabel:"SCRAMBLE", gen: () => scrambleMega(), lenKey:"mega" },
"pyra": { label:"Pyraminx", scrLabel:"SCRAMBLE", gen: () => scramblePyra(), lenKey:"pyra" },
"skewb": { label:"Skewb", scrLabel:"SCRAMBLE", gen: () => scrambleSkewb(), lenKey:"skewb" },
"sq1": { label:"Square-1", scrLabel:"SCRAMBLE", gen: () => scrambleSq1(), lenKey:"sq1" }, };
const PUZZLES = Object.entries(WCA_EVENTS).map(([key, p]) => ({
key,
label: p.label,
scrambleLabel: p.scrLabel || "SCRAMBLE" }));
// initiate puzzle filter state.puzzleFilter = new Set(PUZZLES.map(p => p.key));
// Public entry
function genScrambleFor(puzzleKey){
const p = WCA_EVENTS[puzzleKey] || WCA_EVENTS["333"];
return p.gen(); }
// If your UI uses puzzleInfo(), update it to reference WCA_EVENTS
function puzzleInfo(puzzleKey){
const p = WCA_EVENTS[puzzleKey] || WCA_EVENTS["333"];
return {
key: puzzleKey,
label: p.label,
scrambleLabel: p.scrLabel || "SCRAMBLE",
lenKey: p.lenKey
}; }
// If you need the default length for settings display per puzzle:
function getDefaultLenForPuzzleKey(puzzleKey){
const p = WCA_EVENTS[puzzleKey] || WCA_EVENTS["333"];
// Mega/Clock are structured; still return something sane
return getDefaultLen(p.lenKey); }

const state = {
settings: null,
scramble: "",
solves: [],
banished: [],
sessions: [{ id:"s1", name:"Session 1", puzzle:"333" }],
currentSessionId: "s1",
// solves page ui
searchOpen: false,
searchQuery: "",
sortBy: "date",
sortDir: "desc",
fPenalty: false,
fComment: false,
puzzleFilter: new Set(PUZZLES.map(p=>p.key)), // (still allowed; applies inside current session)
// banish controls
forceBanishNext: false,
};
function getSetting(key){
return state.settings?.[key] ?? DEFAULT_SETTINGS[key];
}
const SETTING_OPTIONS={
  pbFeedbackMode:["color+anim","color","none"],pbScope:["session","puzzle"],
  scrambleLengthMode:["default","custom"],scrambleCopyFormat:["moves","label"],
  defaultSessionNaming:["sessionN","puzzleN"],sessionSorting:["active","recent","solves","puzzle","name"],
  theme:["dark","light"],uiFont:["system","arial","serif"],timerFont:["system","mono","serif"],
  spacingScale:["compact","normal","relaxed"]
};
const SETTING_RANGES={holdMs:[200,1200],runningDp:[0,3],finalDp:[0,3],inspectionSeconds:[5,30],inspectionOvertime:[0,5],scrambleMoveCount:[5,200],multiBlindCount:[1,50],megaLines:[4,10],megaPerLine:[6,12],statsPrecision:[0,3]};
function normalizeSetting(key,value){
  const fallback=DEFAULT_SETTINGS[key];
  if(value==null)return fallback;
  if(typeof fallback==="boolean"){
    if(value===true||value===1||value==="1"||String(value).toLowerCase()==="true")return true;
    if(value===false||value===0||value==="0"||String(value).toLowerCase()==="false")return false;
    return fallback;
  }
  if(SETTING_OPTIONS[key])return SETTING_OPTIONS[key].includes(value)?value:fallback;
  if(SETTING_RANGES[key]){
    const n=Number(value);if(!Number.isFinite(n))return fallback;
    return clamp(Math.round(n),SETTING_RANGES[key][0],SETTING_RANGES[key][1]);
  }
  if(key==="manualEntryHotkey")return String(value||fallback).trim().slice(0,1).toLowerCase()||fallback;
  return value;
}
function mergeDefaults(){
const stored=state.settings && typeof state.settings === "object" ? state.settings : {};
const legacyTheme=localStorage.getItem(THEME_KEY);
state.settings = { ...DEFAULT_SETTINGS, ...stored, theme:stored.theme || legacyTheme || DEFAULT_SETTINGS.theme };
Object.keys(DEFAULT_SETTINGS).forEach(key=>{state.settings[key]=normalizeSetting(key,state.settings[key]);});
}
function clamp(value, min, max){
return Math.max(min, Math.min(max, Number(value)));
}
function uid(){
return Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function puzzleInfo(key){
return PUZZLES.find(p=>p.key===key) || PUZZLES[0];
}
function currentSession(){
return state.sessions.find(s=>s.id===state.currentSessionId) || state.sessions[0];
}
function sessionName(id){
return (state.sessions.find(s=>s.id===id) || state.sessions[0]).name;
}
function sessionPuzzle(id){
return (state.sessions.find(s=>s.id===id) || state.sessions[0]).puzzle || "333";
} // ===================== Sessions Modal (FIXED) =====================
function toastSessions(msg){
if(!els.sessionsToast) return;
els.sessionsToast.textContent = msg;
els.sessionsToast.style.opacity = "1";
clearTimeout(toastSessions._t);
toastSessions._t = setTimeout(()=>{
if(!els.sessionsToast) return;
els.sessionsToast.style.opacity = "0.75";
}, 1400); } function renderSessionsSummary(){
if(!els.smTotalSessions) return;
const totalSessions = state.sessions.length;
const totalSolves = state.solves.length;
const cur = currentSession();
// rough localStorage usage estimate (bytes)
const raw = localStorage.getItem(LS_KEY) || "";
const bytes = raw.length;
const kb = (bytes / 1024).toFixed(1);
const mb = (bytes / (1024*1024)).toFixed(2);
els.smTotalSessions.textContent = String(totalSessions);
els.smTotalSolves.textContent = String(totalSolves);
els.smCurrentSession.textContent = `${cur.name} • ${puzzleInfo(cur.puzzle).label}`;
els.smStorage.textContent = bytes < 1024*1024 ? `${kb} KB` : `${mb} MB`; }
function openSessionsModal(){
if(mode==="running"||mode==="arming"||mode==="ready"||inspecting){toastSessions("Stop the timer before changing sessions.");return;}
try{ renderSessionsSummary?.(); } catch(e){ console.warn(e); }
try{ renderSessionListModal?.(); } catch(e){ console.warn(e); }
els.overlaySessions?.classList.add("open");
els.modalSessions?.classList.add("open");
setTimeout(()=> els.sessionsSearch?.focus(), 0); }
function closeSessionsModal(){
els.overlaySessions.classList.remove("open");
els.modalSessions.classList.remove("open"); } function sessionStats(sessionId){
const sess = state.sessions.find(s=>s.id===sessionId);
if(!sess) return { count:0, best:null, ao5:null, ao12:null, lastTs:0 };
const solves = state.solves
.filter(s => s.sessionId === sessionId && s.puzzle === sess.puzzle)
.sort((a,b)=> (a.ts||0) - (b.ts||0));
const eff = solves.map(effectiveMs);
const finite = eff.filter(x=>x !== Infinity);
const best = finite.length ? Math.min(...finite) : null;
// local helper: compute trimmed average on last n solves
function aoN(n){
if(solves.length < n) return null;
const window = solves.slice(-n).map(effectiveMs);
return wcaTrimAverage(window);
}
const lastTs = solves.length ? (solves[solves.length-1].ts || 0) : 0;
return {
count: solves.length,
best,
ao5: aoN(5),
ao12: aoN(12),
lastTs
}; } function safeName(s){
return (s || "").replace(/\s+/g," ").trim().slice(0,40) || "Session"; }
function renderSessionListModal(){
if(!els.sessionListModal) return;
// Clear container first
els.sessionListModal.innerHTML = "";
// Pull current controls
const sort = (getSetting("sessionSorting") || els.sessionsSort?.value || "active");
const q = (els.sessionsSearch?.value || "").trim().toLowerCase();
const list = state.sessions.slice().map(sess=>{
const st = sessionStats(sess.id);
return { sess, st };
});
function nameKey(x){ return (x.sess.name||"").toLowerCase(); }
function puzzleKey(x){ return (x.sess.puzzle||"").toLowerCase(); }
function recentKey(x){ return x.st.lastTs || 0; }
function solvesKey(x){ return x.st.count || 0; }
list.sort((a,b)=>{
if(sort === "active"){
const aa = a.sess.id === state.currentSessionId ? 1 : 0;
const bb = b.sess.id === state.currentSessionId ? 1 : 0;
if(aa !== bb) return bb - aa;
return recentKey(b) - recentKey(a);
}
if(sort === "recent") return recentKey(b) - recentKey(a);
if(sort === "solves") return solvesKey(b) - solvesKey(a);
if(sort === "puzzle") return puzzleKey(a).localeCompare(puzzleKey(b)) || nameKey(a).localeCompare(nameKey(b));
return nameKey(a).localeCompare(nameKey(b));
});
const filtered = list.filter(({sess})=>{
if(!q) return true;
const p = puzzleInfo(sess.puzzle).label.toLowerCase();
return (sess.name || "").toLowerCase().includes(q) || p.includes(q);
});
const visibleSessions = filtered.filter(({sess}) => getSetting("sessionArchive") || !sess.archived);
for(const {sess, st} of visibleSessions){
const card = document.createElement("div");
card.className = "sessCard" + (sess.archived ? " archivedCard" : ""); card.style.cursor = "pointer"; card.addEventListener("click", (e)=>{
// don't steal clicks from buttons/inputs/selects
const t = e.target;
if(t.closest("button, input, select, textarea, a")) return;
if(sess.archived){toastSessions("Restore this archived session first");return;}
state.currentSessionId = sess.id;lastStoppedId=null;
setScramble(genScrambleFor(sess.puzzle));
save();
refreshPuzzleUI();
rerenderAll();
renderSolvesPage();
renderSessionsSummary();
renderSessionListModal();
toastSessions("Switched ✅"); });
// LEFT
const left = document.createElement("div");
left.className = "sessLeft";
const top = document.createElement("div");
top.className = "sessTop";
const nameRow = document.createElement("div");
nameRow.className = "sessNameRow";
const nameInput = document.createElement("input");
nameInput.className = "sessNameInput";
nameInput.value = sess.name;
nameInput.title = "Rename session";
nameInput.addEventListener("change", ()=>{
sess.name = safeName(nameInput.value);
nameInput.value = sess.name;
save();
rerenderAll();
renderSolvesPage();
renderSessionsSummary();
renderSessionListModal();
toastSessions("Renamed ✅");
});
const badge = document.createElement("div");
badge.className = "sessBadge";
badge.textContent = `${puzzleInfo(sess.puzzle).label} • ${st.count} solve${st.count===1?"":"s"}${sess.id===state.currentSessionId?" • ACTIVE":""}`;
nameRow.appendChild(nameInput);
nameRow.appendChild(badge);
top.appendChild(nameRow);
left.appendChild(top);
const stats = document.createElement("div");
stats.className = "sessStats";
function statBox(k,v){
const d = document.createElement("div");
d.className = "sessStat";
d.innerHTML = `<div class="k">${k}</div><div class="v">${v}</div>`;
return d;
}
const last = st.lastTs ? new Date(st.lastTs).toLocaleString() : "—";
stats.appendChild(statBox("Best", fmtStat(st.best)));
stats.appendChild(statBox("Ao5", fmtStat(st.ao5)));
stats.appendChild(statBox("Ao12", fmtStat(st.ao12)));
stats.appendChild(statBox("Last solve", last));
left.appendChild(stats);
// RIGHT
const right = document.createElement("div");
right.className = "sessRight";
const actions = document.createElement("div");
actions.className = "sessActions";
const btnActive = document.createElement("button");
btnActive.className = "smallBtn primary";
btnActive.textContent = sess.archived ? "Archived" : (sess.id===state.currentSessionId) ? "Active ✅" : "Set active";
btnActive.disabled = !!sess.archived || (sess.id===state.currentSessionId);
btnActive.addEventListener("click", ()=>{
if(sess.archived)return;
state.currentSessionId = sess.id;lastStoppedId=null;
setScramble(genScrambleFor(sess.puzzle));
save();
refreshPuzzleUI();
rerenderAll();
renderSolvesPage();
renderSessionsSummary();
renderSessionListModal();
toastSessions("Switched ✅");
});
const btnArchive = document.createElement("button");
btnArchive.className = "smallBtn";
btnArchive.textContent = sess.archived ? "Unarchive" : "Archive";
btnArchive.disabled = !getSetting("sessionArchive") || (sess.id === state.currentSessionId && !sess.archived && state.sessions.filter(s=>!s.archived && s.id!==sess.id).length===0);
btnArchive.title = getSetting("sessionArchive") ? "Archive or restore this session" : "Enable session archive in Settings first";
btnArchive.addEventListener("click", ()=>{
  if(!getSetting("sessionArchive")) return;
  if(!sess.archived && sess.id === state.currentSessionId){
    const next = state.sessions.find(s=>s.id!==sess.id && !s.archived);
    if(!next){ toastSessions("Keep one active session ✅"); return; }
    state.currentSessionId = next.id;
    lastStoppedId = null;
    setScramble(genScrambleFor(next.puzzle));
  }
  sess.archived = !sess.archived;
  save(); refreshPuzzleUI(); rerenderAll(); renderSolvesPage(); renderSessionsSummary(); renderSessionListModal();
  toastSessions(sess.archived ? "Archived ✅" : "Restored ✅");
});
const puzSel = document.createElement("select");
puzSel.className = "sel";
puzSel.style.maxWidth = "220px";
puzSel.disabled=!!sess.archived;
for(const p of PUZZLES){
const opt = document.createElement("option");
opt.value = p.key;
opt.textContent = `Puzzle: ${p.label}`;
if(p.key === sess.puzzle) opt.selected = true;
puzSel.appendChild(opt);
}
puzSel.addEventListener("change", ()=>{
changeSessionPuzzle(sess, puzSel.value);
});
const btnDup = document.createElement("button");
btnDup.className = "smallBtn";
btnDup.textContent = "Duplicate";
btnDup.addEventListener("click", ()=> duplicateSession(sess));
const btnExport = document.createElement("button");
btnExport.className = "smallBtn";
btnExport.textContent = "Export";
btnExport.addEventListener("click", async ()=>{
const txt = exportSession(sess);
const ok = await copyText(txt);
toastSessions(ok ? "Session exported (copied) ✅" : "Clipboard blocked 🚫");
});
const btnReset = document.createElement("button");
btnReset.className = "smallBtn";
btnReset.textContent = "Reset solves";
btnReset.addEventListener("click", ()=> resetSessionSolves(sess));
const btnMerge = document.createElement("button");
btnMerge.className = "smallBtn";
btnMerge.textContent = "Merge…";
btnMerge.addEventListener("click", ()=>{
const targets = state.sessions.filter(s=>s.id!==sess.id);
const targetName = prompt(
`Merge "${sess.name}" INTO which session?\nType the exact name:\n\n${targets.map(s=>"- "+s.name).join("\n")}`,
targets[0]?.name || ""
);
if(!targetName) return;
const t = targets.find(s=>s.name===targetName);
if(!t){ alert("No match (must type exact name)."); return; }
mergeSessionInto(sess.id, t.id);
});
const btnDel = document.createElement("button");
btnDel.className = "smallBtn danger";
btnDel.textContent = "Delete";
btnDel.addEventListener("click", ()=> deleteSession(sess));
actions.appendChild(btnActive);
actions.appendChild(btnArchive);
actions.appendChild(btnDup);
actions.appendChild(btnExport);
actions.appendChild(btnMerge);
actions.appendChild(btnReset);
actions.appendChild(btnDel);
right.appendChild(puzSel);
right.appendChild(actions);
card.appendChild(left);
card.appendChild(right);
els.sessionListModal.appendChild(card);
}
if(!visibleSessions.length){
const d = document.createElement("div");
d.className = "emptyHint";
d.textContent = "No sessions match your search.";
els.sessionListModal.appendChild(d);
} }
// ===================== Session actions + backup =====================
async function copyText(text){
  try{ await navigator.clipboard.writeText(String(text)); return true; }catch{}
  const area=document.createElement("textarea"); area.value=String(text); area.style.position="fixed"; area.style.opacity="0";
  document.body.appendChild(area); area.select(); let ok=false; try{ ok=document.execCommand("copy"); }catch{} area.remove(); return ok;
}
function exportSession(sess){
  const session=sess || currentSession();
  return JSON.stringify({type:"q-bing-session",version:3,exportedAt:new Date().toISOString(),session,solves:state.solves.filter(s=>s.sessionId===session.id)},null,2);
}
function exportAll(){
  return JSON.stringify({type:"q-bing-backup",version:3,exportedAt:new Date().toISOString(),data:{scramble:state.scramble,solves:state.solves,banished:state.banished,sessions:state.sessions,currentSessionId:state.currentSessionId,settings:state.settings}},null,2);
}
function importPackFromText(text){
  let parsed; try{ parsed=JSON.parse(text); }catch{ return {ok:false,msg:"That is not valid JSON."}; }
  const payload=parsed?.data && typeof parsed.data==="object" ? parsed.data : parsed;
  let importedSessions=Array.isArray(payload.sessions)?payload.sessions.slice():[];
  let importedSolves=Array.isArray(payload.solves)?payload.solves.slice():[];
  if(payload.session && typeof payload.session==="object") importedSessions=[payload.session];
  if(!importedSessions.length && !importedSolves.length) return {ok:false,msg:"No sessions or solves were found in that backup."};
  const idMap=new Map();
  for(const incoming of importedSessions){
    const puzzle=PUZZLES.some(p=>p.key===incoming.puzzle)?incoming.puzzle:"333";
    const id=uid(); idMap.set(incoming.id,id);
    state.sessions.push({id,name:safeName(incoming.name),puzzle,archived:!!incoming.archived});
  }
  const validSessionIds=new Set(state.sessions.map(x=>x.id));
  for(const incoming of importedSolves){
    const mapped=idMap.get(incoming.sessionId) || (validSessionIds.has(incoming.sessionId)?incoming.sessionId:state.currentSessionId);
    const puzzle=sessionPuzzle(mapped);
    const ms=Number(incoming.ms);
    if(!Number.isFinite(ms) || ms<0) continue;
    state.solves.push({...incoming,id:uid(),ms:Math.round(ms),sessionId:mapped,puzzle,dnf:!!incoming.dnf,plus2:!incoming.dnf && !!incoming.plus2,ts:Number(incoming.ts)||Date.now()});
  }
  if(Array.isArray(payload.banished)) state.banished.push(...payload.banished.map(x=>({...x,id:uid()})));
  if(payload.settings && typeof payload.settings==="object") state.settings={...state.settings,...payload.settings};
  if(!state.sessions.length) state.sessions=[{id:"s1",name:"Session 1",puzzle:"333",archived:false}];
  mergeDefaults(); save();
  return {ok:true,msg:`Imported ${importedSessions.length} session${importedSessions.length===1?"":"s"} and ${importedSolves.length} solve${importedSolves.length===1?"":"s"}.`};
}
function duplicateSession(sess){
  const copy={...sess,id:uid(),name:safeName(`${sess.name} copy`),archived:false};
  state.sessions.push(copy);
  const copies=state.solves.filter(s=>s.sessionId===sess.id).map(s=>({...s,id:uid(),sessionId:copy.id,puzzle:copy.puzzle,ts:Number(s.ts)||Date.now()}));
  state.solves.push(...copies); state.currentSessionId=copy.id; lastStoppedId=null;
  setScramble(genScrambleFor(copy.puzzle)); save(); refreshPuzzleUI(); rerenderAll(); renderSolvesPage(); renderSessionsSummary(); renderSessionListModal(); toastSessions("Session duplicated ✅");
}
function resetSessionSolves(sess){
  if(!confirm(`Reset ${sess.name}? This deletes all solves in this session.`)) return;
  state.solves=state.solves.filter(s=>s.sessionId!==sess.id); if(sess.id===state.currentSessionId) lastStoppedId=null;
  save(); rerenderAll(); renderSolvesPage(); renderSessionsSummary(); renderSessionListModal(); toastSessions("Session reset ✅");
}
function mergeSessionInto(sourceId,destId){
  const source=state.sessions.find(s=>s.id===sourceId), dest=state.sessions.find(s=>s.id===destId);
  if(!source||!dest||sourceId===destId) return;
  for(const solve of state.solves) if(solve.sessionId===sourceId){solve.sessionId=destId;solve.puzzle=dest.puzzle;}
  state.sessions=state.sessions.filter(s=>s.id!==sourceId);
  if(state.currentSessionId===sourceId) state.currentSessionId=destId;
  lastStoppedId=null; setScramble(genScrambleFor(currentSession().puzzle)); save(); refreshPuzzleUI(); rerenderAll(); renderSolvesPage(); renderSessionsSummary(); renderSessionListModal(); toastSessions("Sessions merged ✅");
}
function deleteSession(sess){
  if(state.sessions.length<=1){alert("Keep at least one session.");return;}
  if(!confirm(`Delete ${sess.name} and its solves?`)) return;
  state.sessions=state.sessions.filter(s=>s.id!==sess.id); state.solves=state.solves.filter(s=>s.sessionId!==sess.id);
  if(state.currentSessionId===sess.id){state.currentSessionId=state.sessions.find(s=>!s.archived)?.id || state.sessions[0].id;setScramble(genScrambleFor(currentSession().puzzle));}
  lastStoppedId=null; save(); refreshPuzzleUI(); rerenderAll(); renderSolvesPage(); renderSessionsSummary(); renderSessionListModal(); toastSessions("Session deleted ✅");
}
function changeSessionPuzzle(sess,newPuzzle){
  if(!PUZZLES.some(p=>p.key===newPuzzle)||newPuzzle===sess.puzzle) return;
  if(getSetting("autoCreateOnPuzzleSwitch")){
    const next={id:uid(),name:safeName(`${sess.name} • ${puzzleInfo(newPuzzle).label}`),puzzle:newPuzzle,archived:false};
    state.sessions.push(next); state.currentSessionId=next.id;
  }else{
    sess.puzzle=newPuzzle;
    for(const solve of state.solves) if(solve.sessionId===sess.id) solve.puzzle=newPuzzle;
    state.currentSessionId=sess.id;
  }
  lastStoppedId=null; setScramble(genScrambleFor(newPuzzle)); save(); refreshPuzzleUI(); rerenderAll(); renderSolvesPage(); renderSessionsSummary(); renderSessionListModal();
}
function downloadText(filename,text){
  const blob=new Blob([text],{type:"application/json"}); const a=document.createElement("a");
  a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),400);
}
function bindDataControls(){
  document.getElementById("btnExportSession")?.addEventListener("click",async()=>{const ok=await copyText(exportSession(currentSession()));if(!ok)downloadText("qb-session.json",exportSession(currentSession()));toastSessions(ok?"Session backup copied ✅":"Session backup downloaded ✅");});
  document.getElementById("btnExportAll")?.addEventListener("click",async()=>{const txt=exportAll();const ok=await copyText(txt);if(!ok)downloadText("qb-backup.json",txt);toastSessions(ok?"Full backup copied ✅":"Full backup downloaded ✅");});
  document.getElementById("btnOpenImporter")?.addEventListener("click",()=>{openSessionsModal();setTimeout(()=>{els.sessionsImportText?.scrollIntoView({behavior:"smooth",block:"center"});els.sessionsImportText?.focus();},80);});
  document.getElementById("btnResetApp")?.addEventListener("click",()=>{if(!confirm("Reset the app and delete all saved sessions, solves, and settings?"))return;localStorage.removeItem(LS_KEY);localStorage.removeItem(LS_OLD);location.reload();});
}
// ===================== Migration / Load / Save =====================
function save(){
localStorage.setItem(LS_KEY, JSON.stringify({
scramble: state.scramble,
solves: state.solves,
banished: state.banished,
sessions: state.sessions,
currentSessionId: state.currentSessionId,
settings: state.settings || DEFAULT_SETTINGS,
}));
setSaved(true);
}
function normalizeSessionsWithPuzzle(data){
// If old sessions exist without puzzle, assign from old global puzzle or infer from solves
const sessions = Array.isArray(data.sessions) && data.sessions.length
? data.sessions.map(s => ({ id:s.id, name:s.name || "Session", puzzle:s.puzzle, archived:!!s.archived }))
: [{ id:"s1", name:"Session 1", puzzle:(data.puzzle || "333") }];
// Fill missing puzzles
for(const sess of sessions){
if(sess.puzzle) continue;
// infer from first solve in that session
const firstSolve = (Array.isArray(data.solves) ? data.solves : []).find(x => x.sessionId === sess.id && x.puzzle);
sess.puzzle = firstSolve?.puzzle || data.puzzle || "333";
}
// ensure at least one session
if(!sessions.length) sessions.push({ id:"s1", name:"Session 1", puzzle:(data.puzzle || "333") });
// ensure currentSessionId exists
let currentSessionId = data.currentSessionId || sessions[0].id;
if(!sessions.some(s=>s.id===currentSessionId)) currentSessionId = sessions[0].id;
return { sessions, currentSessionId };
}
function load(){
// Try new key first
const rawNew = localStorage.getItem(LS_KEY);
if(rawNew){
try{
const data = JSON.parse(rawNew);
if(data && typeof data === "object"){
state.scramble = data.scramble || "";
state.solves = Array.isArray(data.solves) ? data.solves : [];
state.banished = Array.isArray(data.banished) ? data.banished : [];
state.settings = data.settings && typeof data.settings === "object" ? data.settings : {};
state.sessions = Array.isArray(data.sessions) && data.sessions.length ? data.sessions : state.sessions;
state.currentSessionId = data.currentSessionId || state.sessions[0].id;
// safety: ensure every session has puzzle
for(const s of state.sessions){
if(!s.puzzle) s.puzzle = "333";
}
if(!state.sessions.some(s=>s.id===state.currentSessionId)) state.currentSessionId = state.sessions[0].id;
return;
}
}catch{}
}
// Migrate old key if present
const rawOld = localStorage.getItem(LS_OLD);
if(rawOld){
try{
const data = JSON.parse(rawOld);
if(data && typeof data === "object"){
state.scramble = data.scramble || "";
state.solves = Array.isArray(data.solves) ? data.solves : [];
state.banished = []; // old had none
state.settings = data.settings && typeof data.settings === "object" ? data.settings : {};
const norm = normalizeSessionsWithPuzzle(data);
state.sessions = norm.sessions;
state.currentSessionId = norm.currentSessionId;
// write migrated version
save();
return;
}
}catch{}
}
}
// ===================== Elements =====================
const appEl = document.querySelector(".app");
const btnToggle = document.getElementById("btnSideToggle");
const btnOpen = document.getElementById("btnSideOpen");
const tabs = Array.from(document.querySelectorAll(".tab"));
const pages = {
timer: document.getElementById("page-timer"),
solves: document.getElementById("page-solves"),
stats: document.getElementById("page-stats"),
settings: document.getElementById("page-settings"),
};
const els = {
// timer
scramble: document.getElementById("scramble"),
scrambleWrap: document.querySelector(".scrambleWrap"),
btnManualEntry: document.getElementById("btnManualEntry"),
inspectionPill: document.getElementById("inspectionPill"),
scrLabelText: document.getElementById("scrLabelText"),
puzzleText: document.getElementById("puzzleText"),
btnNewScramble: document.getElementById("btnNewScramble"),
btnCopyScramble: document.getElementById("btnCopyScramble"),
savePill: document.getElementById("savePill"),
time: document.getElementById("time"),
statePill: document.getElementById("statePill"),
sessionPill: document.getElementById("sessionPill"),
tbody: document.getElementById("tbody"),
best: document.getElementById("best"),
ao5: document.getElementById("ao5"),
ao12: document.getElementById("ao12"),
rowAo5: document.getElementById("rowAo5"),
rowAo12: document.getElementById("rowAo12"),
ao50: document.getElementById("ao50"),
ao100: document.getElementById("ao100"),
rowAo50: document.getElementById("rowAo50"),
rowAo100: document.getElementById("rowAo100"), btnThemeRail: document.getElementById("btnThemeRail"), btnThemeSide: document.getElementById("btnThemeSide"),
btnPlus2: document.getElementById("btnPlus2"),
btnDNF: document.getElementById("btnDNF"),
btnDeleteLast: document.getElementById("btnDeleteLast"),
btnReset: document.getElementById("btnReset"),
prev: document.getElementById("prev"),
prevDelta: document.getElementById("prevDelta"),
// solves page
solvesSessionCount: document.getElementById("solvesSessionCount"),
solvesSessionName: document.getElementById("solvesSessionName"),
solveGrid: document.getElementById("solveGrid"),
emptyHint: document.getElementById("emptyHint"),
btnSearch: document.getElementById("btnSearch"),
btnSort: document.getElementById("btnSort"),
searchWrap: document.getElementById("searchWrap"),
searchInput: document.getElementById("searchInput"),
btnSearchClose: document.getElementById("btnSearchClose"),
sortPopover: document.getElementById("sortPopover"),
sortBy: document.getElementById("sortBy"),
sortDir: document.getElementById("sortDir"),
fPenalty: document.getElementById("fPenalty"),
fComment: document.getElementById("fComment"),
puzzleChips: document.getElementById("puzzleChips"),
btnClearFilters: document.getElementById("btnClearFilters"),
btnClosePopover: document.getElementById("btnClosePopover"),
btnSessionsRail: document.getElementById("btnSessionsRail"),
btnSessionsSide: document.getElementById("btnSessionsSide"),
// solve modal
overlay: document.getElementById("overlay"),
modal: document.getElementById("modal"),
btnModalClose: document.getElementById("btnModalClose"),
mTitle: document.getElementById("mTitle"),
mSub: document.getElementById("mSub"),
mTime: document.getElementById("mTime"),
mPuzzle: document.getElementById("mPuzzle"),
mDate: document.getElementById("mDate"),
mScramble: document.getElementById("mScramble"),
btnStatusOK: document.getElementById("btnStatusOK"),
btnStatusPlus2: document.getElementById("btnStatusPlus2"),
btnStatusDNF: document.getElementById("btnStatusDNF"),
mSessionSel: document.getElementById("mSessionSel"),
btnCopyBoth: document.getElementById("btnCopyBoth"),
mComment: document.getElementById("mComment"),
btnDeleteSolve: document.getElementById("btnDeleteSolve"),
btnModalSave: document.getElementById("btnModalSave"),
// Sessions modal
overlaySessions: document.getElementById("overlaySessions"),
modalSessions: document.getElementById("modalSessions"),
btnSessionsCloseX: document.getElementById("btnSessionsCloseX"),
btnCloseSessionsFromModal: document.getElementById("btnCloseSessionsFromModal"),
btnNewSessionFromModal: document.getElementById("btnNewSessionFromModal"),
sessionListModal: document.getElementById("sessionListModal"),
sessionsSub: document.getElementById("sessionsSub"),
sessionsSearch: document.getElementById("sessionsSearch"),
sessionsSort: document.getElementById("sessionsSort"),
smTotalSessions: document.getElementById("smTotalSessions"),
smTotalSolves: document.getElementById("smTotalSolves"),
smCurrentSession: document.getElementById("smCurrentSession"),
smStorage: document.getElementById("smStorage"),
btnSessionsExportAll: document.getElementById("btnSessionsExportAll"),
btnSessionsImport: document.getElementById("btnSessionsImport"),
sessionsImportText: document.getElementById("sessionsImportText"),
btnSessionsDoImport: document.getElementById("btnSessionsDoImport"),
sessionsToast: document.getElementById("sessionsToast"),
overlaySession: document.getElementById("overlaySession"),
modalSession: document.getElementById("modalSession"),
btnSessionClose: document.getElementById("btnSessionClose"),
newSessionName: document.getElementById("newSessionName"),
newSessionPuzzle: document.getElementById("newSessionPuzzle"),
btnCreateSession: document.getElementById("btnCreateSession"),
// banish zone
overlayBanish: document.getElementById("overlayBanish"),
modalBanish: document.getElementById("modalBanish"),
btnBanishClose: document.getElementById("btnBanishClose"),
banishList: document.getElementById("banishList"),
btnBanishClear: document.getElementById("btnBanishClear"),
btnBanishExport: document.getElementById("btnBanishExport"),
}; function bindUI(){
// sessions modal close
els.overlaySessions?.addEventListener("click", closeSessionsModal);
els.btnSessionsCloseX?.addEventListener("click", closeSessionsModal);
els.btnCloseSessionsFromModal?.addEventListener("click", closeSessionsModal);
// open sessions modal from rail/sidebar/top pill
els.btnSessionsRail?.addEventListener("click", openSessionsModal);
els.btnSessionsSide?.addEventListener("click", openSessionsModal);
const keyOpenSessions = (e)=>{
if(e.key === "Enter" || e.key === " "){
e.preventDefault();
openSessionsModal();
}
};
els.btnSessionsRail?.addEventListener("keydown", keyOpenSessions);
els.btnSessionsSide?.addEventListener("keydown", keyOpenSessions);
els.sessionPill?.addEventListener("click", openSessionsModal);
els.sessionPill?.addEventListener("keydown", keyOpenSessions);
// list refresh controls
els.sessionsSearch?.addEventListener("input", renderSessionListModal);
// session sort persistence is handled by the delegated settings binder.
// sessions modal buttons
els.btnNewSessionFromModal?.addEventListener("click", ()=>{
closeSessionsModal();
openCreateSession();
});
els.btnSessionsExportAll?.addEventListener("click", async ()=>{
const txt = exportAll();
const ok = await copyText(txt);
toastSessions(ok ? "Exported ALL (copied) ✅" : "Clipboard blocked 🚫");
});
els.btnSessionsImport?.addEventListener("click", ()=>{
els.sessionsImportText?.scrollIntoView({ behavior:"smooth", block:"center" });
setTimeout(()=> els.sessionsImportText?.focus(), 250);
});
// ✅ FIXED: properly close this handler
els.btnSessionsDoImport?.addEventListener("click", ()=>{
const txt = els.sessionsImportText?.value || "";
const res = importPackFromText(txt);
if(!res.ok){
alert(res.msg);
return;
}
if(!state.sessions.length) state.sessions = [{ id:"s1", name:"Session 1", puzzle:"333" }];
if(!state.sessions.some(s=>s.id===state.currentSessionId)) state.currentSessionId = state.sessions[0].id;
mergeDefaults();applyAllSettings();syncAllSettingUI();updateSettingsDependencies();
save();
rerenderAll();
renderSolvesPage();
renderSessionsSummary();
renderSessionListModal();
toastSessions("Imported ✅");
});
// ✅ Theme buttons belong OUTSIDE the import handler
els.btnThemeRail?.addEventListener("click", toggleTheme);
els.btnThemeSide?.addEventListener("click", toggleTheme); }
// Wire session modal, rail, and theme controls after element lookup.
bindUI();
// ===================== Timer Focus Mode (JS-only, no CSS required) =====================
let timerFocusNodes = null;
function computeTimerFocusNodes(){
// Hide top-level blocks on the Timer page that do NOT contain the time element.
// This keeps the #time visible while hiding scramble, buttons, stats, table, etc.
if(!pages?.timer || !els?.time) return [];
const kids = Array.from(pages.timer.children || []);
return kids.filter(node => node && !node.contains(els.time));
}
function setTimerFocus(on){
const page = document.getElementById("page-timer");
if(!page) return;
page.classList.toggle("is-focus", !!on); }
// ===================== Sidebar Toggle =====================
function setCollapsed(on){
appEl.classList.toggle("is-collapsed", on);
localStorage.setItem(SIDEBAR_KEY, on ? "1" : "0");
requestAnimationFrame(syncTabIndicator);
}
function toggleCollapsed(){
setCollapsed(!appEl.classList.contains("is-collapsed"));
}
btnToggle?.addEventListener("click", toggleCollapsed);
btnOpen?.addEventListener("click", toggleCollapsed);
function keyToggle(e){
if(e.key === "Enter" || e.key === " "){
e.preventDefault();
toggleCollapsed();
}
}
btnToggle?.addEventListener("keydown", keyToggle);
btnOpen?.addEventListener("keydown", keyToggle);
// restore collapsed state
setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1"); applyTheme(localStorage.getItem(THEME_KEY) || "dark");
// ===================== Tabs / Pages =====================
function setActiveTab(name){
tabs.forEach(t => {
  const active=t.dataset.tab===name;
  t.classList.toggle("active",active);
  if(active)t.setAttribute("aria-current","page");else t.removeAttribute("aria-current");
});
Object.entries(pages).forEach(([k,el]) => el.classList.toggle("active", k === name));
requestAnimationFrame(syncTabIndicator);
if(name === "solves") renderSolvesPage();
if(name === "stats") renderStatsPage();
}
tabs.forEach(t => t.addEventListener("click", ()=> setActiveTab(t.dataset.tab)));
function syncTabIndicator(){
  const nav=document.querySelector(".topnav"),indicator=document.getElementById("tabIndicator"),active=nav?.querySelector(".tab.active");
  if(!nav||!indicator||!active)return;
  const navRect=nav.getBoundingClientRect(),tabRect=active.getBoundingClientRect();
  indicator.style.width=`${tabRect.width}px`;
  indicator.style.height=`${tabRect.height}px`;
  indicator.style.transform=`translate3d(${tabRect.left-navRect.left+nav.scrollLeft}px,-50%,0)`;
}
requestAnimationFrame(syncTabIndicator);
window.addEventListener("resize",()=>requestAnimationFrame(syncTabIndicator),{passive:true});
// ===================== Scramble UI hooks =====================
function genScrambleFor(puzzleKey){
const p = WCA_EVENTS[puzzleKey] || WCA_EVENTS["333"];
return p.gen();
}
function setScramble(s){
state.scramble = s;
els.scramble.textContent = s;
}
function refreshPuzzleUI(){
const sess = currentSession();
const p = puzzleInfo(sess.puzzle);
els.scrLabelText.textContent = p.scrambleLabel || "SCRAMBLE";
els.puzzleText.textContent = `Puzzle: ${p.label}`;
}
// ===================== Formatting =====================
function fmtTime(ms, dp = 3){
if(ms == null) return "—";
const total = Math.max(0, ms);
const sec = total / 1000;
if(sec < 60){
return sec.toFixed(dp);
}
const m = Math.floor(sec / 60);
const s = sec - m*60;
// seconds part: includes dot + dp digits
const width = 2 + 1 + dp; // "SS" + "." + dp
return `${m}:${s.toFixed(dp).padStart(width, "0")}`;
}
// DNF = Infinity internally (per your rules)
function effectiveMs(solve){
if(solve.dnf) return Infinity;
return solve.ms + (solve.plus2 ? 2000 : 0);
}
function solveLabel(s){
const eff = effectiveMs(s);
if(eff === Infinity) return "DNF";
return fmtTime(eff, clamp(parseInt(getSetting("finalDp"),10) ?? 3,0,3));
}
function fmtStat(ms){
if(ms == null) return "—";
if(ms === Infinity) return "DNF";
return fmtTime(ms, clamp(parseInt(getSetting("statsPrecision"),10) ?? 3,0,3));
}
function setMode(next){
els.statePill.classList.remove("ready","running","stopped");
els.statePill.classList.add(next);
els.statePill.innerHTML = `<span class="dot"></span>${next}`;
}
// ===================== Banishing =====================
function banishSolve(solve, reason="unknown"){
const payload = {
...solve,
banishReason: reason,
banishedAt: Date.now(),
};
state.banished.push(payload);
}
function renderBanishZone(){
els.banishList.innerHTML = "";
if(!state.banished.length){
const d = document.createElement("div");
d.className = "emptyHint";
d.textContent = "No banished solves. The void is currently unemployed.";
els.banishList.appendChild(d);
return;
}
// newest first
const list = state.banished.slice().sort((a,b)=> (b.banishedAt||0) - (a.banishedAt||0));
for(const s of list){
const row = document.createElement("div");
row.className = "solvePill";
row.style.display = "flex";
row.style.justifyContent = "space-between";
row.style.gap = "10px";
row.style.alignItems = "center";
const left = document.createElement("div");
left.style.display = "flex";
left.style.flexDirection = "column";
left.style.gap = "2px";
const title = document.createElement("div");
title.textContent = `${solveLabel(s)} • ${puzzleInfo(s.puzzle).label} • ${sessionName(s.sessionId)}`;
title.style.fontWeight = "600";
const meta = document.createElement("div");
meta.style.opacity = "0.8";
meta.style.fontSize = "12px";
const when = s.banishedAt ? new Date(s.banishedAt).toLocaleString() : "unknown time";
meta.textContent = `Reason: ${s.banishReason || "unknown"} • ${when}`;
left.appendChild(title);
left.appendChild(meta);
const right = document.createElement("button");
right.className = "ghostBtn";
right.textContent = "Copy";
right.addEventListener("click", async ()=>{
const txt = JSON.stringify(s, null, 2);
if(await copyText(txt)){
right.textContent = "Copied ✅";
setTimeout(()=> right.textContent = "Copy", 700);
}else{
alert("Clipboard copy blocked by browser permissions.");
}
});
row.appendChild(left);
row.appendChild(right);
els.banishList.appendChild(row);
}
}
function openBanish(){
renderBanishZone();
els.overlayBanish.classList.add("open");
els.modalBanish.classList.add("open");
}
function closeBanish(){
els.overlayBanish.classList.remove("open");
els.modalBanish.classList.remove("open");
}
els.overlayBanish.addEventListener("click", closeBanish);
els.btnBanishClose.addEventListener("click", closeBanish);
els.btnBanishClear.addEventListener("click", ()=>{
const ok = confirm("Clear the banish zone? (This only affects debug storage.)");
if(!ok) return;
state.banished = [];
save();
renderBanishZone();
});
els.btnBanishExport.addEventListener("click", async ()=>{
const txt = JSON.stringify({ banished: state.banished }, null, 2);
if(await copyText(txt)){
els.btnBanishExport.textContent = "Copied ✅";
setTimeout(()=> els.btnBanishExport.textContent = "Copy JSON", 800);
}else{
alert("Clipboard copy blocked by browser permissions.");
}
});
// ===================== Stats (session + puzzle only) =====================
function getActiveSolves(){
const sess = currentSession();
return state.solves.filter(s => s.sessionId === sess.id && s.puzzle === sess.puzzle).sort((a,b)=>(Number(a.ts)||0)-(Number(b.ts)||0));
}
function getPbSolves(puzzleKey=currentSession().puzzle){
  const sessionId=currentSession().id;
  return state.solves.filter(s=>s.puzzle===puzzleKey&&(getSetting("pbScope")==="puzzle"||s.sessionId===sessionId));
}
function wcaTrimAverage(msList){
// WCA-style trimming (remove best and worst)
if(msList.length < 5) return null;
const sorted = msList.slice().sort((a,b)=>a-b); // Infinity naturally at end
const trimmed = sorted.slice(1, sorted.length - 1);
if(trimmed.some(x => x === Infinity)) return Infinity; // DNF survives trimming => DNF average
const sum = trimmed.reduce((a,b)=>a+b,0);
return sum / trimmed.length;
}
function computeAo(n){
const solves = getActiveSolves();
if(solves.length < n) return null;
const window = solves.slice(-n).map(effectiveMs);
return wcaTrimAverage(window);
}
function refreshStats(){
const sess = currentSession();
const active = getActiveSolves();
const eff = active.map(effectiveMs);
const finite = eff.filter(x => x !== Infinity);
const best = finite.length ? Math.min(...finite) : null;
els.best.textContent = fmtStat(best);
els.ao5.textContent = fmtStat(computeAo(5));
els.ao12.textContent = fmtStat(computeAo(12));
if(els.rowAo5) els.rowAo5.style.display = getSetting("showAo5") ? "" : "none";
if(els.rowAo12) els.rowAo12.style.display = getSetting("showAo12") ? "" : "none";
const showAo50 = active.length >= 50;
const showAo100 = active.length >= 100;
els.rowAo50.style.display = showAo50 && getSetting("showAo50") ? "" : "none";
els.rowAo100.style.display = showAo100 && getSetting("showAo100") ? "" : "none";
els.ao50.textContent = showAo50 ? fmtStat(computeAo(50)) : "—";
els.ao100.textContent = showAo100 ? fmtStat(computeAo(100)) : "—";
// session pill shows current session + active count
els.sessionPill.textContent = `${sess.name}: ${active.length} solve${active.length===1?"":"s"}`;
// Prev + delta (within session)
if(active.length >= 1){
const prevEff = effectiveMs(active[active.length-1]);
els.prev.textContent = fmtStat(prevEff);
if(active.length >= 2){
const a = effectiveMs(active[active.length-1]);
const b = effectiveMs(active[active.length-2]);
if(a !== Infinity && b !== Infinity){
const delta = (a - b) / 1000;
const sign = delta > 0 ? "+" : "";
els.prevDelta.textContent = `(${sign}${delta.toFixed(2)})`;
} else {
els.prevDelta.textContent = "";
}
} else {
els.prevDelta.textContent = "";
}
} else {
els.prev.textContent = "—";
els.prevDelta.textContent = "";
}
}

function bestRollingAverage(n,solves=getActiveSolves()){
  let best=null;
  for(let end=n;end<=solves.length;end++){
    const average=wcaTrimAverage(solves.slice(end-n,end).map(effectiveMs));
    if(Number.isFinite(average)&&(best==null||average<best))best=average;
  }
  return best;
}
function statsChartMarkup(solves){
  const recent=solves.slice(-50), width=920, height=280, left=62, right=18, top=18, bottom=236;
  if(!recent.length)return '<div class="statsEmpty">Record a solve to see your trend here.</div>';
  const values=recent.map(effectiveMs), finite=values.filter(Number.isFinite);
  let min=finite.length?Math.min(...finite)/1000:0, max=finite.length?Math.max(...finite)/1000:1;
  if(max-min<0.5){const pad=Math.max(0.5,max*.05);min=Math.max(0,min-pad);max+=pad;}
  const x=i=>recent.length===1?(left+right+width-left-right)/2:left+i*(width-left-right)/Math.max(1,recent.length-1);
  const y=v=>bottom-(v-min)/(max-min)*(bottom-top);
  const points=values.map((value,i)=>({x:x(i),y:Number.isFinite(value)?y(value/1000):bottom,value,i,solve:recent[i]}));
  const ticks=4;
  let grid='';
  for(let i=0;i<=ticks;i++){
    const val=max-(max-min)*i/ticks, yy=top+(bottom-top)*i/ticks;
    grid+=`<line class="chartGrid" x1="${left}" y1="${yy}" x2="${width-right}" y2="${yy}"/><text x="${left-10}" y="${yy+4}" text-anchor="end">${val.toFixed(1)}s</text>`;
  }
  let lines='';
  for(let i=1;i<points.length;i++)if(Number.isFinite(values[i-1])&&Number.isFinite(values[i]))lines+=`<line class="chartLine" x1="${points[i-1].x}" y1="${points[i-1].y}" x2="${points[i].x}" y2="${points[i].y}"/>`;
  const circles=points.map(point=>{
    const cls=point.solve.dnf?'dnf':point.solve.plus2?'plus2':'';
    const label=point.solve.dnf?'DNF':fmtTime(effectiveMs(point.solve),2);
    return `<circle class="chartPoint ${cls}" cx="${point.x}" cy="${point.y}" r="4.5"><title>Solve ${point.i+1}: ${label}</title></circle>`;
  }).join('');
  const first=recent.length>50?solves.length-recent.length+1:1;
  const last=solves.length;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Recent solve times. ${recent.length} solves shown."><title>Recent solve times</title><desc>Effective solve times are shown in seconds. DNF solves sit at the bottom of the chart.</desc>${grid}${lines}${circles}<text x="${left}" y="262">#${first}</text><text x="${width-right}" y="262" text-anchor="end">#${last}</text></svg>`;
}
function renderStatsPage(){
  const root=document.getElementById("page-stats");if(!root)return;
  const solves=getActiveSolves(), effective=solves.map(effectiveMs), timed=effective.filter(Number.isFinite);
  const dnfs=solves.filter(s=>s.dnf).length, plus2s=solves.filter(s=>!s.dnf&&s.plus2).length;
  const mean=timed.length?timed.reduce((sum,value)=>sum+value,0)/timed.length:null;
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  const session=currentSession();
  set("statsSessionTitle",session.name||"Statistics");
  set("statsSubtitle",`${puzzleInfo(session.puzzle).label} · current session · ${solves.length} recorded solve${solves.length===1?"":"s"}`);
  set("statsCount",String(solves.length));
  set("statsCountNote",`${timed.length} timed · ${dnfs} DNF`);
  set("statsBest",fmtStat(timed.length?Math.min(...timed):null));
  set("statsMean",fmtStat(mean));
  set("statsMeanNote",timed.length?`From ${timed.length} timed solve${timed.length===1?"":"s"}; DNFs excluded`:"DNFs excluded");
  set("statsAo5",fmtStat(computeAo(5)));
  set("statsAo12",fmtStat(computeAo(12)));
  set("statsPenaltyCount",`${dnfs} / ${plus2s}`);
  set("statsChartCaption",solves.length?`Showing ${Math.min(50,solves.length)} of ${solves.length} · +2 included`:"No solves yet");
  const chart=document.getElementById("statsChart");if(chart)chart.innerHTML=statsChartMarkup(solves);
  const records=document.getElementById("statsRecords");
  if(records){
    records.replaceChildren();
    const rows=[
      ["Best Ao5",fmtStat(bestRollingAverage(5,solves)),`${Math.max(0,solves.length-4)} possible windows`],
      ["Best Ao12",fmtStat(bestRollingAverage(12,solves)),`${Math.max(0,solves.length-11)} possible windows`],
      ["+2 solves",String(plus2s),"Included in best single and averages"],
      ["DNF solves",String(dnfs),"One DNF can be trimmed from an average"],
      ["Latest solve",solves.length?solveLabel(solves[solves.length-1]):"—",solves.length?new Date(solves[solves.length-1].ts).toLocaleString():"No solve recorded"],
      ["Fastest raw time",fmtStat(solves.filter(s=>!s.dnf).length?Math.min(...solves.filter(s=>!s.dnf).map(s=>s.ms)):null),"Before any +2 penalty"]
    ];
    for(const [label,value,note] of rows){
      const card=document.createElement("article");card.className="statsRecord";
      const title=document.createElement("span");title.className="statsRecordLabel";title.textContent=label;
      const number=document.createElement("strong");number.textContent=value;
      const detail=document.createElement("small");detail.textContent=note;
      card.append(title,number,detail);records.appendChild(card);
    }
  }
}

function refreshTable(){
if(!els.tbody) return;
const active = getActiveSolves();
els.tbody.innerHTML = "";
for(let i=0;i<active.length;i++){
const s = active[i];
const t = solveLabel(s);
const tr = document.createElement("tr");
tr.innerHTML = `<td>${i+1}</td><td>${t}</td><td>${(s.scramble||"")}</td>`;
els.tbody.appendChild(tr);
}
}
// ===================== Saved pill =====================
function setSaved(ok){
els.savePill.textContent = ok ? "Saved ✅" : "Saving…";
els.savePill.style.opacity = ok ? "1" : "0.85";
}
// ===================== Timer Preferences (for future Settings) =====================
const timerPrefs = {
holdMs: 550,
// Stackmat-style hold time (0.55s)
colorNormal: "#ffffff",
// normal running/idle color
colorArming: "#ff3b3b",
// holding but not ready yet
colorReady:
"#1cff6a",
// held long enough (ready)
colorPB:
"#1cff6a",
// PB single highlight (can separate later)
};
function setTimeColor(kind){
if(!els.time)return;
const light=document.documentElement.dataset.theme==="light";
const colors=light?{arming:"#946100",ready:"#087744",pb:"#087744",normal:"#17152b"}:timerPrefs;
if(kind==="arming")els.time.style.color=colors.colorArming||colors.arming;
else if(kind==="ready")els.time.style.color=colors.colorReady||colors.ready;
else if(kind==="pb")els.time.style.color=colors.colorPB||colors.pb;
else els.time.style.color=colors.colorNormal||colors.normal;
}
// ===================== Timer mechanics =====================
let mode = "stopped";
let startPerf = 0;
let raf = 0;
let lastStoppedId = null;
let spaceDown = false;
// stackmat-style arming
let armTimeout = 0;
// timeout id for hold-to-ready
let lastStopWasPB = false;
let lastStopAt = 0;
let inspecting = false;
let inspectStart = 0;
let inspectRaf = 0;
let pendingInspectionPenalty = "none";
let touchBound = false;
// keeps timer green until next interaction
function clearArming(){
if(armTimeout) clearTimeout(armTimeout);
armTimeout = 0;
}
function beginArming(){
// When you touch the timer again, PB highlight should disappear immediately
lastStopWasPB = false;
els.time?.classList.remove("pbPulse");
setTimerFocus(true);
mode = "arming";
clearArming();
setTimeColor("arming");
armTimeout = setTimeout(()=>{
// only switch to ready if still holding and still arming
if(spaceDown && mode === "arming"){
mode = "ready";
setTimeColor("ready");
}
}, timerPrefs.holdMs);
}
// i dont need the pill anymore
if(els.statePill) els.statePill.style.display = "none";
function tick(){
const ms = performance.now() - startPerf;
els.time.textContent = fmtTime(ms, clamp(parseInt(getSetting("runningDp"),10) ?? 1,0,3));
raf = requestAnimationFrame(tick);
}
function startTimer(){
mode = "running";
if(pages.timer) pages.timer.classList.toggle("scramble-auto-hidden", !!getSetting("scrambleAutoHide"));
if(els.inspectionPill) els.inspectionPill.hidden = true;
startPerf = performance.now();
cancelAnimationFrame(raf);
setTimerFocus(true);
// ✅ keep only timer visible
setTimeColor("normal");
// normal colour when running
raf = requestAnimationFrame(tick);
}
function stopTimer(){
if(mode !== "running") return;
cancelAnimationFrame(raf);
const sess = currentSession();
const ms = performance.now() - startPerf;
const solve = {
id: uid(),
ms: Math.round(ms),
scramble: state.scramble,
plus2:false,
dnf:false,
comment:"",
puzzle: sess.puzzle,
sessionId: sess.id,
ts: Date.now()
};
applyPendingInspectionPenalty(solve);
// Determine PB *before* adding solve
const active = getPbSolves(sess.puzzle);
const finite = active.map(effectiveMs).filter(Number.isFinite);
const bestBefore = finite.length ? Math.min(...finite) : null;
const thisEff = effectiveMs(solve);
const isPB = thisEff !== Infinity && (bestBefore == null || thisEff < bestBefore);
// Shift+B+Z forces next solve into banish zone
if(state.forceBanishNext){
state.forceBanishNext = false;
banishSolve(solve, "manual banish (shift+b+z)");
lastStoppedId = null;
lastStopWasPB = false;
setTimeColor("normal");
} else {
// If a future bug ever creates impossible state (DNF +2), banish
if(solve.dnf && solve.plus2){
banishSolve(solve, "invalid modifiers (dnf+2)");
lastStoppedId = null;
lastStopWasPB = false;
setTimeColor("normal");
} else {
state.solves.push(solve);
lastStoppedId = solve.id;
lastStopWasPB = isPB;
const pbMode=getSetting("pbFeedbackMode");
setTimeColor(isPB && pbMode!=="none" ? "pb" : "normal");
els.time.classList.toggle("pbPulse",isPB && pbMode==="color+anim");
}
}
els.time.textContent = solveLabel(solve);
mode = "stopped";
lastStopAt = Date.now();
if(getSetting("scrambleAfterStop") && !getSetting("scrambleManualOnly")) setScramble(genScrambleFor(sess.puzzle));
else if(state.scramble) setScramble(state.scramble);
if(pages.timer) pages.timer.classList.remove("scramble-auto-hidden");
save();
setTimerFocus(false);
// ✅ bring UI back
rerenderAll();
}
function setReady(isReady){
if(isReady){
mode = "ready";
setMode("ready");
} else if(mode === "ready"){
mode = "stopped";
setMode("stopped");
}
}
// ===================== Timer buttons =====================
els.btnNewScramble.addEventListener("click", ()=>{
const sess = currentSession();
setScramble(genScrambleFor(sess.puzzle));
save();
});
els.btnCopyScramble.addEventListener("click", async ()=>{
const text=getSetting("scrambleCopyFormat")==="label" ? `${puzzleInfo(currentSession().puzzle).label}: ${state.scramble}` : state.scramble;
if(await copyText(text)){
els.savePill.textContent = "Copied 📋";
setTimeout(()=>setSaved(true), 700);
}else{
alert("Clipboard copy blocked by browser permissions.");
}
});
els.btnPlus2.addEventListener("click", ()=>{
if(!lastStoppedId) return;
const s=state.solves.find(x=>x.id===lastStoppedId),sess=currentSession();
if(!s||s.dnf||s.sessionId!==sess.id||s.puzzle!==sess.puzzle)return;
s.plus2=!s.plus2;
recomputePBForActiveSessionPuzzle();
save();rerenderAll();
});
els.btnDNF.addEventListener("click", ()=>{
if(!lastStoppedId) return;
const s=state.solves.find(x=>x.id===lastStoppedId),sess=currentSession();
if(!s||s.sessionId!==sess.id||s.puzzle!==sess.puzzle)return;
s.dnf=!s.dnf;
if(s.dnf)s.plus2=false;
recomputePBForActiveSessionPuzzle();
save();rerenderAll();
});
els.btnDeleteLast.addEventListener("click", ()=>{
const active=getActiveSolves(),latest=active[active.length-1];
if(!latest)return;
state.solves=state.solves.filter(s=>s.id!==latest.id);
if(lastStoppedId===latest.id)lastStoppedId=null;
lastStopWasPB=false;setTimeColor("normal");
save();rerenderAll();renderSolvesPage();
});
els.btnReset.addEventListener("click", ()=>{
const sess = currentSession();
const ok = confirm(`Reset ${sess.name}? This deletes all solves in this session (not other sessions).`);
if(!ok) return;
state.solves = state.solves.filter(s => s.sessionId !== sess.id);
lastStoppedId = null;
setScramble(genScrambleFor(sess.puzzle));
save();
rerenderAll();
renderSolvesPage();
});
// ===================== Sessions UI =====================
function nextSessionDefaultName(puzzleKey=currentSession().puzzle){
  if(getSetting("defaultSessionNaming")==="puzzleN"){
    const label=puzzleInfo(puzzleKey).label;
    const prefix=label+" ";
    const nums=state.sessions.map(s=>{const name=String(s.name||"");const suffix=name.startsWith(prefix)?name.slice(prefix.length):"";return /^\d+$/.test(suffix)?Number(suffix):0;});
    return `${label} ${Math.max(0,...nums)+1}`;
  }
  const nums=state.sessions.map(s=>(s.name||"").match(/^Session\s+(\d+)$/i)).filter(Boolean).map(m=>parseInt(m[1],10)).filter(Number.isFinite);
  return `Session ${(nums.length?Math.max(...nums):state.sessions.length)+1}`;
}
function buildNewSessionPuzzleSelect(){
els.newSessionPuzzle.innerHTML = "";
for(const p of PUZZLES){
const opt = document.createElement("option");
opt.value = p.key;
opt.textContent = p.label;
els.newSessionPuzzle.appendChild(opt);
}
els.newSessionPuzzle.value = currentSession()?.puzzle || "333";
}
function openCreateSession(){
if(mode==="running"||mode==="arming"||mode==="ready"||inspecting){toastSessions("Stop the timer before creating a session.");return;}
buildNewSessionPuzzleSelect();
els.newSessionName.value = nextSessionDefaultName();
els.overlaySession.classList.add("open");
els.modalSession.classList.add("open");
setTimeout(()=> els.newSessionName.focus(), 0);
}
function closeCreateSession(){
els.overlaySession.classList.remove("open");
els.modalSession.classList.remove("open");
}
els.overlaySession.addEventListener("click", closeCreateSession);
els.btnSessionClose.addEventListener("click", closeCreateSession);
els.btnCreateSession.addEventListener("click", ()=>{
const name = (els.newSessionName.value || "").trim() || nextSessionDefaultName();
const puzzle = els.newSessionPuzzle.value || "333";
const id = uid();
state.sessions.push({ id, name: name.slice(0,40), puzzle, archived:false });
lastStoppedId = null;
state.currentSessionId = id;
// new scramble for the new session
setScramble(genScrambleFor(puzzle));
save();
closeCreateSession();
refreshPuzzleUI();
rerenderAll();
renderSolvesPage();
});
// ===================== Solves: Search + Filter + Sort =====================
function parseQuery(q){
q = (q || "").trim();
if(!q) return ()=>true;
const m = q.match(/^([<>]=?|=)\s*([0-9]+(?:\.[0-9]+)?)$/);
if(m){
const op = m[1];
const num = parseFloat(m[2]);
return (solve)=>{
const eff = effectiveMs(solve);
if(eff === Infinity) return false;
const sec = eff / 1000;
if(op === "<") return sec < num;
if(op === "<=") return sec <= num;
if(op === ">") return sec > num;
if(op === ">=") return sec >= num;
return sec === num;
};
}
const n = q.match(/^[0-9]+(?:\.[0-9]+)?$/);
if(n){
const num = parseFloat(q);
const isIntish = Math.abs(num - Math.round(num)) < 1e-9 && !q.includes(".");
if(isIntish){
const lo = num;
const hi = num + 0.999999;
return (solve)=>{
const eff = effectiveMs(solve);
if(eff === Infinity) return false;
const sec = eff / 1000;
return sec >= lo && sec <= hi;
};
}
return (solve)=>{
const eff = effectiveMs(solve);
if(eff === Infinity) return false;
const sec = eff / 1000;
return Math.abs(sec - num) < 0.01;
};
}
const needle = q.toLowerCase();
return (solve)=>{
const p = puzzleInfo(solve.puzzle).label.toLowerCase();
const sess = sessionName(solve.sessionId).toLowerCase();
return (
(solve.scramble || "").toLowerCase().includes(needle) ||
(solve.comment || "").toLowerCase().includes(needle) ||
p.includes(needle) ||
sess.includes(needle)
);
};
}
function applyFilters(list){
const pred = parseQuery(state.searchQuery);
const sess = currentSession();
return list.filter(s=>{
if(s.sessionId !== sess.id) return false;
// current session only
if(s.puzzle !== sess.puzzle) return false;
// enforce: session puzzle only
if(!pred(s)) return false;
if(state.fPenalty && !s.plus2) return false;
if(state.fComment && !(s.comment && s.comment.trim())) return false;
if(!state.puzzleFilter.has(s.puzzle)) return false;
return true;
});
}
function applySort(list){
const dir = state.sortDir === "asc" ? 1 : -1;
const by = state.sortBy;
return list.slice().sort((a,b)=>{
if(by === "date"){
return (a.ts - b.ts) * dir;
}
const ta = effectiveMs(a);
const tb = effectiveMs(b);
if(ta === Infinity && tb === Infinity) return (a.ts - b.ts) * dir;
if(ta === Infinity) return 1;
if(tb === Infinity) return -1;
return (ta - tb) * dir;
});
} function applyTheme(name){
document.documentElement.dataset.theme = name;
localStorage.setItem(THEME_KEY, name); }
function toggleTheme(){
const cur = getSetting("theme") || localStorage.getItem(THEME_KEY) || "dark";
setSetting("theme",cur === "dark" ? "light" : "dark"); }
function renderPuzzleChips(){
els.puzzleChips.innerHTML = "";
PUZZLES.forEach(p=>{
const chip = document.createElement("div");
chip.className = "puzChip" + (state.puzzleFilter.has(p.key) ? " on" : "");
chip.textContent = p.label;
chip.addEventListener("click", ()=>{
if(state.puzzleFilter.has(p.key)) state.puzzleFilter.delete(p.key);
else state.puzzleFilter.add(p.key);
if(state.puzzleFilter.size === 0) PUZZLES.forEach(pp=>state.puzzleFilter.add(pp.key));
renderPuzzleChips();
renderSolvesPage();
});
els.puzzleChips.appendChild(chip);
});
}
function renderSolvesPage(){
const sess = currentSession();
const sessionSolves = state.solves.filter(s=>s.sessionId === sess.id && s.puzzle === sess.puzzle);
els.solvesSessionCount.textContent = `${sessionSolves.length} solve${sessionSolves.length===1?"":"s"}`;
els.solvesSessionName.textContent = `${sess.name} • ${puzzleInfo(sess.puzzle).label}`;
let list = applyFilters(state.solves);
list = applySort(list);
els.solveGrid.innerHTML = "";
els.emptyHint.style.display = list.length ? "none" : "block";
for(const s of list){
const btn = document.createElement("button");
btn.className = "solvePill" + (s.dnf ? " dnf" : s.plus2 ? " plus2" : "");
btn.textContent = solveLabel(s);
btn.title = `${puzzleInfo(s.puzzle).label} • ${new Date(s.ts).toLocaleString()}`;
btn.addEventListener("click", ()=> openModal(s.id));
els.solveGrid.appendChild(btn);
}
}
// search UI
els.btnSearch.addEventListener("click", ()=>{
state.searchOpen = !state.searchOpen;
els.searchWrap.classList.toggle("open", state.searchOpen);
if(state.searchOpen){
setTimeout(()=>els.searchInput.focus(), 0);
}else{
state.searchQuery = "";
els.searchInput.value = "";
renderSolvesPage();
}
});
els.btnSearchClose.addEventListener("click", ()=>{
state.searchOpen = false;
state.searchQuery = "";
els.searchInput.value = "";
els.searchWrap.classList.remove("open");
renderSolvesPage();
});
els.searchInput.addEventListener("input", ()=>{
state.searchQuery = els.searchInput.value;
renderSolvesPage();
});
// sort/filter popover
function closePopover(){
els.sortPopover.classList.remove("open");
}
els.btnSort.addEventListener("click", ()=>{
const willOpen = !els.sortPopover.classList.contains("open");
els.sortPopover.classList.toggle("open", willOpen);
if(willOpen){
const r = els.btnSort.getBoundingClientRect();
els.sortPopover.style.top = (window.scrollY + r.bottom + 10) + "px";
els.sortPopover.style.left = (window.scrollX + r.right - els.sortPopover.offsetWidth) + "px";
}
});
els.btnClosePopover.addEventListener("click", closePopover);
els.sortBy.addEventListener("change", ()=>{
state.sortBy = els.sortBy.value;
renderSolvesPage();
});
els.sortDir.addEventListener("change", ()=>{
state.sortDir = els.sortDir.value;
renderSolvesPage();
});
els.fPenalty.addEventListener("change", ()=>{
state.fPenalty = els.fPenalty.checked;
renderSolvesPage();
});
els.fComment.addEventListener("change", ()=>{
state.fComment = els.fComment.checked;
renderSolvesPage();
});
els.btnClearFilters.addEventListener("click", ()=>{
state.sortBy = "date";
state.sortDir = "desc";
state.fPenalty = false;
state.fComment = false;
state.puzzleFilter = new Set(PUZZLES.map(p=>p.key));
els.sortBy.value = state.sortBy;
els.sortDir.value = state.sortDir;
els.fPenalty.checked = false;
els.fComment.checked = false;
renderPuzzleChips();
renderSolvesPage();
});
document.addEventListener("mousedown", (e)=>{
if(!els.sortPopover.classList.contains("open")) return;
if(els.sortPopover.contains(e.target)) return;
if(e.target === els.btnSort) return;
closePopover();
});
// ===================== Solve modal (editor) =====================
let modalSolveId = null;
function setStatusButtons(s){
els.btnStatusOK.classList.toggle("on", !s.plus2 && !s.dnf);
els.btnStatusPlus2.classList.toggle("on", !!s.plus2);
els.btnStatusDNF.classList.toggle("on", !!s.dnf);
}
function refreshModalText(s){
els.mTitle.textContent = solveLabel(s);
els.mSub.textContent = `${sessionName(s.sessionId)} • ${puzzleInfo(s.puzzle).label}`;
const raw = fmtTime(s.ms);
const suffix = s.plus2 ? " +2" : "";
els.mTime.textContent = `${solveLabel(s)}  (raw: ${raw}${suffix})`;
}
function openModal(solveId){
const s = state.solves.find(x=>x.id===solveId);
if(!s) return;
modalSolveId = solveId;
refreshModalText(s);
els.mPuzzle.textContent = puzzleInfo(s.puzzle).label;
els.mDate.textContent = new Date(s.ts).toLocaleString();
els.mScramble.textContent = s.scramble || "—";
els.mComment.value = s.comment || "";
// session dropdown (moving solve between sessions is allowed, but puzzle must follow session)
els.mSessionSel.innerHTML = "";
state.sessions.forEach(sess=>{
const opt = document.createElement("option");
opt.value = sess.id;
opt.textContent = `${sess.name} • ${puzzleInfo(sess.puzzle).label}`;
if(sess.id === s.sessionId) opt.selected = true;
els.mSessionSel.appendChild(opt);
});
setStatusButtons(s);
els.overlay.classList.add("open");
els.modal.classList.add("open");
}
function closeModal(){
els.overlay.classList.remove("open");
els.modal.classList.remove("open");
modalSolveId = null;
}
function moveSolveToSession(solve, newSessionId){
const destPuzzle = sessionPuzzle(newSessionId);
solve.sessionId = newSessionId;
solve.puzzle = destPuzzle; // enforce rule: session owns puzzle
}
els.overlay.addEventListener("click", closeModal);
els.btnModalClose.addEventListener("click", closeModal);
els.btnStatusOK.addEventListener("click", ()=>{
const s = state.solves.find(x=>x.id===modalSolveId);
if(!s) return;
s.plus2 = false;
s.dnf = false;
if(s.id===lastStoppedId)recomputePBForActiveSessionPuzzle();
setStatusButtons(s);
refreshModalText(s);
save();
rerenderAll();
renderSolvesPage();
});
els.btnStatusPlus2.addEventListener("click", ()=>{
const s = state.solves.find(x=>x.id===modalSolveId);
if(!s) return;
if(s.dnf) return;
s.plus2 = !s.plus2;
if(s.id===lastStoppedId)recomputePBForActiveSessionPuzzle();
setStatusButtons(s);
refreshModalText(s);
save();
rerenderAll();
renderSolvesPage();
});
els.btnStatusDNF.addEventListener("click", ()=>{
const s = state.solves.find(x=>x.id===modalSolveId);
if(!s) return;
s.dnf = !s.dnf;
if(s.dnf) s.plus2 = false;
if(s.id===lastStoppedId)recomputePBForActiveSessionPuzzle();
setStatusButtons(s);
refreshModalText(s);
save();
rerenderAll();
renderSolvesPage();
});
els.btnCopyBoth.addEventListener("click", async ()=>{
const s = state.solves.find(x=>x.id===modalSolveId);
if(!s) return;
const text = `${solveLabel(s)} | ${puzzleInfo(s.puzzle).label} | ${new Date(s.ts).toLocaleString()}\n${s.scramble || ""}`;
if(await copyText(text)){
els.mSub.textContent = "Copied 📋";
setTimeout(()=>{ if(modalSolveId) els.mSub.textContent = `${sessionName(s.sessionId)} • ${puzzleInfo(s.puzzle).label}`; }, 700);
}else{
alert("Clipboard copy blocked by browser permissions.");
}
});
els.btnDeleteSolve.addEventListener("click", ()=>{
const s = state.solves.find(x=>x.id===modalSolveId);
if(!s) return;
const ok = confirm("Delete this solve?");
if(!ok) return;
state.solves = state.solves.filter(x=>x.id!==modalSolveId);
if(lastStoppedId===modalSolveId){lastStoppedId=null;lastStopWasPB=false;setTimeColor("normal");}
save();
closeModal();
rerenderAll();
renderSolvesPage();
});
els.btnModalSave.addEventListener("click", ()=>{
const s = state.solves.find(x=>x.id===modalSolveId);
if(!s) return;
s.comment = els.mComment.value || "";
const newSessId = els.mSessionSel.value || s.sessionId;
if(newSessId !== s.sessionId){
moveSolveToSession(s, newSessId);
}
save();
closeModal();
rerenderAll();
renderSolvesPage();
});
// ===================== Manual time entry + inspection =====================
function parseTimeToMs(value){
  if(value==null) return null;
  const text=String(value).trim().replace(",",".");
  if(/^dnf$/i.test(text)) return {ms:0,dnf:true};
  const m=text.match(/^(\d+)(?::([0-5]?\d))?(?::([0-5]?\d))?(?:\.(\d{1,3}))?$/);
  if(!m) return null;
  const a=Number(m[1]), b=m[2]==null?null:Number(m[2]), c=m[3]==null?null:Number(m[3]);
  let hours=0,minutes=0,seconds=0;
  if(c!=null){hours=a;minutes=b;seconds=c;}else if(b!=null){minutes=a;seconds=b;}else seconds=a;
  let fraction=m[4]||""; while(fraction.length<3 && fraction.length) fraction+="0";
  const ms=(hours*3600+minutes*60+seconds)*1000+(fraction?Number(fraction):0);
  return Number.isFinite(ms)&&ms>=0?{ms,dnf:false}:null;
}
function fmtInspect(seconds){return Number(seconds).toFixed(1);}
function updateInspectionPill(){
  if(!els.inspectionPill) return;
  if(inspecting){els.inspectionPill.hidden=false;return;}
  if(pendingInspectionPenalty!=="none"){
    els.inspectionPill.hidden=false;
    els.inspectionPill.textContent=pendingInspectionPenalty==="dnf"?"Inspection penalty: DNF on next solve":"Inspection penalty: +2 on next solve";
  }else{els.inspectionPill.hidden=true;}
}
function stopInspection(){
  if(inspecting){
    const elapsed=(performance.now()-inspectStart)/1000;
    const base=clamp(Number(getSetting("inspectionSeconds"))||15,5,30);
    const grace=clamp(Number(getSetting("inspectionOvertime"))||0,0,5);
    pendingInspectionPenalty=elapsed>=base+grace?"dnf":elapsed>=base?"plus2":"none";
  }
  inspecting=false;
  if(inspectRaf) cancelAnimationFrame(inspectRaf);
  inspectRaf=0;
  updateInspectionPill();
}
function startInspection(){
  stopInspection();
  pendingInspectionPenalty="none";
  inspecting=true;
  inspectStart=performance.now();
  lastStopWasPB=false;
  setTimerFocus(true);
  function tickInspect(){
    if(!inspecting)return;
    const elapsed=(performance.now()-inspectStart)/1000;
    const base=clamp(Number(getSetting("inspectionSeconds"))||15,5,30);
    const grace=clamp(Number(getSetting("inspectionOvertime"))||0,0,5);
    const left=base-elapsed;
    pendingInspectionPenalty=elapsed>=base+grace?"dnf":elapsed>=base?"plus2":"none";
    els.time.textContent=fmtInspect(Math.max(-9.9,left));
    els.inspectionPill.textContent=pendingInspectionPenalty==="dnf"?"INSPECTION · DNF":pendingInspectionPenalty==="plus2"?`INSPECTION · +2 · ${fmtInspect(Math.max(-9.9,left))}s`:`INSPECTION · ${fmtInspect(left)}s`;
    els.inspectionPill.hidden=false;
    setTimeColor(pendingInspectionPenalty==="dnf"?"arming":pendingInspectionPenalty==="plus2"?"ready":"normal");
    inspectRaf=requestAnimationFrame(tickInspect);
  }
  inspectRaf=requestAnimationFrame(tickInspect);
}
function applyPendingInspectionPenalty(solve){
  if(!solve)return;
  if(pendingInspectionPenalty==="dnf"){solve.dnf=true;solve.plus2=false;}
  else if(pendingInspectionPenalty==="plus2"&&!solve.dnf) solve.plus2=true;
  pendingInspectionPenalty="none";
  updateInspectionPill();
}
let manualEntryOpen=false;
function openManualEntry(){
  if(manualEntryOpen||mode!=="stopped"||inspecting)return;
  manualEntryOpen=true;
  const wrap=document.createElement("div");wrap.className="manualOverlay";wrap.id="manualEntryOverlay";
  const box=document.createElement("div");box.className="manualBox";box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");box.setAttribute("aria-labelledby","manualEntryTitle");
  const title=document.createElement("h2");title.className="manualTitle";title.id="manualEntryTitle";title.textContent="Manual time entry";
  const hint=document.createElement("div");hint.className="manualHint";hint.textContent="Examples: 12.345 · 1:02.345 · DNF";
  const input=document.createElement("input");input.className="manualInput";input.type="text";input.inputMode="decimal";input.placeholder="Enter time…";input.setAttribute("aria-label","Solve time");
  const actions=document.createElement("div");actions.className="manualActions";
  const cancel=document.createElement("button");cancel.className="ghostBtn";cancel.type="button";cancel.textContent="Cancel";
  const add=document.createElement("button");add.className="popBtn primary";add.type="button";add.textContent="Add solve";
  function close(){manualEntryOpen=false;wrap.remove();}
  function commit(){
    const parsed=parseTimeToMs(input.value);
    if(!parsed){input.setCustomValidity("Enter a time such as 12.345 or 1:02.345, or DNF.");input.reportValidity();input.style.borderColor="rgba(255,107,122,.9)";return;}
    input.setCustomValidity("");
    if(inspecting) stopInspection();
    const sess=currentSession();
    const solve={id:uid(),ms:Math.round(parsed.ms),scramble:state.scramble,plus2:false,dnf:!!parsed.dnf,comment:"",puzzle:sess.puzzle,sessionId:sess.id,ts:Date.now()};
    applyPendingInspectionPenalty(solve);
    state.solves.push(solve);lastStoppedId=solve.id;lastStopAt=Date.now();mode="stopped";setTimerFocus(false);
    if(getSetting("scrambleAfterStop")&&!getSetting("scrambleManualOnly"))setScramble(genScrambleFor(sess.puzzle));
    recomputePBForActiveSessionPuzzle();els.time.textContent=solveLabel(solve);save();rerenderAll();renderSolvesPage();
    if(getSetting("scrambleAutoHide")&&pages.timer)pages.timer.classList.remove("scramble-auto-hidden");
    close();
  }
  cancel.addEventListener("click",close);add.addEventListener("click",commit);wrap.addEventListener("click",e=>{if(e.target===wrap)close();});
  input.addEventListener("input",()=>{input.setCustomValidity("");input.style.borderColor="";});
  input.addEventListener("keydown",e=>{if(e.key==="Escape"){e.stopPropagation();close();}else if(e.key==="Enter")commit();});
  actions.append(cancel,add);box.append(title,hint,input,actions);wrap.appendChild(box);document.body.appendChild(wrap);setTimeout(()=>input.focus(),0);
}
els.btnManualEntry?.addEventListener("click",openManualEntry);
function recomputePBForActiveSessionPuzzle(){
  const current=state.solves.find(s=>s.id===lastStoppedId);
  if(!current)return;
  const others=getPbSolves(current.puzzle).filter(s=>s.id!==current.id).map(effectiveMs).filter(Number.isFinite);
  const bestBefore=others.length?Math.min(...others):null;
  const eff=effectiveMs(current);
  lastStopWasPB=eff!==Infinity&&(bestBefore==null||eff<bestBefore);
  const pbMode=getSetting("pbFeedbackMode");
  setTimeColor(current.dnf?"arming":lastStopWasPB&&pbMode!=="none"?"pb":"normal");
  els.time.classList.toggle("pbPulse",lastStopWasPB&&pbMode==="color+anim");
}
function bindTouchMode(on){
  if(!els.time)return;
  if(on&&!touchBound){touchBound=true;els.time.style.touchAction="none";els.time.addEventListener("touchstart",touchHandlers.down,{passive:false});els.time.addEventListener("touchend",touchHandlers.up,{passive:false});els.time.addEventListener("touchcancel",touchHandlers.up,{passive:false});}
  if(!on&&touchBound){touchBound=false;els.time.style.touchAction="";els.time.removeEventListener("touchstart",touchHandlers.down);els.time.removeEventListener("touchend",touchHandlers.up);els.time.removeEventListener("touchcancel",touchHandlers.up);}
}
const touchHandlers={down:e=>{if(!getSetting("touchMode")||e.touches?.length>1)return;e.preventDefault();handleSpaceDown(e);},up:e=>{if(!getSetting("touchMode"))return;e.preventDefault();handleSpaceUp(e);}};

// ===================== Keyboard =====================
// Requirements:
// - Ctrl + B + Z => open banish zone popup
// - Shift + B + Z (before your solve) => next solve auto-banished
// We’ll implement a tiny chord detector with short timeout.
const chord = {
t: 0,
ctrlB: false,
shiftB: false,
};
function resetChord(){
chord.t = 0;
chord.ctrlB = false;
chord.shiftB = false;
}
function handleSpaceDown(e){
  if(spaceDown)return;
  if(mode==="stopped"&&getSetting("preventAccidentalRestart")&&Date.now()-lastStopAt<250)return;
  spaceDown=true;
  if(mode==="running")return;
  if(mode==="stopped"&&getSetting("inspectionEnabled")){
    if(!inspecting){startInspection();return;}
    stopInspection();beginArming();return;
  }
  if(mode==="stopped")beginArming();
}
function handleSpaceUp(e){
  if(!spaceDown)return;
  spaceDown=false;
  if(inspecting)return;
  if(mode==="running"){stopTimer();return;}
  if(mode==="ready"){clearArming();startTimer();return;}
  if(mode==="arming"){
    clearArming();mode="stopped";setTimeColor("normal");setTimerFocus(false);updateInspectionPill();return;
  }
  clearArming();mode="stopped";setTimeColor("normal");
}
document.addEventListener("keydown",(e)=>{
  const target=e.target,tag=target?.tagName?.toLowerCase()||"";
  if(e.key==="Escape"){
    e.preventDefault();
    if(document.getElementById("manualEntryOverlay")){document.getElementById("manualEntryOverlay").remove();manualEntryOpen=false;return;}
    if(els.modal?.classList.contains("open")){closeModal();return;}
    if(els.modalBanish?.classList.contains("open")){closeBanish();return;}
    if(els.modalSession?.classList.contains("open")){closeCreateSession();return;}
    if(els.modalSessions?.classList.contains("open")){closeSessionsModal();return;}
    if(els.sortPopover?.classList.contains("open")){closePopover();return;}
    if(appEl.classList.contains("is-collapsed"))setCollapsed(false);
    return;
  }
  const modalOpen=!!document.querySelector(".modal.open")||manualEntryOpen;
  const editing=tag==="input"||tag==="textarea"||tag==="select"||target?.isContentEditable;
  const timerTabFocused=pages.timer?.classList.contains("active")&&!!target?.closest?.(".tab");
  // Space on a focused tab belongs to the timer, not the browser's synthetic button click.
  if(e.code==="Space"&&timerTabFocused&&!modalOpen&&!editing){e.preventDefault();if(!e.repeat)handleSpaceDown(e);return;}
  if(tag==="input"||tag==="textarea"||tag==="select"||tag==="button"||tag==="a"||target?.isContentEditable||target?.closest?.("[role=button]"))return;
  if(modalOpen)return;
  if(mode==="running"&&getSetting("disableKeysWhileRunning")&&e.code!=="Space")return;
  if(getSetting("manualEntryEnabled")&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.toLowerCase()===String(getSetting("manualEntryHotkey")||"t").toLowerCase()){
    if(mode==="stopped"&&!inspecting)openManualEntry();return;
  }
  if(e.repeat)return;
  const now=Date.now();
  if(chord.t&&now-chord.t>900)resetChord();
  if(e.ctrlKey&&!e.shiftKey&&e.key.toLowerCase()==="b"){chord.t=now;chord.ctrlB=true;return;}
  if(e.shiftKey&&!e.ctrlKey&&e.key.toLowerCase()==="b"){chord.t=now;chord.shiftB=true;return;}
  if(chord.ctrlB&&e.key.toLowerCase()==="z"){resetChord();openBanish();return;}
  if(chord.shiftB&&e.key.toLowerCase()==="z"){
    resetChord();state.forceBanishNext=true;els.savePill.textContent="Next solve → BANISH 👻";setTimeout(()=>setSaved(true),900);return;
  }
  if(e.code==="Space"){e.preventDefault();handleSpaceDown(e);return;}
  const timerIsActive=pages.timer?.classList.contains("active");
  if(timerIsActive&&mode==="stopped"&&!inspecting&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.toLowerCase()==="n"){
    const sess=currentSession();setScramble(genScrambleFor(sess.puzzle));save();return;
  }
  if(timerIsActive&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&e.key.toLowerCase()==="c"){els.btnCopyScramble.click();return;}
});
document.addEventListener("keyup", (e)=>{
if(e.code === "Space"&&spaceDown){
e.preventDefault();
handleSpaceUp(e);
}
});
// ===================== Settings UI and navigation =====================
let settingsBound=false;
function syncValLabel(key){
  document.querySelectorAll("[data-val]").forEach(el=>{if(el.dataset.val!==key)return;const value=getSetting(key);const n=Number(value);el.textContent=key==="holdMs"?`${n} ms`:key.startsWith("inspection")?`${n} s`:key==="scrambleMoveCount"?`${n} moves`:String(value);});
}
function syncSettingUI(key){
  const value=getSetting(key);
  document.querySelectorAll("[data-toggle]").forEach(el=>{if(el.dataset.toggle===key){const on=!!value;el.textContent=on?"On":"Off";el.setAttribute("aria-pressed",String(on));}});
  document.querySelectorAll("[data-select]").forEach(el=>{if(el.dataset.select===key)el.value=String(value);});
  document.querySelectorAll("[data-range]").forEach(el=>{if(el.dataset.range===key){el.value=String(value);syncValLabel(key);}});
  document.querySelectorAll("[data-setting]").forEach(el=>{if(el.dataset.setting===key)el.value=String(value??"");});
}
function syncAllSettingUI(){Object.keys(DEFAULT_SETTINGS).forEach(syncSettingUI);if(els.sessionsSort)els.sessionsSort.value=getSetting("sessionSorting")||"active";}
function applySetting(key){
  const value=getSetting(key);
  if(key==="theme"){applyTheme(value==="light"?"light":"dark");if(els.time)setTimeColor("normal");}
  if(key==="holdMs")timerPrefs.holdMs=clamp(Number(value)||550,100,2000);
  if(key==="manualEntryEnabled"&&els.btnManualEntry)els.btnManualEntry.hidden=!value;
  if(key==="inspectionEnabled"&&!value&&inspecting){stopInspection();setTimerFocus(false);setTimeColor("normal");}
  if(key==="timerShowScramble"&&els.scrambleWrap)els.scrambleWrap.style.display=value?"":"none";
  if(key==="scrambleWrap"&&els.scramble){els.scramble.style.whiteSpace=value?"pre-wrap":"nowrap";els.scramble.style.overflow=value?"visible":"hidden";}
  if(key==="scrambleMonospace"&&els.scramble)els.scramble.style.fontFamily=value?"var(--mono)":"var(--ui)";
  if(key==="showStatsOnTimer"){
    const right=document.querySelector("#page-timer .right"),content=document.querySelector("#page-timer .content");
    if(right)right.style.display=value?"":"none";
    if(content)content.classList.toggle("no-side-stats",!value);
  }
  if(key==="animations"||key==="reducedMotion")document.body.classList.toggle("reduce-motion",!getSetting("animations")||!!getSetting("reducedMotion"));
  if(key==="uiFont")document.documentElement.style.setProperty("--ui",value==="arial"?'Arial, Helvetica, sans-serif':value==="serif"?'Georgia, "Times New Roman", serif':'ui-sans-serif, system-ui, -apple-system, "Segoe UI Variable", "Segoe UI", Roboto, Helvetica, Arial');
  if(key==="timerFont")document.documentElement.style.setProperty("--timer-font",value==="mono"?'var(--mono)':value==="serif"?'Georgia, "Times New Roman", serif':'var(--ui)');
  if(key==="sessionSorting"&&els.sessionsSort)els.sessionsSort.value=String(value);
  if(key==="spacingScale")document.body.dataset.spacing=String(value||"normal");
  if(key==="scrambleAutoHide"&&!value&&pages.timer)pages.timer.classList.remove("scramble-auto-hidden");
  if(key==="touchMode")bindTouchMode(!!value);
  if(key==="showAo5"||key==="showAo12"||key==="showAo50"||key==="showAo100"||key==="statsPrecision")refreshStats();
  if(key==="sessionArchive"||key==="sessionSorting")renderSessionListModal();
  if(key==="manualEntryHotkey")syncSettingUI(key);
}
function applyAllSettings(){Object.keys(DEFAULT_SETTINGS).forEach(applySetting);applySettingsToDOM();}
function applySettingsToDOM(){
  document.documentElement.dataset.theme=getSetting("theme")==="light"?"light":"dark";
  document.body.dataset.spacing=getSetting("spacingScale")||"normal";
  if(els.btnManualEntry)els.btnManualEntry.hidden=!getSetting("manualEntryEnabled");
  if(els.scrambleWrap)els.scrambleWrap.style.display=getSetting("timerShowScramble")?"":"none";
  if(els.scramble){els.scramble.style.whiteSpace=getSetting("scrambleWrap")?"pre-wrap":"nowrap";els.scramble.style.fontFamily=getSetting("scrambleMonospace")?"var(--mono)":"var(--ui)";}
  document.body.classList.toggle("reduce-motion",!getSetting("animations")||!!getSetting("reducedMotion"));
  bindTouchMode(!!getSetting("touchMode"));
}
function setSetting(key,value){
  if(!(key in DEFAULT_SETTINGS))return;
  value=normalizeSetting(key,value);
  state.settings[key]=value;applySetting(key);syncSettingUI(key);save();
  if(typeof rerenderAll==="function")rerenderAll();
  if(typeof renderSolvesPage==="function")renderSolvesPage();
  updateSettingsDependencies();
}
function updateSettingsDependencies(){
  document.querySelectorAll('[data-setting="manualEntryHotkey"]').forEach(el=>el.disabled=!getSetting("manualEntryEnabled"));
}
function bindSettingsControls(){
  if(settingsBound)return;settingsBound=true;
  document.addEventListener("click",e=>{
    const toggle=e.target.closest(".toggleBtn[data-toggle]");
    if(toggle){const key=toggle.dataset.toggle;setSetting(key,!getSetting(key));return;}
    const help=e.target.closest(".helpBtn[data-helpbtn]");
    if(help){const key=help.dataset.helpbtn;const panel=Array.from(document.querySelectorAll("[data-help]")).find(x=>x.dataset.help===key);if(panel){panel.hidden=!panel.hidden;help.setAttribute("aria-expanded",String(!panel.hidden));}return;}
    const nav=e.target.closest(".setNavItem[data-jump]");
    if(nav){
      const target=document.getElementById(nav.dataset.jump),main=document.querySelector("#page-settings .settingsMain");
      if(target&&main){const top=target.getBoundingClientRect().top-main.getBoundingClientRect().top+main.scrollTop;main.scrollTo({top:Math.max(0,top-8),behavior:getSetting("reducedMotion")?"auto":"smooth"});}
      return;
    }
  });
  document.addEventListener("input",e=>{const el=e.target;if(el.matches("[data-range]")){syncValLabel(el.dataset.range);const k=el.dataset.range;state.settings[k]=Number(el.value);applySetting(k);}});
  document.addEventListener("change",e=>{
    const el=e.target;
    if(el.matches("[data-select]")){setSetting(el.dataset.select,el.value);return;}
    if(el.matches("[data-range]")){setSetting(el.dataset.range,el.value);return;}
    if(el.matches("[data-setting]")){setSetting(el.dataset.setting,el.value);return;}
  });
  els.sessionsSort?.addEventListener("change",()=>setSetting("sessionSorting",els.sessionsSort.value));
  const main=document.querySelector("#page-settings .settingsMain");
  main?.addEventListener("scroll",()=>{
    const sections=Array.from(main.querySelectorAll(".setSection[id]"));
    let active=sections[0];const edge=main.getBoundingClientRect().top+28;
    for(const section of sections){if(section.getBoundingClientRect().top<=edge)active=section;else break;}
    document.querySelectorAll(".setNavItem").forEach(item=>{const on=item.dataset.jump===active?.id;item.classList.toggle("on",on);if(on)item.setAttribute("aria-current","location");else item.removeAttribute("aria-current");});
  },{passive:true});
  const nav=document.getElementById("settingsNavList");
  if(nav){nav.innerHTML="";document.querySelectorAll("#page-settings .setSection[id]").forEach(section=>{const button=document.createElement("button");button.className="setNavItem";button.type="button";button.dataset.jump=section.id;button.setAttribute("aria-controls",section.id);button.textContent=section.querySelector(".setTitle")?.textContent.trim()||section.id;nav.appendChild(button);});
    document.querySelectorAll("#page-settings .setRow").forEach(row=>{
      const title=row.querySelector(".setText strong")?.textContent.trim()||"Setting";
      row.querySelectorAll("input,select,.toggleBtn,.helpBtn").forEach(control=>{if(!control.hasAttribute("aria-label"))control.setAttribute("aria-label",control.classList.contains("helpBtn")?`Help: ${title}`:title);});
    });
    const first=nav.querySelector(".setNavItem");if(first){first.classList.add("on");first.setAttribute("aria-current","location");}
  }
}
// ===================== Rerender helpers =====================
function rerenderAll(){
refreshPuzzleUI();
refreshStats();
renderStatsPage();
refreshTable();
if(mode==="stopped"&&!inspecting&&els.time){
  const active=getActiveSolves(),latest=active[active.length-1];
  els.time.textContent=latest?solveLabel(latest):fmtTime(0,clamp(Number(getSetting("finalDp")),0,3));
  if(latest&&latest.id===lastStoppedId)recomputePBForActiveSessionPuzzle();
}
}
// ===================== Init =====================
load();
mergeDefaults();
bindSettingsControls();
bindDataControls();
applyAllSettings();
syncAllSettingUI();
updateSettingsDependencies();
// Ensure current session puzzle exists
let sess = currentSession();
if(sess?.archived){const available=state.sessions.find(s=>!s.archived);if(available){state.currentSessionId=available.id;sess=available;}else sess.archived=false;}
if(!sess.puzzle) sess.puzzle = "333";
// Scramble init
if(!state.scramble) state.scramble = genScrambleFor(sess.puzzle);
refreshPuzzleUI();
setScramble(state.scramble);
setMode("stopped");
els.time.textContent = fmtTime(0,clamp(Number(getSetting("finalDp")),0,3));
if(els.btnManualEntry)els.btnManualEntry.hidden=!getSetting("manualEntryEnabled");
updateInspectionPill();
setSaved(true);
// set filter controls initial values
els.sortBy.value = state.sortBy;
els.sortDir.value = state.sortDir;
els.fPenalty.checked = state.fPenalty;
els.fComment.checked = state.fComment;
renderPuzzleChips();
rerenderAll(); })(); 
