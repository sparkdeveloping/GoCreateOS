import argparse, os, re, time, threading
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).with_name('.env')); load_dotenv(Path.cwd()/'.env')
import firebase_admin
from firebase_admin import credentials, firestore, db as realtime
from fastapi import FastAPI
from playwright.sync_api import sync_playwright

PROJECT=os.getenv('FIREBASE_PROJECT_ID','jollytiles'); PORTAL=os.getenv('GOCREATE_BASE_URL','https://portal.gocreate.com/'); EMAIL=os.getenv('GOCREATE_EMAIL',''); PASSWORD=os.getenv('GOCREATE_PASSWORD','')
cred_path=os.getenv('GOOGLE_APPLICATION_CREDENTIALS',''); opts={'projectId':PROJECT};
if os.getenv('FIREBASE_DATABASE_URL'): opts['databaseURL']=os.getenv('FIREBASE_DATABASE_URL')
if not firebase_admin._apps:
    firebase_admin.initialize_app(credentials.Certificate(cred_path) if cred_path and Path(cred_path).exists() else None,opts)
fdb=firestore.client(); app=FastAPI(title='GoCreate Directory Sync',version='6.2.0'); state={'running':False,'progress':{'phase':'idle','percent':0,'message':'Ready'},'lastError':None}
def stamp(): return datetime.now(timezone.utc).isoformat()
def publish(phase,percent,message):
    state['progress']={'phase':phase,'percent':percent,'message':message,'updatedAt':stamp()}
    try: realtime.reference('/gocreate/v6/sync').set({'running':state['running'],'progress':state['progress'],'lastError':state['lastError']})
    except Exception: pass

def txt(row,keys):
    for k in keys:
        v=row.get(k)
        if v not in (None,''): return str(v).strip()
    return ''
def normalize(row,source):
    low={re.sub(r'[^a-z0-9]+','_',str(k).lower()).strip('_'):v for k,v in row.items()}
    first=txt(low,['first_name','firstname']); last=txt(low,['last_name','lastname']); name=txt(low,['name','full_name','member','user']) or f'{first} {last}'.strip()
    email=txt(low,['email','email_address']); phone=txt(low,['phone','phone_number','mobile']); uid=txt(low,['id','user_id','member_id','membership_id']) or email or re.sub(r'\W+','-',name.lower()).strip('-')
    status=txt(low,['status','membership_status','state']).lower(); expires=txt(low,['expires','expiration','expiration_date','membership_expires'])
    return {'displayName':name or 'Unknown','firstName':first,'lastName':last,'email':email,'phone':phone,'membershipStatus':status or ('approved' if source=='memberships' else 'unknown'),'membershipExpiresAt':expires or None,'portalId':uid,'portalSource':source,'rawPortal':low,'lastPortalSyncAt':stamp()}
def scrape_table(page,url,source):
    page.goto(url,wait_until='domcontentloaded',timeout=60000); page.wait_for_timeout(1500)
    rows=[]
    for table in page.locator('table').all():
        heads=[x.inner_text().strip() for x in table.locator('thead th').all()]
        if not heads: continue
        for tr in table.locator('tbody tr').all():
            cells=[x.inner_text().strip() for x in tr.locator('td').all()]
            if cells: rows.append(dict(zip(heads,cells)))
        if rows: break
    return [normalize(r,source) for r in rows]
def login(page):
    page.goto(PORTAL,wait_until='domcontentloaded',timeout=60000); page.wait_for_timeout(1000)
    if not EMAIL or not PASSWORD: raise RuntimeError('GOCREATE_EMAIL and GOCREATE_PASSWORD are required.')
    email_sel='input[type=email], input[name*=email i], input[name*=user i]'; pass_sel='input[type=password]'
    if page.locator(pass_sel).count():
        page.locator(email_sel).first.fill(EMAIL); page.locator(pass_sel).first.fill(PASSWORD); page.locator('button[type=submit], input[type=submit]').first.click(); page.wait_for_load_state('domcontentloaded',timeout=60000); page.wait_for_timeout(1500)
def sync_once():
    if state['running']: return
    state['running']=True; state['lastError']=None; publish('login',5,'Opening GoCreate portal')
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=os.getenv('HEADLESS','true').lower()!='false'); page=browser.new_page(viewport={'width':1600,'height':1000}); login(page)
            sources=[('memberships','membership-list'),('users','users-list'),('machines','machine-scheduling-list')]
            merged={}
            for i,(source,path) in enumerate(sources):
                publish(source,15+i*25,f'Reading {source}');
                try: records=scrape_table(page,PORTAL.rstrip('/')+'/'+path,source)
                except Exception as e: records=[]; print(source,'warning',e)
                for person in records:
                    key=person.get('email') or person.get('portalId'); merged.setdefault(key,{}).update({k:v for k,v in person.items() if v not in (None,'')})
            browser.close()
        publish('firebase',88,f'Writing {len(merged)} people to Firebase'); batch=fdb.batch(); n=0
        for key,p in merged.items():
            docid=re.sub(r'[^A-Za-z0-9_-]+','_',str(key))[:120] or f'portal_{n}'; batch.set(fdb.collection('people').document(docid),p,merge=True); n+=1
            if n%400==0: batch.commit(); batch=fdb.batch()
        batch.commit(); fdb.collection('syncRuns').add({'completedAt':firestore.SERVER_TIMESTAMP,'people':len(merged),'portal':PORTAL})
        publish('complete',100,f'Directory sync complete: {len(merged)} people');
    except Exception as e:
        state['lastError']=str(e); publish('failed',100,f'Sync failed: {e}'); print('Sync failed:',e)
    finally:
        state['running']=False
        try: realtime.reference('/gocreate/v6/sync/running').set(False)
        except Exception: pass
@app.get('/health')
def health(): return {'ok':True,'version':'6.2.0','portal':PORTAL,'running':state['running'],'progress':state['progress'],'lastError':state['lastError']}
@app.post('/sync')
def start_sync():
    if state['running']: return {'ok':True,'alreadyRunning':True}
    threading.Thread(target=sync_once,daemon=True).start(); return {'ok':True,'alreadyRunning':False}
if __name__=='__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--once',action='store_true'); args=parser.parse_args()
    if args.once: sync_once()
    else:
        import uvicorn; threading.Thread(target=sync_once,daemon=True).start() if os.getenv('RUN_SYNC_ON_START','true').lower()=='true' else None; uvicorn.run(app,host='127.0.0.1',port=8000)
