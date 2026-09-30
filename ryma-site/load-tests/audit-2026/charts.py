import json
from pathlib import Path
import statistics
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

config = json.loads((Path(__file__).parent / 'latest.json').read_text(encoding='utf-8-sig'))
out = Path(config['out'])
def read(name): return json.loads((out / name).read_text(encoding='utf-8-sig'))
plt.rcParams.update({'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False, 'figure.dpi': 130})

b = read('browser-summary.json')
profiles = [('desktop-normal','Desktop'),('mobile-normal','Mobile'),('mobile-constrained','Mobile\nconstrained'),('mobile-constrained-cpu4','Mobile\nconstrained + CPU4'),('headless-control','Headless-UA\ncontrol'),('reduced-motion-control','Reduced-motion\ncontrol')]
fig, ax = plt.subplots(figsize=(11, 5.4))
for offset, key, label, color in [(-.18,'lcp','Observed LCP','#266b8e'),(.18,'primaryUsableMs','Primary actionability','#d88534')]:
    data = [[r[key]/1000 for r in b if r['profile']['name']==p and r['visit']=='first-cold'] for p,_ in profiles]
    med = np.array([statistics.median(a) for a in data]); low = med-np.array([min(a) for a in data]); high=np.array([max(a) for a in data])-med
    ax.bar(np.arange(len(profiles))+offset,med,.34,label=label,color=color,yerr=[low,high],capsize=3)
ax.axhline(2.5,color='#777',ls='--',lw=1,label='Mobile LCP target: 2.5 s')
ax.set_xticks(range(len(profiles)),[v for _,v in profiles]);ax.set_ylabel('Seconds from navigation')
ax.set_title('Ordinary first visits remain blocked beyond LCP')
ax.legend(fontsize=9,loc='upper left');ax.set_ylim(0,14)
fig.text(.01,.01,'Production localhost · cold browser contexts · n=5/profile · bars=median, whiskers=min–max · controls use different splash branches',fontsize=8)
fig.tight_layout(rect=[0,.06,1,1]);fig.savefig(out/'browser-loading.png');plt.close(fig)

a=read('api-summary.json');sizes=[100,1000,10000]
fig, axes=plt.subplots(1,2,figsize=(10,4.5))
analytics=[next(r['p95'] for r in a if r['size']==s and r['name']=='analytics') for s in sizes]
axes[0].plot(sizes,analytics,'o-',color='#266b8e');axes[0].axhline(2000,color='#bc542f',ls='--',label='2,000 ms target');axes[0].set_xscale('log');axes[0].set_ylabel('All-time analytics p95, ms');axes[0].legend()
for name,label in [('patients_all','Full patients + sessions'),('patients_page','50-patient page')]:
    axes[1].plot(sizes,[next(r['meanBytes']/1e6 for r in a if r['size']==s and r['name']==name) for s in sizes],'o-',label=label)
axes[1].set_xscale('log');axes[1].set_ylabel('Decoded response size, MB');axes[1].legend(fontsize=8)
for ax in axes: ax.set_xticks(sizes,[str(s) for s in sizes]);ax.set_xlabel('Synthetic patients')
fig.suptitle('Analytics CPU cost and full-list payloads grow poorly')
fig.text(.01,.01,'Warm local SQLite · analytics n=100/scale · full lists n=20, pages n=100 · decoded bytes are not wire transfer',fontsize=8)
fig.tight_layout(rect=[0,.05,1,.94]);fig.savefig(out/'dataset-growth.png');plt.close(fig)

load=read('load-summary.json');quality=read('load-quality.json')
stages=[r for r in load if r['phase'] in ['sustained-5-repeat','sustained-10','sustained-25','sustained-50','stress-100','stress-200']];stages.sort(key=lambda r:r['vus'])
fig,ax=plt.subplots(figsize=(9,4.8))
for name,label in [('availability','Availability'),('admin_patients','Full patients'),('admin_appointments','Full appointments'),('public_home','Homepage HTTP')]:
    values=[r['operations'].get(name,{}).get('p95') for r in stages];ax.plot([r['vus'] for r in stages],[v if v is not None else np.nan for v in values],'o-',label=label)
ax.axhline(500,color='#333',ls='--',lw=1,label='Routine-read target: 500 ms');ax.set_yscale('log');ax.set_xscale('log',base=2);ax.set_xticks([5,10,25,50,100,200],[5,10,25,50,100,200]);ax.set_ylabel('HTTP p95, ms (log scale)');ax.set_xlabel('Concurrent virtual users, 1–3 s think time');ax.set_title('Read latency crosses targets above the 50-user hold');ax.legend(fontsize=8)
fig.text(.01,.01,'Same-host production Node + SQLite · holds: 180 s to 50 VUs, 123 s at 100, stopped after 73 s at 200 · no field capacity claim',fontsize=8)
fig.tight_layout(rect=[0,.05,1,1]);fig.savefig(out/'load-envelope.png');plt.close(fig)

from datetime import datetime
soak=next(r for r in load if r['phase']=='soak-10');begin=datetime.fromisoformat(soak['startedAt'].replace('Z','+00:00'));end=datetime.fromisoformat(soak['finishedAt'].replace('Z','+00:00'))
resources=[json.loads(l) for l in (out/'server-resources.jsonl').read_text().splitlines() if l]
resources=[r for r in resources if soak['startedAt']<=r['time']<=soak['finishedAt']]
x=[(datetime.fromisoformat(r['time'].replace('Z','+00:00'))-begin).total_seconds()/60 for r in resources]
fig,axes=plt.subplots(2,1,figsize=(10,5.5),sharex=True)
axes[0].plot(x,[r['rss']/2**20 for r in resources],color='#266b8e');axes[0].set_ylabel('Server RSS, MiB');axes[0].set_title('Thirty-minute soak: memory and event-loop trajectory')
axes[1].plot(x,[r['eventLoopP99Ms'] for r in resources],color='#d88534');axes[1].set_ylabel('5-second-window\nloop p99, ms');axes[1].set_xlabel('Minutes into 10-user soak')
fig.text(.01,.01,'Growing synthetic dataset; brief dashboard diagnostics during soak · no observed memory-growth trend is not proof against long-term leaks',fontsize=8)
fig.tight_layout(rect=[0,.05,1,1]);fig.savefig(out/'soak-resources.png');plt.close(fig)
print('Saved four evidence charts to',out)
