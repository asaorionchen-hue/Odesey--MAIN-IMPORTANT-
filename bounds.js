const Jimp = require('jimp');
Jimp.read('./src/tile-set-grego.png').then(img => {
   let w = img.bitmap.width;
   let h = img.bitmap.height;
   
   let streaks = [];
   for (let x = 0; x < w; x++) {
      let miny = h, maxy = 0;
      let hasAlpha = false;
      for (let y = 0; y < h; y++) {
         let alpha = img.bitmap.data[(w * y + x) * 4 + 3];
         if (alpha > 10) {
             if (y < miny) miny = y;
             if (y > maxy) maxy = y;
             hasAlpha = true;
         }
      }
      if (hasAlpha) {
         streaks.push({x: x, miny: miny, maxy: maxy, height: maxy - miny});
      }
   }
   
   let objects = [];
   if (streaks.length > 0) {
       let cur = {minx: streaks[0].x, maxx: streaks[0].x, miny: streaks[0].miny, maxy: streaks[0].maxy};
       for(let i=1; i<streaks.length; i++) {
          if (streaks[i].x <= cur.maxx + 20) { // allow 20px gap laterally
              cur.maxx = Math.max(cur.maxx, streaks[i].x);
              cur.miny = Math.min(cur.miny, streaks[i].miny);
              cur.maxy = Math.max(cur.maxy, streaks[i].maxy);
          } else {
              objects.push(cur);
              cur = {minx: streaks[i].x, maxx: streaks[i].x, miny: streaks[i].miny, maxy: streaks[i].maxy};
          }
       }
       objects.push(cur);
   }
   
   console.log("Found objects:");
   objects.forEach((o, i) => {
       console.log(`Obj ${i}: x: ${o.minx}, y: ${o.miny}, w: ${o.maxx - o.minx + 1}, h: ${o.maxy - o.miny + 1}`);
   });
});
