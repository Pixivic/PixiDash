(() => {
  "use strict";

  const sheets = {
    runner: [53, 52, 8, [
      [27, 15, 22, 35, "ABwAgA8A8AM//OA/P/y/h///8f8//v7/v///5///8f8//v8f///H/3/g/x/4/wf4/wP+/8D/D/D/B/z/g///4f9/+P8//v8P/v8D/3/A/wHwfwD8HwDfB8D3AfD/APw+AA=="],
      [28, 16, 22, 33, "ABwAgA8A8AM//OA/P/y/h/////////7/v///5///8f8//v+f///H/3/g/z/g/w/8/wD/f/D/P/7/n///5///+////P8///8H/A+A/wfw4Qc++IEPPuAHB+ABAA=="],
      [28, 15, 24, 31, "ABwAAD4ABj9gHj9wfj94/j18/v9//v9//P9//P8//P8/+P8f/P8/+P8//P8P+P8f8P8f+P8f+P8//v9///9//////////////v98/v8G8P8H8P8H/PEH/OADfMAB"],
      [29, 14, 23, 35, "ADgAAD6AgR/Yww/u54f37+H7//j9P/78/3/+/x///w///8P//+P//+H/P/D/H/D/D/j/D/j/B/7/wP//8P9//P8//v8f/v8f//8P//+H//8B/weA/wfgww/44Ad88AF8cAA8AAA="],
      [29, 15, 22, 35, "AOAAAHwwgB8/4Oc/+P0/vP+f9//v/v7/v///5///8f8//v8f///n/3/w/x/4/wf+/wP+/8D/D/j/B///4f9/+P8f/v+P///D///A/x/wfwD8HwD+B8DnAfj4AH5+AB8fAA=="],
      [28, 16, 22, 33, "AHAAAD4AwA8/8OM//Pw/nv////////7/v///5///8f8//v+f///H/3/g/z/g/w/8/wD/f8D/H/j/B/7/gf//4P8/8P8P+P8B/A8A/wOAfwDADwDwAwD+AYB/AA=="],
      [27, 15, 22, 33, "AHAAAD4AwA8/8OM//Pw/nv////////7/v///5///8f8//v8f///H/3/g/z/g/w/4/wD8fwD/H8D/B/D/Afz/AP4/gP8P4P8B+B8A/g+A/wP4/wD+P4DHB0DAAA=="],
      [26, 14, 22, 35, "AHAAAD4AwA8/8OM//Pw/nv+f9//v/v7/v///5///8f8//v8f///H/3/A/x/w/wfw/wP+/4D/D+D/B/D/A/7/gf9/4P8/+P8P/v8D/n8A/wPA/wDgHwDwAwD8AIB/AOAfAA=="],
    ]],
    death: [53, 52, 1, [
      [9, 14, 43, 36, "APAfAAAA4P8DAACA/z8AAAD+/wMAAPj/PwAA4P//AwCA//8/AAD8//8BAPD//x8AgP///wAA/P//BwDw//B/AID/A/8DAPwP+B8A4D+A/wAA/wH8BwD8D/AfAOD/gH8AAP8P/AMA+H/wH8CP/4N/+H/4H/7//5n/8P//7/yD//8//x/+///5f/D//4f/4f//P/iH////AA/+//8fAPz///8B8P///x+A/////wD8////B+D///8fAPP///8B8P///w8="],
    ]],
    spikes: [16, 32, 2, [
      [0, 0, 16, 32, "wADAAcABwAPAA8ADwAPAA8wb3B/c3/z/////////////////////f/9//n/+f/5//n/+f/x//D/8P/w//D/8Pw=="],
      [0, 16, 16, 16, "AAGAA8ADw8PH58/37/f///5//n/+f/5//////////n8="],
    ]],
    bee: [38, 38, 4, [
      [4, 11, 29, 25, "AIDDAAD4PACA/w8A+P8BAP8/APD/BwD+/wDA/x8A+P8BAP8fAP7/AfD/H8D//wP8///A//8/+P//H////8/////z//8//v//gf//D/D//wD8/w8A/38AgAcAAA=="],
      [4, 14, 30, 22, "AAA4AAAAnwMA4P8BAPj/AID/PwDw/w8A/v8D3v//4P//H////+f////8//8f////w////+P////x//8//P//A/7/P4D//wfA//8A4P8PAOABAAA="],
      [4, 13, 30, 23, "AAAfAADgDwAA/AcAgP8HAPD/BwD8/wOA//8B8P//gP//P/j//8/////7//9/////zv////D////4//9//P//D////4D//w/g//8B8P8/APj/AwB4AAAA"],
      [4, 9, 29, 27, "AHAAAAD/AADwPwAA/g8AwP8DAPB/AAD+DwDA/wEA+D8AAP8DAOB/AAD+BwD4fwDA/x8A//8P8P//A////+D//3/8//8/////z/////j//wf+/z/A//8D8P8/APz/AQAeAAA="],
    ]],
    beeTransition: [38, 38, 3, [
      [4, 11, 31, 23, "AABwAAAAfA4AAP8PAID/DwDw/wcA/P8DAP//Ac///+D//z/+//+f////5/////H//3/4//8D+P//A/j//wH8//8A/P//AP7//wD+/38A/v9/APz/PwAAfgAA"],
      [5, 11, 31, 27, "AAA+AACAPwAA4D8AAPh/AHj+/wD////w/////P/////////////////73///48f//8Hh//8B4P//APD/fwDw/z8A8P8fAOD/DwDA/wcA4P8DAOD/AADgPwAAwA8AAMADAADgAAAAMAAA"],
      [4, 10, 25, 27, "AIADAIB/AID/AQD/B+D/H/D/P/z/f/z///z///n///H//8P//wP//wP+/wP4/wPw/wPg/wPg/wfg/w/A/x+A/z8A/z8A/n8A/n8A/n8A/n8APD8AAA=="],
    ]],
    engaged: [38, 38, 4, [
      [0, 12, 34, 24, "AMADAADAPwAA4P8BAMD/7zCA///nAf7//w/4//8/wP///wD+//8D+P//D8D//z+A//9/gP///wD///8B/v//A/7//wf+//8H/P//AeD//wMA/v8HAOD/DwAA/x8AAPg/AACAPwAA"],
      [0, 12, 38, 24, "AMADAAAA/AMAAOD/AQAA/P8AAID/PwAA4P8fAAD4/4cDAPz/8TkA/n/+H4D/n/8PwP///wP4////gP///z/w////D/7////h////f/7////P/////+H//+M/4P9/AADg/w8AAPD/AQAA+D8AAAD4AwAA"],
      [0, 12, 38, 24, "AMADAAAA/AMAAOD/AQAA/P8AAID/PwAA4P/fBwD4//8DAPz//wEA/v//AYD///8BwP///wD4//9/gP///z/w////D/7////j///H//7//4Df//8PgOP//wMA4P9/AADg/w8AAPD/AQAA+D8AAAD4AwAA"],
      [0, 12, 30, 24, "AMADAAD8HwDg/38A/P8/gP//H+D//w/4//8D/P//AP7/P4D//w/A//8B+P9/gP//D/D//wH+/z/g//8H/v//wP//D+D//wPg/38A4P8PAPD/AQD4PwAA+AMA"],
    ]],
    boar: [29, 18, 4, [
      [0, 0, 29, 18, "gA8AAPwHAMD/AQD8/w+A//+H+f//Of///8f////7///v/////P//j////+H//z/8//8D//9/wP//B/j/fwDuuQcA"],
      [0, 1, 28, 17, "gA8AAP4DAPD/H4D//8f4///O/////P//j///f/v///P//z/////z//8//v//4f//D/z/f8D3/wM4nh8A"],
      [0, 0, 28, 18, "gA8AAP4DAPB/AID//8H4/3/O/////P//j///f/v///f//z/////z//8//v//4///H/z//4H//w/4/38A89wD"],
      [0, 1, 28, 17, "gA8AAP4DAPD/H4D//8f4///O/////P//j///f/v///P//z/////z//8//v//4///P/z//wH//w/g53gA"],
    ]],
    grass: [16, 16, 3, [
      [0, 0, 16, 16, "/P/+/////////////v/+/////////////v/+//7//v8="],
      [0, 0, 16, 16, "//////////////////////////////////////////8="],
      [0, 0, 16, 16, "/z//f////////////3//f////////////3//f/9//38="],
      [0, 0, 16, 16, "///////////+//7//v/+//z//P/8//z//v/+//7//v8="],
      [0, 0, 16, 16, "//////////////////////////////////////////8="],
      [0, 0, 16, 16, "////////////f/9//3//f/8//z//P/8//3//f/9//38="],
      [0, 0, 16, 16, "///////////+//7//v/+//z//P/8//z//v/+//7//v8="],
      [0, 0, 16, 16, "//////////////////////////////////////////8="],
      [0, 0, 16, 16, "////////////f/9//3//f/8//z//P/8//3//f/9//38="],
    ]],
  };

  const frames = Object.fromEntries(Object.entries(sheets).map(([sheet, [width, height, columns, masks]]) => [
    sheet, masks.map(([left, top, maskWidth, maskHeight, data], index) => ({
      sheet, width, height, left, top, maskWidth, maskHeight,
      sx: index % columns * width,
      sy: Math.floor(index / columns) * height,
      mask: Uint8Array.from(atob(data), (byte) => byte.charCodeAt(0)),
    })),
  ]));

  function pose(frame, x, y, flipped = false) {
    x = Math.round(x);
    y = Math.round(y);
    const left = x + (flipped ? frame.width - frame.left - frame.maskWidth : frame.left);
    const top = y + frame.top;
    return { frame, x, y, flipped, left, top, right: left + frame.maskWidth, bottom: top + frame.maskHeight };
  }

  function pixelAt(sprite, x, y) {
    const { mask, maskWidth } = sprite.frame;
    const column = sprite.flipped ? sprite.right - x - 1 : x - sprite.left;
    const index = (y - sprite.top) * maskWidth + column;
    return mask[index >>> 3] & (1 << (index & 7));
  }

  function overlaps(a, b) {
    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    for (let y = Math.max(a.top, b.top); y < bottom; y++) {
      for (let x = left; x < right; x++) {
        if (pixelAt(a, x, y) && pixelAt(b, x, y)) return true;
      }
    }
    return false;
  }

  function interpolate(from, to, time) {
    if (from.x === to.x && from.y === to.y) return from;
    return pose(from.frame, from.x + (to.x - from.x) * time, from.y + (to.y - from.y) * time, from.flipped);
  }

  function contact(a, nextA, b, nextB) {
    if (Math.max(a.x, nextA.x) + a.frame.width <= Math.min(b.x, nextB.x)
      || Math.max(b.x, nextB.x) + b.frame.width <= Math.min(a.x, nextA.x)
      || Math.max(a.y, nextA.y) + a.frame.height <= Math.min(b.y, nextB.y)
      || Math.max(b.y, nextB.y) + b.frame.height <= Math.min(a.y, nextA.y)) return null;

    const crossings = [0, 1];
    for (const distance of [nextA.x - a.x, nextA.y - a.y, nextB.x - b.x, nextB.y - b.y]) {
      const steps = Math.abs(distance);
      for (let i = 0; i < steps; i++) crossings.push((i + 0.5) / steps);
    }
    crossings.sort((left, right) => left - right);
    for (let i = 1; i < crossings.length; i++) {
      if (crossings[i] === crossings[i - 1]) continue;
      const time = (crossings[i] + crossings[i - 1]) / 2;
      const first = interpolate(a, nextA, time);
      const second = interpolate(b, nextB, time);
      if (overlaps(first, second)) return { first, second };
    }
    return overlaps(nextA, nextB) ? { first: nextA, second: nextB } : null;
  }

  globalThis.PixiSprites = { frames, pose, contact };
})();
