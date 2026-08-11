import 'server-only';
import crypto from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';

let app;
function serviceAccount(){
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const b64=process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if(raw) return JSON.parse(raw);
  if(b64) return JSON.parse(Buffer.from(b64,'base64').toString('utf8'));
  return null;
}
export function firebaseApp(){
  if(app) return app;
  if(getApps().length){ app=getApps()[0]; return app; }
  const sa=serviceAccount();
  const options={projectId:process.env.FIREBASE_PROJECT_ID||'jollytiles'};
  if(sa) options.credential=cert(sa);
  if(process.env.FIREBASE_DATABASE_URL) options.databaseURL=process.env.FIREBASE_DATABASE_URL;
  app=initializeApp(options); return app;
}
export function db(){return getFirestore(firebaseApp())}
export function rtdb(){return getDatabase(firebaseApp())}
export function iso(v){
  if(!v)return null; if(v instanceof Timestamp)return v.toDate().toISOString(); if(v?.toDate)return v.toDate().toISOString();
  const d=new Date(v); return Number.isNaN(d.valueOf())?String(v):d.toISOString();
}
export function plain(data={}){const out={};for(const[k,v]of Object.entries(data)){if(v instanceof Timestamp||v?.toDate)out[k]=iso(v);else if(Array.isArray(v))out[k]=v.map(x=>typeof x==='object'&&x?plain(x):x);else if(v&&typeof v==='object')out[k]=plain(v);else out[k]=v}return out}
export async function list(collection,limit=5000){const s=await db().collection(collection).limit(limit).get();return s.docs.map(d=>({id:d.id,...plain(d.data())}))}
export async function get(collection,id){const d=await db().collection(collection).doc(String(id)).get();return d.exists?{id:d.id,...plain(d.data())}:null}
export async function put(collection,id,data,{merge=true}={}){const ref=db().collection(collection).doc(String(id||crypto.randomUUID()));await ref.set({...data,updatedAt:FieldValue.serverTimestamp()},{merge});return get(collection,ref.id)}
export async function add(collection,data){const ref=await db().collection(collection).add({...data,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});return get(collection,ref.id)}
export async function remove(collection,id){await db().collection(collection).doc(String(id)).delete()}
export function now(){return new Date().toISOString()}
export function id(){return crypto.randomUUID()}
export function cleanBadge(v=''){return String(v).replace(/[^0-9A-Za-z]/g,'').trim()}
export function secret(){return process.env.GOCREATE_SESSION_SECRET||process.env.SYNC_API_KEY||'change-me-in-production'}
export function sign(payload,ttl=8*3600){const body=Buffer.from(JSON.stringify({...payload,exp:Date.now()+ttl*1000})).toString('base64url');const sig=crypto.createHmac('sha256',secret()).update(body).digest('base64url');return `${body}.${sig}`}
export function verify(token=''){try{const[b,s]=token.split('.');const x=crypto.createHmac('sha256',secret()).update(b).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(s||''),Buffer.from(x)))return null;const p=JSON.parse(Buffer.from(b,'base64url'));return p.exp>Date.now()?p:null}catch{return null}}
export async function audit(action,details={}){try{return await add('audit',{action,source:details.source||'api',actorId:details.actorId||'system',actorName:details.actorName||'System',targetType:details.targetType||'',targetId:details.targetId||'',targetName:details.targetName||'',kioskId:details.kioskId||'',details:details.details||details,createdAt:now()})}catch{return null}}
export const DEFAULTS={
 kiosk:{resultTimeoutSeconds:5,formTimeoutSeconds:90,claimTimeoutSeconds:600,helpTimeoutSeconds:60,showClock:true,showScannerArrow:true,scannerInstruction:'Hold your badge over the reader below — not against the screen.'},
 guests:{requireDateOfBirth:false,requirePhone:false,waiverRequired:true,maxGuestsPerMember:0,waiverVersion:'2026-08',waiverText:'GoCreate contains tools, equipment, materials, and activities that may involve risk. The guest agrees to follow staff instructions and posted rules, accepts responsibility for their conduct and personal property, and acknowledges that GoCreate is not responsible for injury, loss, or damage to the fullest extent allowed by law.'},
 attendance:{memberAutoCheckoutEnabled:true,memberAutoCheckoutMinutesAfterClose:30,employeeAutoCheckoutEnabled:true,employeeScheduledGraceMinutes:30,employeeUnscheduledMinutesAfterClose:30,manualCheckoutEnabled:true},
 membership:{expiredPolicy:'front-desk',pendingPolicy:'front-desk',inactivePolicy:'front-desk',gracePeriodDays:0},
 operating_hours:{timezone:'America/Chicago',weekly:{0:[{start:'13:00',end:'18:00'}],1:[],2:[{start:'09:00',end:'21:00'}],3:[{start:'09:00',end:'21:00'}],4:[{start:'09:00',end:'21:00'}],5:[{start:'09:00',end:'21:00'}],6:[{start:'09:00',end:'21:00'}]}},
 scheduling:{publishCadence:'weekly',overlapMinutes:30,requireTechnicianEachShift:true,minimumTechniciansPerShift:1,minimumPeoplePerShift:2,minimumMentorsPerShift:0,targetWeeklyHours:15,maximumWeeklyHours:25,areas:[{key:'front-desk',label:'Front desk'},{key:'studios',label:'Studios'},{key:'woods',label:'Woods'},{key:'metals',label:'Metals'},{key:'design',label:'Design'},{key:'textiles',label:'Textiles'},{key:'techlab',label:'TechLab'}],staffRoles:[{key:'student-technician',label:'Student technician'},{key:'technician',label:'Technician'},{key:'mentor',label:'Mentor'},{key:'manager',label:'Manager'}],shiftTemplates:[{key:'morning',label:'Morning',start:'09:00',end:'13:30'},{key:'midday',label:'Midday',start:'13:00',end:'17:30'},{key:'night',label:'Night',start:'17:00',end:'21:00'}],sundayShiftTemplates:[{key:'early',label:'Early',start:'13:00',end:'16:00'},{key:'late',label:'Late',start:'15:30',end:'18:00'}]},
 communications:{emailProvider:'gmail_smtp',fromEmail:'gocreatemakerspace@gmail.com',replyToEmail:'gocreatemakerspace@gmail.com',smsProvider:'disabled'},
 cleanup:{quarantineDays:30,numericNameCandidates:true,missingContactCandidates:true,requireNoBadge:false,requireNoAttendance:false}
};
export async function settings(){const rows=await list('settings',100);const merged=structuredClone(DEFAULTS);for(const row of rows){if(row.value&&typeof row.value==='object')merged[row.id]={...(merged[row.id]||{}),...row.value}}return merged}
export async function setSetting(section,value){await put('settings',section,{value},{merge:false});return value}
