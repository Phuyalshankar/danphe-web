const fs = require('fs');
const { execSync } = require('child_process');

let html = fs.readFileSync('C:/Users/USER/Desktop/dolphincss/dolphincss/demo_dolphincss2.html', 'utf8');
html = html.replace('href="./dolphin-css.css"', 'href="file:///C:/Users/USER/Desktop/dolphincss/dolphincss/dolphin-css.css"');
const testHtml = html.replace(
  '</body>',
  `<div id="inspect-res"></div><script>
    setTimeout(() => {
      const b = document.querySelector("button.filled.primary");
      if (!b) return;
      const cs = window.getComputedStyle(b);
      document.getElementById("inspect-res").textContent = JSON.stringify({
        bg: cs.backgroundColor,
        bi: cs.backgroundImage,
        color: cs.color,
        pad: cs.padding,
        br: cs.borderRadius,
        bs: cs.boxShadow,
        display: cs.display
      });
    }, 500);
  </script></body>`
);
fs.writeFileSync('D:/danphe-web/inspect.html', testHtml, 'utf8');

const cmd = '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless --disable-gpu --allow-file-access-from-files --virtual-time-budget=2000 --dump-dom D:\\danphe-web\\inspect.html';
const out = execSync(cmd).toString();
const m = out.match(/<div id="inspect-res">([^<]+)<\/div>/);
console.log('COMPUTED STYLE OF button.filled.primary in demo:\n', m ? m[1] : 'Not found');
