import sys
sys.path.insert(0, '.video-tools')
import cv2
from PIL import Image, ImageDraw
v=cv2.VideoCapture(sys.argv[1])
print('fps',v.get(5),'duration',v.get(7)/v.get(5))
sheet=Image.new('RGB',(1600,1920));d=ImageDraw.Draw(sheet)
for n,t in enumerate([0,1,2,3,4,5,6,7]):
 v.set(cv2.CAP_PROP_POS_MSEC,t*1000);ok,f=v.read()
 if ok:
  im=Image.fromarray(cv2.cvtColor(f,cv2.COLOR_BGR2RGB));im.thumbnail((800,450));x=(n%2)*800;y=(n//2)*480
  sheet.paste(im,(x,y+25));d.text((x+8,y+5),str(t)+' seconds',fill='white')
sheet.save('analysis/turn1-video.jpg')
