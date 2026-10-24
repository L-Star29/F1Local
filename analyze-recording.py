import sys
sys.path.insert(0,'.tools/video')
import av
from pathlib import Path
from PIL import Image,ImageDraw
path=r'C:/Users/lokir/Videos/Screen Recordings/Screen Recording 2026-10-22 190528.mp4'
c=av.open(path,options={'probesize':'1000000','analyzeduration':'1000000'});v=c.streams.video[0];print(v.width,v.height,v.average_rate,flush=True)
out=Path('analysis/driving');out.mkdir(parents=True,exist_ok=True)
times=list(range(10,282,8))
for batch in range(3):
 sheet=Image.new('RGB',(1500,4*302),'#17212b');d=ImageDraw.Draw(sheet)
 for k,t in enumerate(times[batch*12:(batch+1)*12]):
  c.seek(int(t/v.time_base),stream=v)
  for frame in c.decode(v):
   if float(frame.time)>=t:break
  im=frame.to_image();im.save(out/f'{t:03}.jpg');im.thumbnail((500,280));x=k%3*500;y=k//3*302;sheet.paste(im,(x,y+22));d.text((x+5,y+4),f'{t//60}:{t%60:02}',fill='white')
 sheet.save(out/f'sheet-{batch}.jpg')
print('frames saved',flush=True)
