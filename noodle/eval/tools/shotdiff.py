# Compare two screenshot folders pixel by pixel: python3 shotdiff.py <before> <after>. Prints each file that differs and the share of pixels changed.
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1:3]
bad = 0
names = sorted(f for f in os.listdir(a) if f.endswith('.png'))
for f in names:
    if not os.path.exists(os.path.join(b, f)):
        print('MISSING', f); bad += 1; continue
    x = Image.open(os.path.join(a, f)).convert('RGB'); y = Image.open(os.path.join(b, f)).convert('RGB')
    if x.size != y.size:
        print('SIZE', f, x.size, y.size); bad += 1; continue
    d = ImageChops.difference(x, y); bb = d.getbbox()
    if bb:
        n = sum(1 for p in d.convert('L').getdata() if p > 8)
        print('DIFF %s  %.3f%% of pixels  box %s' % (f, 100 * n / (x.size[0] * x.size[1]), bb)); bad += 1
print('same' if not bad else '%d differ' % bad, '(%d files)' % len(names))
