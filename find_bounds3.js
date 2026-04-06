const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('./src/tile-set-grego.png')
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    let w = this.width, h = this.height;
    // We are looking for the tall pillar, which is probably on the right side and very tall.
    let streaks = [];
    for (let x = 0; x < w; x++) {
      let miny = h, maxy = 0;
      let hasAlpha = false;
      for (let y = 0; y < h; y++) {
         let idx = (w * y + x) << 2;
         if (this.data[idx+3] > 10) {
             if (y < miny) miny = y;
             if (y > maxy) maxy = y;
             hasAlpha = true;
         }
      }
      if (hasAlpha) {
         streaks.push({x: x, miny: miny, maxy: maxy, height: maxy - miny});
      }
    }
    
    // Group adjacent streaks
    let objects = [];
    if (streaks.length > 0) {
        let cur = {minx: streaks[0].x, maxx: streaks[0].x, miny: streaks[0].miny, maxy: streaks[0].maxy};
        for(let i=1; i<streaks.length; i++) {
           // Allow 1 pixel gap
           if (streaks[i].x === cur.maxx + 1 || streaks[i].x === cur.maxx + 2 || streaks[i].x === cur.maxx + 3) {
               cur.maxx = streaks[i].x;
               if (streaks[i].miny < cur.miny) cur.miny = streaks[i].miny;
               if (streaks[i].maxy > cur.maxy) cur.maxy = streaks[i].maxy;
           } else {
               objects.push(cur);
               cur = {minx: streaks[i].x, maxx: streaks[i].x, miny: streaks[i].miny, maxy: streaks[i].maxy};
           }
        }
        objects.push(cur);
    }
    
    console.log("Found objects:");
    objects.forEach(o => {
        console.log(`x: ${o.minx}, y: ${o.miny}, w: ${o.maxx - o.minx + 1}, h: ${o.maxy - o.miny + 1}`);
    });
  });
