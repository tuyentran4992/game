from PIL import Image
import numpy as np, hashlib, json
from pathlib import Path
OUT=Path("/data/youtube-playables/M9-DeepCast/game/public/assets")
p=OUT/"bg_vents.png"
im=Image.open(p).convert("RGB"); a=np.array(im).astype(np.int16)
h=a.shape[0]
ys=np.linspace(0,1,h)[:,None]
# floor navy doc theo chieu sau: tren ~ (26,66,104) -> day ~ (14,30,58)
r_=26-12*ys; g_=66-36*ys; b_=104-46*ys
floor=np.concatenate([r_,g_,b_],-1).astype(np.int16)[:,None,:]
a=np.maximum(a, floor)
lum=a.mean(-1)
mask=(lum>175)&(a[...,0]>150)&(a[...,2]<200)  # bot trang am
a[mask]=np.array([120,148,172])
Image.fromarray(a.astype(np.uint8)).quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB").save(p, optimize=True)
man=Path("/data/youtube-playables/M9-DeepCast/assets/manifest.json"); m=json.loads(man.read_text())
m["files"]["bg_vents"]["sha"]=hashlib.sha256(p.read_bytes()).hexdigest()[:12]
m["files"]["bg_vents"]["bytes"]=p.stat().st_size
man.write_text(json.dumps(m,indent=1))
print("bg_vents new:",p.stat().st_size,"sha",m["files"]["bg_vents"]["sha"])
# build lai + screenshot lai vung vents
import subprocess
subprocess.run(["node","node_modules/vite/bin/vite.js","build"],cwd="/data/youtube-playables/M9-DeepCast/game",capture_output=True)
print("rebuilt")
