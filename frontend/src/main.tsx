
import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {motion} from "framer-motion";
import {
  Upload, ScanLine, ShieldCheck, History, BarChart3, FileText,
  Settings, Bell, CheckCircle2, AlertTriangle, Search, PackageCheck,
  ClipboardCheck, CircleHelp, Newspaper, ExternalLink, SlidersHorizontal,
  Download, RefreshCw, Database, Activity, Users, Clock3, ChevronRight,
  Check, X, Info
} from "lucide-react";
import "./styles.css";

const API = "http://localhost:8000";

type Result = {
  inspection_id:string;
  timestamp:string;
  ocr:any[];
  fields:Record<string,any>;
  assessment:{overall:string; checks:any[]};
};

type HistoryItem = Result & { savedAt?: string };

const updates = [
  {
    date:"11 Sep 2026",
    title:"Consumer Protection (E-Commerce) Amendment Rules, 2026",
    summary:"The Department published the 2026 amendment rules as part of its consumer-protection framework for e-commerce.",
    tag:"Consumer Protection",
    url:"https://consumeraffairs.gov.in/pages/latest-news"
  },
  {
    date:"29 Aug 2026",
    title:"Legal Metrology Indian Standard Time Rules, 2026",
    summary:"A new Legal Metrology update was published concerning Indian Standard Time requirements.",
    tag:"Legal Metrology",
    url:"https://consumeraffairs.gov.in/pages/latest-news"
  },
  {
    date:"06 Jul 2026",
    title:"Rules amended for verification of high-capacity weighing instruments",
    summary:"The Department announced an amendment concerning verification of high-capacity weighing instruments.",
    tag:"Legal Metrology",
    url:"https://consumeraffairs.gov.in/pages/press-release"
  },
  {
    date:"29 Jun 2026",
    title:"Improvement Notice mechanism introduced under the Legal Metrology Act",
    summary:"The Department announced an improvement-notice mechanism as part of Legal Metrology reforms.",
    tag:"Compliance Reform",
    url:"https://consumeraffairs.gov.in/pages/press-release?page=2"
  },
  {
    date:"03 Jun 2026",
    title:"CCPA action against dark patterns on digital platforms",
    summary:"The CCPA announced enforcement action concerning dark patterns affecting consumers on digital platforms.",
    tag:"Digital Consumer Protection",
    url:"https://consumeraffairs.gov.in/pages/press-release?page=2"
  },
  {
    date:"04 Aug 2026",
    title:"Applications invited for Government Approved Test Centres",
    summary:"The Department invited applications for Government Approved Test Centres, supporting testing and verification infrastructure.",
    tag:"Testing & Verification",
    url:"https://consumeraffairs.gov.in/pages/press-release"
  }
];

function App(){
  const [file,setFile] = useState<File|null>(null);
  const [preview,setPreview] = useState("");
  const [loading,setLoading] = useState(false);
  const [result,setResult] = useState<Result|null>(null);
  const [tab,setTab] = useState("Dashboard");
  const [history,setHistory] = useState<HistoryItem[]>([]);
  const [notifications,setNotifications] = useState(true);
  const [confidence,setConfidence] = useState(0.70);
  const [autoSave,setAutoSave] = useState(true);

  useEffect(()=>{
    try{
      const h = JSON.parse(localStorage.getItem("packcheck_history") || "[]");
      setHistory(h);
      const s = JSON.parse(localStorage.getItem("packcheck_settings") || "{}");
      if(typeof s.notifications==="boolean") setNotifications(s.notifications);
      if(typeof s.confidence==="number") setConfidence(s.confidence);
      if(typeof s.autoSave==="boolean") setAutoSave(s.autoSave);
    }catch{}
  },[]);

  useEffect(()=>{
    localStorage.setItem("packcheck_settings", JSON.stringify({notifications, confidence, autoSave}));
  },[notifications,confidence,autoSave]);

  const saveHistory = (r:Result)=>{
    const next = [r, ...history.filter(x=>x.inspection_id!==r.inspection_id)].slice(0,50);
    setHistory(next);
    if(autoSave) localStorage.setItem("packcheck_history", JSON.stringify(next));
  };

  const upload=(f:File)=>{
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  };

  const analyze=async()=>{
    if(!file)return;
    setLoading(true);
    const fd=new FormData();
    fd.append("file",file);
    try{
      const r=await fetch(API+"/api/analyze",{method:"POST",body:fd});
      if(!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setResult(data);
      saveHistory(data);
    }catch(e:any){
      alert(e.message||"Analysis failed");
    }finally{
      setLoading(false);
    }
  };

  const downloadReport=async(r:Result|null = result)=>{
    if(!r)return;
    const response=await fetch(API+"/api/report",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(r)
    });
    if(!response.ok){ alert("Could not generate report."); return; }
    const blob=await response.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`${r.inspection_id}_PackCheck_Report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory=()=>{
    setHistory([]);
    localStorage.removeItem("packcheck_history");
  };

  const renderPage = () => {
    if(tab==="Dashboard") return <Dashboard setTab={setTab} history={history}/>;
    if(tab==="New Inspection") return <Inspection file={file} preview={preview} result={result} loading={loading} upload={upload} analyze={analyze} downloadReport={()=>downloadReport(result)}/>;
    if(tab==="History") return <HistoryPage history={history} onOpen={(r)=>{setResult(r);setTab("New Inspection")}} onClear={clearHistory}/>;
    if(tab==="Reports") return <ReportsPage history={history} onDownload={downloadReport}/>;
    if(tab==="Analytics") return <AnalyticsPage history={history}/>;
    if(tab==="Department Updates") return <UpdatesPage/>;
    if(tab==="Settings") return <SettingsPage notifications={notifications} setNotifications={setNotifications} confidence={confidence} setConfidence={setConfidence} autoSave={autoSave} setAutoSave={setAutoSave}/>;
    return null;
  };

  return <div className="app">
    <aside className="sidebar">
      <div className="brand">
        <div className="logo"><ShieldCheck size={25}/></div>
        <div><b>PackCheck AI</b><small>COMPLIANCE ASSISTANT</small></div>
      </div>

      <div className="navSection">WORKSPACE</div>
      {[
        ["Dashboard",BarChart3],
        ["New Inspection",ScanLine],
        ["History",History],
        ["Reports",FileText],
        ["Analytics",Activity],
        ["Department Updates",Newspaper]
      ].map(([name,Icon]:any)=>
        <button className={tab===name?"nav active":"nav"} onClick={()=>setTab(name)} key={name}>
          <Icon size={19}/><span>{name}</span>
        </button>
      )}

      <div className="navSection settingsLabel">SYSTEM</div>
      <button className={tab==="Settings"?"nav active":"nav"} onClick={()=>setTab("Settings")}>
        <Settings size={19}/><span>Settings</span>
      </button>

      <div className="sidebarBottom">
        <div className="helpBox">
          <CircleHelp size={20}/>
          <div><b>Need help?</b><span>Review an inspection workflow</span></div>
        </div>
        <div className="version">PackCheck AI • User Edition</div>
      </div>
    </aside>

    <main className="main">
      <header>
        <div>
          <span className="eyebrow">PACKAGED COMMODITY COMPLIANCE</span>
          <h1>{tab}</h1>
        </div>
        <div className="headerRight">
          <button className="iconButton" aria-label="Notifications" onClick={()=>setTab("Department Updates")}><Bell size={20}/>{notifications && <i className="notificationDot"/>}</button>
          <div className="avatar">PC</div>
        </div>
      </header>
      {renderPage()}
    </main>
  </div>
}

function Dashboard({setTab,history}:any){
  const total=history.length;
  const noIssue=history.filter((x:any)=>x.assessment?.overall==="NO ISSUE DETECTED").length;
  const review=history.filter((x:any)=>x.assessment?.overall==="REVIEW REQUIRED").length;
  const fields = history.reduce((n:any,x:any)=>n+(x.assessment?.checks?.filter((c:any)=>c.status!=="detected").length||0),0);

  return <div className="content">
    <div className="hero">
      <div className="heroText">
        <span className="pill">SMART COMPLIANCE CHECK</span>
        <h2>Inspect packaged products faster.</h2>
        <p>Scan a product label, extract key declarations, review evidence and generate an inspection report from one workspace.</p>
        <div className="heroActions">
          <button className="primary heroButton" onClick={()=>setTab("New Inspection")}><ScanLine size={19}/> Start New Inspection</button>
          <button className="secondary heroButton" onClick={()=>setTab("Department Updates")}><Newspaper size={18}/> Department Updates</button>
        </div>
      </div>
      <motion.div className="scanOrb" animate={{scale:[1,1.04,1],opacity:[.85,1,.85]}} transition={{repeat:Infinity,duration:2}}>
        <PackageCheck size={76}/>
      </motion.div>
    </div>

    <div className="sectionTitle">
      <div><h2>Workspace overview</h2><p>Live activity from this device</p></div>
      <button className="secondary" onClick={()=>setTab("Analytics")}><Activity size={17}/> View Analytics</button>
    </div>

    <div className="stats">
      <Stat title="Inspections" value={total}/>
      <Stat title="No Issue Detected" value={noIssue} good/>
      <Stat title="Review Required" value={review} warn/>
      <Stat title="Items Needing Review" value={fields} bad/>
    </div>

    <div className="dashboardGrid">
      <div className="card workflowCard">
        <div className="cardTitle"><div className="cardIcon"><ClipboardCheck size={19}/></div><div><h3>Inspection workflow</h3><p>Image → evidence → decision support</p></div></div>
        <div className="flow"><span>IMAGE</span><b>→</b><span>OCR</span><b>→</b><span>FIELDS</span><b>→</b><span>RULE CHECKS</span><b>→</b><span>REPORT</span></div>
      </div>

      <div className="card">
        <div className="cardTitle"><div className="cardIcon"><Database size={19}/></div><div><h3>Compliance workspace</h3><p>Evidence-first inspection</p></div></div>
        <div className="miniRows">
          <div><span>OCR evidence</span><b>Bounding boxes</b></div>
          <div><span>Field extraction</span><b>Confidence-aware</b></div>
          <div><span>Decision support</span><b>Human review</b></div>
          <div><span>Reports</span><b>PDF export</b></div>
        </div>
      </div>

      <div className="card updateCard">
        <div className="cardTitle"><div className="cardIcon"><Newspaper size={19}/></div><div><h3>Department updates</h3><p>Official Consumer Affairs feed</p></div></div>
        <div className="updatePreview">
          {updates.slice(0,3).map(u=><div className="updateRow" key={u.title}><div><span>{u.date}</span><b>{u.title}</b></div><ChevronRight size={17}/></div>)}
        </div>
        <button className="textButton" onClick={()=>setTab("Department Updates")}>View all official updates <ChevronRight size={16}/></button>
      </div>

      <div className="card">
        <div className="cardTitle"><div className="cardIcon"><ShieldCheck size={19}/></div><div><h3>Important</h3><p>Use as decision support</p></div></div>
        <p className="muted largeMuted">PackCheck AI highlights detected declarations and items needing attention. It does not itself make a legally binding determination.</p>
      </div>
    </div>
  </div>
}

function Stat({title,value,good,warn,bad}:any){
  return <motion.div className="stat" whileHover={{y:-3}}><span>{title}</span><strong>{value}</strong><i className={good?"good":warn?"warn":bad?"bad":""}></i></motion.div>
}

function Inspection({file,preview,result,loading,upload,analyze,downloadReport}:any){
  return <div className="content">
    <div className="inspectionTop">
      <div><span className="eyebrow">PRODUCT INSPECTION</span><h2>New inspection</h2><p className="muted">Upload a clear image of the product label or package.</p></div>
      {result && <button className="secondary" onClick={downloadReport}><FileText size={17}/> Generate Report</button>}
    </div>

    <div className="workspace">
      <section className="card imageCard">
        {!preview ?
          <label className="drop">
            <div className="uploadIcon"><Upload size={30}/></div>
            <h3>Upload product image</h3><p>Use a clear JPG, PNG or WEBP image</p><span className="uploadHint">Click anywhere to choose a file</span>
            <input type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/>
          </label>
        :
          <div className="preview">
            <img src={preview}/>
            {result?.ocr?.slice(0,30).map((x:any,i:number)=><div key={i} className="bbox" style={{left:`${(x.bbox[0]/1000)*100}%`,top:`${(x.bbox[1]/1000)*100}%`,width:`${Math.max(2,(x.bbox[2]/1000)*100)}%`,height:`${Math.max(2,(x.bbox[3]/1000)*100)}%`}}/> )}
            {!result && <div className="scanline"/>}
          </div>
        }
        {preview && !result && <button className="primary full" disabled={loading} onClick={analyze}>{loading?<><span className="spinner"/> Analyzing image…</>:<><ScanLine size={18}/> Scan & Analyze</>}</button>}
      </section>

      <section className="card resultCard">
        {!result ?
          <div className="empty"><div className="emptyIcon"><Search size={28}/></div><h3>Analysis results</h3><p>Extracted product information, confidence and compliance checks will appear here.</p></div>
        :
          <>
            <div className="resultHead"><div><span className="eyebrow">INSPECTION RESULT</span><h2>{result.assessment.overall}</h2></div><span className={result.assessment.overall==="REVIEW REQUIRED"?"review":"ok"}>{result.assessment.overall==="REVIEW REQUIRED"?"⚠":"✓"}</span></div>
            <div className="fields">{result.assessment.checks.map((c:any)=><div className="field" key={c.field}><div><b>{c.label}</b><small>{c.value||"Not confidently detected"}</small></div>{c.status==="detected"?<CheckCircle2 className="iconGood"/>:<AlertTriangle className="iconWarn"/>}</div>)}</div>
            <div className="notice"><Info size={15}/> AI-assisted assessment. Final legal determination requires authorized human review.</div>
          </>
        }
      </section>
    </div>
  </div>
}

function HistoryPage({history,onOpen,onClear}:any){
  return <div className="content">
    <div className="pageIntro"><div><span className="eyebrow">INSPECTION LOG</span><h2>History</h2><p>Saved inspections on this device.</p></div><button className="secondary" onClick={onClear}><X size={17}/> Clear history</button></div>
    <div className="card tableCard">
      {history.length===0?<EmptyState title="No inspections yet" text="Run your first inspection and it will appear here."/>:
      <div className="table">
        <div className="tr th"><span>Inspection</span><span>Date</span><span>Result</span><span>Action</span></div>
        {history.map((r:any)=><div className="tr" key={r.inspection_id}><span><b>{r.inspection_id}</b><small>{r.fields?.product_name||"Product label"}</small></span><span>{new Date(r.timestamp).toLocaleString()}</span><span><StatusBadge status={r.assessment?.overall}/></span><button className="smallButton" onClick={()=>onOpen(r)}>Open <ChevronRight size={14}/></button></div>)}
      </div>}
    </div>
  </div>
}

function ReportsPage({history,onDownload}:any){
  return <div className="content">
    <div className="pageIntro"><div><span className="eyebrow">DOCUMENTS</span><h2>Reports</h2><p>Generate inspection reports from saved results.</p></div></div>
    <div className="reportGrid">
      {history.length===0?<div className="card"><EmptyState title="No reports available" text="Complete an inspection first." /></div>:
      history.map((r:any)=><div className="card reportCard" key={r.inspection_id}><div className="reportIcon"><FileText size={24}/></div><div className="reportMeta"><b>{r.inspection_id}</b><span>{new Date(r.timestamp).toLocaleString()}</span><StatusBadge status={r.assessment?.overall}/></div><button className="secondary" onClick={()=>onDownload(r)}><Download size={16}/> PDF</button></div>)}
    </div>
  </div>
}

function AnalyticsPage({history}:any){
  const total=history.length;
  const clean=history.filter((x:any)=>x.assessment?.overall==="NO ISSUE DETECTED").length;
  const review=total-clean;
  const avgFields=total ? Math.round(history.reduce((sum:any,x:any)=>sum+(x.assessment?.checks?.filter((c:any)=>c.status==="detected").length||0),0)/total*100)/100 : 0;
  const max=12;
  return <div className="content">
    <div className="pageIntro"><div><span className="eyebrow">INSPECTION INTELLIGENCE</span><h2>Analytics</h2><p>Operational metrics calculated from saved inspections.</p></div></div>
    <div className="stats analyticsStats"><Stat title="Total inspections" value={total}/><Stat title="No issue rate" value={`${total?Math.round(clean/total*100):0}%`} good/><Stat title="Review rate" value={`${total?Math.round(review/total*100):0}%`} warn/><Stat title="Avg. fields detected" value={avgFields}/></div>
    <div className="analyticsGrid">
      <div className="card chartCard"><div className="cardTitle"><div className="cardIcon"><BarChart3 size={19}/></div><div><h3>Result distribution</h3><p>Saved inspection outcomes</p></div></div><div className="bars"><Bar label="No Issue" value={clean} max={Math.max(max,total)} good/><Bar label="Review Required" value={review} max={Math.max(max,total)} warn/></div></div>
      <div className="card"><div className="cardTitle"><div className="cardIcon"><Activity size={19}/></div><div><h3>Operational signals</h3><p>What the workspace is seeing</p></div></div><div className="signalList"><div><span>Inspections stored</span><b>{total}</b></div><div><span>Fields successfully detected</span><b>{Math.round(avgFields*100)/100} / 6 avg.</b></div><div><span>Manual review signal</span><b>{review>0?"Active":"None yet"}</b></div><div><span>Evidence workflow</span><b>OCR + field checks</b></div></div></div>
    </div>
  </div>
}

function Bar({label,value,max,good,warn}:any){
  return <div className="barRow"><div><span>{label}</span><b>{value}</b></div><div className="barTrack"><div className={`barFill ${good?"barGood":warn?"barWarn":""}`} style={{width:`${max?Math.min(100,value/max*100):0}%`}}/></div></div>
}

function UpdatesPage(){
  return <div className="content">
    <div className="pageIntro"><div><span className="eyebrow">REGULATORY INTELLIGENCE</span><h2>Department Updates</h2><p>Selected official updates from the Department of Consumer Affairs and CCPA.</p></div><a className="secondary linkButton" href="https://consumeraffairs.gov.in/pages/latest-news" target="_blank" rel="noreferrer"><ExternalLink size={16}/> Official website</a></div>
    <div className="currentBanner"><div className="newsPulse"><Newspaper size={22}/></div><div><b>Why this section matters</b><p>Legal Metrology and consumer-protection requirements can change. Keep the inspection workflow connected to current official notices and rule updates.</p></div></div>
    <div className="newsGrid">
      {updates.map(u=><article className="card newsCard" key={u.title}><div className="newsTop"><span className="tag">{u.tag}</span><span>{u.date}</span></div><h3>{u.title}</h3><p>{u.summary}</p><a href={u.url} target="_blank" rel="noreferrer">Read official source <ExternalLink size={14}/></a></article>)}
    </div>
    <div className="card sourceCard"><div className="cardTitle"><div className="cardIcon"><ShieldCheck size={19}/></div><div><h3>Official reference points</h3><p>Use these before treating a rule as current</p></div></div><div className="sourceLinks"><a href="https://consumeraffairs.gov.in/pages/latest-news" target="_blank" rel="noreferrer">Latest News <ExternalLink size={14}/></a><a href="https://consumeraffairs.gov.in/pages/press-release" target="_blank" rel="noreferrer">Press Releases <ExternalLink size={14}/></a><a href="https://consumeraffairs.gov.in/pages/legal-metrology-overview" target="_blank" rel="noreferrer">Legal Metrology <ExternalLink size={14}/></a></div></div>
  </div>
}

function SettingsPage({notifications,setNotifications,confidence,setConfidence,autoSave,setAutoSave}:any){
  return <div className="content">
    <div className="pageIntro"><div><span className="eyebrow">WORKSPACE PREFERENCES</span><h2>Settings</h2><p>Configure how PackCheck AI behaves on this device.</p></div></div>
    <div className="settingsGrid">
      <div className="card settingCard"><div className="settingIcon"><Bell size={21}/></div><div><h3>Department notifications</h3><p>Show an update indicator for the Department Updates section.</p></div><Toggle value={notifications} onChange={setNotifications}/></div>
      <div className="card settingCard"><div className="settingIcon"><Database size={21}/></div><div><h3>Auto-save inspections</h3><p>Keep completed inspection results in local browser history.</p></div><Toggle value={autoSave} onChange={setAutoSave}/></div>
      <div className="card settingCard wideSetting"><div className="settingIcon"><SlidersHorizontal size={21}/></div><div className="settingBody"><h3>OCR review threshold</h3><p>Low-confidence extraction should be manually reviewed. Current threshold: <b>{Math.round(confidence*100)}%</b>.</p><input type="range" min="0.5" max="0.95" step="0.05" value={confidence} onChange={e=>setConfidence(Number(e.target.value))}/><div className="rangeLabels"><span>50%</span><span>95%</span></div></div></div>
      <div className="card settingCard wideSetting"><div className="settingIcon"><Users size={21}/></div><div><h3>Review responsibility</h3><p>PackCheck AI is decision-support software. Authorized personnel remain responsible for interpreting evidence and making final legal determinations.</p><span className="settingBadge"><Check size={14}/> Human review enabled</span></div></div>
    </div>
  </div>
}

function Toggle({value,onChange}:any){
  return <button className={`toggle ${value?"on":""}`} onClick={()=>onChange(!value)} aria-label="Toggle setting"><span/></button>
}

function StatusBadge({status}:any){
  return <span className={`statusBadge ${status==="NO ISSUE DETECTED"?"clean":"reviewStatus"}`}>{status==="NO ISSUE DETECTED"?<Check size={13}/>:<AlertTriangle size={13}/>} {status}</span>
}

function EmptyState({title,text}:any){
  return <div className="emptyState"><div className="emptyIcon"><FileText size={26}/></div><h3>{title}</h3><p>{text}</p></div>
}

createRoot(document.getElementById("root")!).render(<App/>);
