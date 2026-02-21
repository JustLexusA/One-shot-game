let coins = 0;
let baseCoin = 1;
let coinMultiplier = 1; // multiplicative upgrades
let clickCount = 0;
let floating = [];
let upgrades = {
  baseCost: 10,
  baseLevel: 0,
  multCost: 50,
  multLevel: 0
};

// Rebirth / prestige
const REBIRTH_REQUIREMENT = 10000; // coins needed to rebirth
const PRESTIGE_REQUIREMENT = 1000000; // coins needed to prestige
let rebirthTokens = 0;
let rebirthUpgrades = { // permanent multipliers bought with tokens
  coinMulti: { level: 0, cost: 1, mult: 3 },
  tokenMulti: { level: 0, cost: 2, mult: 2 }
};

let prestigePoints = 0;
let prestigeUpgrades = {
  coinMulti: { level: 0, cost: 1, mult: 10 },
  tokenMulti: { level: 0, cost: 2, mult: 3 },
  prestigeGain: { level: 0, cost: 3, mult: 2 }
};

// final click-count upgrade
let finalUpgrade = { bought: false, cost: 1e12 };

// critical
let critChance = 2.5; // percent
let critChanceMax = 10;
let critUpgradeCost = 1; // token cost
let critUpgrade = { level: 0, cost: 1 };

// UI button highlights and rects
let buttonHighlights = {}; // id -> millis() when clicked
let buttonRects = {}; // id -> {x,y,w,h}
const HIGHLIGHT_DURATION = 300; // ms

// UI toggles
let colorToggle = false;
let lastBgChange = 0;
let bgIndex = 0;
let bgColors = ["#0f172a", "#041014", "#10223a", "#1b0b2b"];
let lastButtonColorChange = 0;

let clickSoundEnabled = true;

let bob;
let lastBobCoinTime = 0;
let bobCoin = null;
let lastSaveTime = 0;
let lastLoadTime = 0;
// canvas & UI sizing
const CANVAS_W = 1024;
const CANVAS_H = 640;
let cnv = null;

function setup(){
  cnv = createCanvas(CANVAS_W, CANVAS_H);
  cnv.parent('canvas-holder');
  // center canvas in window
  cnv.position((windowWidth - width) / 2, (windowHeight - height) / 2);
  textFont('Arial');
  textStyle(BOLD);

  // UI elements handled by p5 drawing
  bob = new Bob();
  // load saved state and start autosave
  loadState();
  setInterval(saveState, 5000);
  window.addEventListener('beforeunload', saveState);
}

function windowResized(){
  // keep canvas fixed size but re-center when window changes
  cnv.position((windowWidth - width) / 2, (windowHeight - height) / 2);
}

function draw(){
  updateBackground();
  drawUI();
  drawButton();
  updateFloating();
  bob.update();
  bob.draw();
  drawBobCoin();
}

function updateBackground(){
  if(millis() - lastBgChange > 5000){
    lastBgChange = millis();
    bgIndex = (bgIndex+1) % bgColors.length;
  }
  background(bgColors[bgIndex]);
}

function drawUI(){
  // Left panel: Stats & Normal Upgrades
  push();
  let leftX = 8, leftW = 260, leftH = 560;
  fill(0,160);
  noStroke();
  rect(leftX,12,leftW,leftH,8);
  fill(255);
  textSize(20);
  textStyle(BOLD);
  text("Stats & Upgrades",leftX+10,40);

  // Coins and stats
  fill(255,215,0);
  textSize(18);
  text("Coins: "+formatNumber(coins),leftX+10,72);
  textSize(14);
  fill(200);
  text("Coin/Click: "+formatNumber(getCoinPerClick()),leftX+10,98);
  text("Clicks: "+clickCount,leftX+10,118);

  // Upgrades header
  fill(255);
  textSize(18);
  text("Upgrades",leftX+10,150);

  // base & multiplier & final
  let ux = leftX+10, uy = 160, uw = leftW-40, uh = 32;
  drawUpgradeButton('base', ux, uy, uw, uh, "Increase base (+1)", "Cost: "+upgrades.baseCost);
  drawUpgradeButton('mult', ux, uy+44, uw, uh, "Increase mult (+10%)", "Cost: "+upgrades.multCost);
  if(!finalUpgrade.bought){
    drawUpgradeButton('final', ux, uy+88, uw, uh, "Final: x clicks", "Cost: "+formatNumber(finalUpgrade.cost));
  } else {
    fill(180); textSize(12); text("Final click multiplier bought", ux+6, uy+88+20);
  }
  pop();

  // Right panel: Rebirth & Prestige (separate from normal upgrades)
  push();
  let rightW = 260, rightH = 560; let rx = width - rightW - 12, rw = rightW;
  fill(0,160); noStroke(); rect(rx,12,rw,rightH,8);
  fill(255); textSize(26); textStyle(BOLD); text("Rebirth & Prestige", rx+10,40);

  // tokens/points display
  fill(144,238,144); noStroke(); ellipse(rx+28,72,18,18); fill(0); textSize(11); textAlign(CENTER,CENTER); text("R",rx+28,72);
  fill(255); textAlign(LEFT); textSize(14); text("Rebirth Tokens: "+rebirthTokens, rx+50,74);
  fill(135,206,235); noStroke(); ellipse(rx+28,96,18,18); fill(0); textSize(11); textAlign(CENTER,CENTER); text("P",rx+28,96);
  fill(255); textAlign(LEFT); textSize(14); text("Prestige Points: "+prestigePoints, rx+50,98);

  // Rebirth Upgrades (tokens)
  fill(255); textSize(16); text("Rebirth Upgrades (tokens)", rx+10,132);
  let ry = 146; let rwbtn = rw-40; let rhbtn = 30;
  drawUpgradeButton('rebCoin', rx+10, ry, rwbtn, rhbtn, "Permanent coin x2", "Cost: "+rebirthUpgrades.coinMulti.cost+" Tkns");
  drawUpgradeButton('rebToken', rx+10, ry+44, rwbtn, rhbtn, "Increase token gain", "Cost: "+rebirthUpgrades.tokenMulti.cost+" Tkns");
  drawUpgradeButton('rebCrit', rx+10, ry+88, rwbtn, rhbtn, "Crit chance +0.5%", "Cost: "+critUpgrade.cost+" Tkns");

  // Prestige Upgrades
  let py = ry+140;
  fill(255); textSize(16); text("Prestige Upgrades (pts)", rx+10, py-12);
  drawUpgradeButton('preCoin', rx+10, py, rwbtn, rhbtn, "Prestige: coin x3", "Cost: "+prestigeUpgrades.coinMulti.cost+" pts");
  drawUpgradeButton('preToken', rx+10, py+44, rwbtn, rhbtn, "Prestige: token x2", "Cost: "+prestigeUpgrades.tokenMulti.cost+" pts");
  drawUpgradeButton('preGain', rx+10, py+88, rwbtn, rhbtn, "Prestige: prestige+", "Cost: "+prestigeUpgrades.prestigeGain.cost+" pts");

  // Rebirth & Prestige action buttons (short labels) and requirement text above
  let ay = py+140;
  drawSmallButton('rebirth', rx+10, ay, 120, 32, "Rebirth");
  drawSmallButton('prestige', rx+140, ay, 120, 32, "Prestige");
  fill(200); textSize(12); textAlign(LEFT);
  text("Req (rebirth): "+formatNumber(REBIRTH_REQUIREMENT)+" coins", rx+10, ay-18);
  text("Req (prestige): "+formatNumber(PRESTIGE_REQUIREMENT)+" coins", rx+140, ay-18);

  pop();
}

function drawUpgradeButton(id, x, y, w, h, label, cost){
  // store rect for click handling
  buttonRects[id] = {x,y,w,h};
  let active = buttonHighlights[id] && (millis() - buttonHighlights[id] < HIGHLIGHT_DURATION);
  fill(active? color(70,120,255) : 50);
  stroke(255,8);
  rect(x,y,w,h,8);
  noStroke();
  fill(255);
  textSize(14);
  text(label,x+8,y+20);
  fill(200);
  text(cost,x+w-110,y+20);
}

function drawSmallButton(id, x, y, w, h, label, cb){
  buttonRects[id] = {x,y,w,h};
  let active = buttonHighlights[id] && (millis() - buttonHighlights[id] < HIGHLIGHT_DURATION);
  fill(active? color(70,120,255) : 40);
  rect(x,y,w,h,8);
  fill(255);
  textSize(14);
  text(label,x+8,y+20);
}

function drawButton(){
  // bottom centered button
  let bw = 260;
  let bh = 80;
  let bx = width/2 - bw/2;
  let by = height - bh - 28;

  if(colorToggle && millis() - lastButtonColorChange > 1000){
    lastButtonColorChange = millis();
  }
  let t = (colorToggle && floor(millis()/1000)%2==0) ? color(255,140,0) : color(200,80,40);
  // highlight main click button if recently clicked
  let activeMain = buttonHighlights['main'] && (millis() - buttonHighlights['main'] < HIGHLIGHT_DURATION);
  let mainColor = activeMain ? color(255,200,120) : t;

  fill(mainColor);
  stroke(255);
  strokeWeight(2);
  rect(bx,by,bw,bh,16);
  // register main click rect for highlight & clicks
  buttonRects['main'] = {x:bx,y:by,w:bw,h:bh};
  noStroke();
  fill(255,235,120);
  textSize(36);
  textStyle(BOLD);
  textAlign(CENTER,CENTER);
  text("CLICK",bx+bw/2,by+bh/2);

  // detect mouse over and clickable handled in mousePressed
  textAlign(LEFT);
  // right-side toggle UI
  push();
  let rx = width - 140, ry = 12, rw = 128, rh = 48;
  fill(0,160); stroke(255,40); rect(rx,ry,rw,rh,8);
  noStroke(); fill(255); textSize(14); textAlign(LEFT, CENTER);
  text("Toggle Button Color", rx+8, ry+rh/2);
  fill(colorToggle? '#3ee67a' : '#444'); rect(rx+rw-42, ry+8, 32, 32,6);
  // register toggle rect
  buttonRects['toggle'] = {x:rx,y:ry,w:rw,h:rh};
  
  // Save/Load buttons and status
  let sbx = rx, sby = ry + rh + 8, sbw = 60, sbh = 28;
  // Save
  fill(30); stroke(255,30); rect(sbx, sby, sbw, sbh,6);
  noStroke(); fill(255); textSize(14); textAlign(CENTER, CENTER); text("Save", sbx+sbw/2, sby+sbh/2);
  // register save rect
  buttonRects['save'] = {x:sbx,y:sby,w:sbw,h:sbh};
  // Load
  fill(30); stroke(255,30); rect(sbx+sbw+8, sby, sbw, sbh,6);
  noStroke(); fill(255); textSize(14); textAlign(CENTER, CENTER); text("Load", sbx+sbw+8+sbw/2, sby+sbh/2);
  // register load rect
  buttonRects['load'] = {x:sbx+sbw+8,y:sby,w:sbw,h:sbh};

  // status
  let statusX = rx, statusY = sby + sbh + 12;
  fill(200); textSize(14); textAlign(LEFT, TOP);
  if(lastSaveTime>0){
    let sec = floor((millis()-lastSaveTime)/1000);
    text("Saved: "+sec+"s ago", statusX, statusY);
  } else {
    text("Saved: never", statusX, statusY);
  }
  if(lastLoadTime>0 && millis()-lastLoadTime<3000){ text(" • Loaded just now", statusX+100, statusY); }

  pop();
}

function mousePressed(){
  // play sound
  playClickSound();

  // main click via registered rect if available
  if(buttonRects['main']){
    let r = buttonRects['main'];
    if(mouseX>r.x && mouseX<r.x+r.w && mouseY>r.y && mouseY<r.y+r.h){ buttonHighlights['main'] = millis(); doClick(); return; }
  }

  // try collecting Bob's coin if clicked nearby
  if(tryCollectBobCoin(mouseX, mouseY)) return;

  // Check any registered button rects (excluding main handled above)
  for(let id in buttonRects){
    if(id === 'main') continue;
    let r = buttonRects[id];
    if(mouseX>r.x && mouseX<r.x+r.w && mouseY>r.y && mouseY<r.y+r.h){
      // register highlight
      buttonHighlights[id] = millis();
      // handle actions
      switch(id){
        case 'base':
            if(coins>=upgrades.baseCost){ coins-=upgrades.baseCost; upgrades.baseLevel++; baseCoin+=1; upgrades.baseCost = Math.max(1, Math.floor(upgrades.baseCost*1.12)); }
          break;
        case 'mult':
          if(coins>=upgrades.multCost){ coins-=upgrades.multCost; upgrades.multLevel++; coinMultiplier += 0.1; upgrades.multCost = Math.max(1, Math.floor(upgrades.multCost*1.15)); }
          break;
        case 'final':
          if(!finalUpgrade.bought && coins>=finalUpgrade.cost){ coins-=finalUpgrade.cost; finalUpgrade.bought=true; }
          break;
        case 'rebCoin':
          if(rebirthTokens>=rebirthUpgrades.coinMulti.cost){ rebirthTokens -= rebirthUpgrades.coinMulti.cost; rebirthUpgrades.coinMulti.level++; rebirthUpgrades.coinMulti.cost = Math.max(1, Math.ceil(rebirthUpgrades.coinMulti.cost*1.4)); }
          break;
        case 'rebToken':
          if(rebirthTokens>=rebirthUpgrades.tokenMulti.cost){ rebirthTokens -= rebirthUpgrades.tokenMulti.cost; rebirthUpgrades.tokenMulti.level++; rebirthUpgrades.tokenMulti.cost = Math.max(1, Math.ceil(rebirthUpgrades.tokenMulti.cost*1.45)); }
          break;
        case 'rebCrit':
          if(rebirthTokens>=critUpgrade.cost && critChance < critChanceMax){ rebirthTokens -= critUpgrade.cost; critUpgrade.level++; critChance = min(critChance+0.5, critChanceMax); critUpgrade.cost = Math.max(1, Math.ceil(critUpgrade.cost*1.3)); }
          break;
        case 'preCoin':
          if(prestigePoints>=prestigeUpgrades.coinMulti.cost){ prestigePoints -= prestigeUpgrades.coinMulti.cost; prestigeUpgrades.coinMulti.level++; prestigeUpgrades.coinMulti.cost = Math.max(1, Math.ceil(prestigeUpgrades.coinMulti.cost*1.4)); }
          break;
        case 'preToken':
          if(prestigePoints>=prestigeUpgrades.tokenMulti.cost){ prestigePoints -= prestigeUpgrades.tokenMulti.cost; prestigeUpgrades.tokenMulti.level++; prestigeUpgrades.tokenMulti.cost = Math.max(1, Math.ceil(prestigeUpgrades.tokenMulti.cost*1.4)); }
          break;
        case 'preGain':
          if(prestigePoints>=prestigeUpgrades.prestigeGain.cost){ prestigePoints -= prestigeUpgrades.prestigeGain.cost; prestigeUpgrades.prestigeGain.level++; prestigeUpgrades.prestigeGain.cost = Math.max(1, Math.ceil(prestigeUpgrades.prestigeGain.cost*1.4)); }
          break;
        case 'rebirth':
          attemptRebirth();
          break;
        case 'prestige':
          attemptPrestige();
          break;
        case 'save':
          saveState(); pushFloating(new FloatingText("Saved", mouseX, mouseY, false)); break;
        case 'load':
          loadState(); lastLoadTime = millis(); pushFloating(new FloatingText("Loaded", mouseX, mouseY, false)); break;
        case 'toggle':
          colorToggle = !colorToggle; break;
      }
      return;
    }
  }

  // Toggle clicked fallback
  let rx = width - 140, ry = 12, rw = 128, rh = 48;
  if(mouseX>rx && mouseX<rx+rw && mouseY>ry && mouseY<ry+rh){ colorToggle = !colorToggle; }
}


function doClick(){
  clickCount++;
  let gain = getCoinPerClick();
  // critical roll
  if(random(100) < critChance){ gain *= 25; pushFloating(new FloatingText("+"+formatNumber(gain)+" ❤", mouseX, mouseY, true)); }
  coins += gain;
  pushFloating(new FloatingText("+"+formatNumber(gain), width/2, height-150,false));
}

function getCoinPerClick(){
  let out = baseCoin * coinMultiplier;
  // apply permanent rebirth upgrades
  out *= Math.pow(rebirthUpgrades.coinMulti.mult, rebirthUpgrades.coinMulti.level);
  // prestige coin upgrades
  out *= Math.pow(prestigeUpgrades.coinMulti.mult, prestigeUpgrades.coinMulti.level);
  // final upgrade
  if(finalUpgrade.bought) out *= Math.max(1, clickCount);
  return Math.floor(out);
}

function updateFloating(){
  for(let i=floating.length-1;i>=0;i--){
    floating[i].update();
    floating[i].draw();
    if(floating[i].dead) floating.splice(i,1);
  }
}

class FloatingText{
  constructor(txt,x,y,critical=false){ this.txt=txt; this.x=x; this.y=y; this.alpha=255; this.critical=critical; }
  update(){ this.y -= 0.6; this.alpha -= 2.5; if(this.alpha<=0) this.dead=true; }
  draw(){ push(); textSize(this.critical?32:22); fill(255,215,0,this.alpha); textAlign(CENTER); textStyle(BOLD); text("💰 "+this.txt,this.x,this.y); pop(); }
}

function pushFloating(ft){
  floating.push(ft);
  if(floating.length>30) floating.splice(0,floating.length-30);
}

function formatNumber(n){
  if(n>=1e12) return (n/1e12).toFixed(2)+"T";
  if(n>=1e9) return (n/1e9).toFixed(2)+"B";
  if(n>=1e6) return (n/1e6).toFixed(2)+"M";
  if(n>=1000) return (n/1000).toFixed(2)+"k";
  return Math.floor(n);
}

function attemptRebirth(){
  if(coins < REBIRTH_REQUIREMENT) return;
  // base token gain = coins / requirement
  let baseTokens = coins / REBIRTH_REQUIREMENT;
  // apply rebirth token multipliers
  let tokenMult = Math.pow(rebirthUpgrades.tokenMulti.mult, rebirthUpgrades.tokenMulti.level);
  // apply prestige token multiplier
  tokenMult *= Math.pow(prestigeUpgrades.tokenMulti.mult, prestigeUpgrades.tokenMulti.level);
  let tokens = floor(baseTokens * tokenMult);
  if(tokens < 1) tokens = 1;
  rebirthTokens += tokens;
  // reset coins and coin upgrades (but keep rebirth permanent purchases)
  coins = 0; baseCoin = 1; coinMultiplier = 1; upgrades = { baseCost:10, baseLevel:0, multCost:50, multLevel:0 };
}

function attemptPrestige(){
  // require at least PRESTIGE_REQUIREMENT coins to prestige
  if(coins < PRESTIGE_REQUIREMENT) return;
  // prestige points gained based on rebirth tokens and prestige upgrades
  let basePts = rebirthTokens; // 1:1 by default
  // apply prestige gain multiplier
  basePts = basePts * Math.pow(prestigeUpgrades.prestigeGain.mult, prestigeUpgrades.prestigeGain.level);
  let pts = floor(basePts);
  if(pts < 1) pts = 1;
  prestigePoints += pts;
  // reset rebirth tokens and rebirth upgrades
  rebirthTokens = 0;
  rebirthUpgrades = { coinMulti: { level:0, cost:1, mult:2 }, tokenMulti: { level:0, cost:2, mult:1.5 } };
  // normal upgrades reset
  coins = 0; baseCoin = 1; coinMultiplier = 1; upgrades = { baseCost:10, baseLevel:0, multCost:50, multLevel:0 };
}

// Bob
class Bob{
  constructor(){ this.x = random(200,width-200); this.y = random(150,height-300); this.vx = random(-1,1); this.vy = random(-0.5,0.5); this.size=36; }
  update(){ this.x += this.vx; this.y += this.vy; if(this.x<80||this.x>width-80) this.vx*=-1; if(this.y<120||this.y>height-200) this.vy*=-1; if(millis()-lastBobCoinTime>60000){ lastBobCoinTime = millis(); bobCoin = {x:this.x+40,y:this.y, value:100*getCoinPerClick(), alpha:255}; }
  }
  draw(){ push(); // stickman simple
    translate(this.x,this.y);
    stroke(255); strokeWeight(3); // head
    noFill(); ellipse(0,0,this.size,this.size);
    // body
    line(0,this.size/2,0,this.size/2+20);
    line(0,this.size/2+20,-10,this.size/2+40);
    line(0,this.size/2+20,10,this.size/2+40);
    line(0,6,18,0); // arm
    // hat
    fill(0); rect(-10,-18,20,6);
    rect(-6,-26,12,8);
    // smile
    noFill(); stroke(255); arc(0,0,12,8,0,PI);
    // name
    noStroke(); fill(255); textSize(16); textStyle(BOLD); textAlign(CENTER); text("Bob",0,-44);
    pop(); }
}

function drawBobCoin(){
  if(!bobCoin) return;
  bobCoin.y -= 0.3;
  bobCoin.alpha -= 0.6;
  push(); textSize(22); fill(144,238,144,bobCoin.alpha); textAlign(LEFT); text("⭐ "+formatNumber(bobCoin.value), bobCoin.x, bobCoin.y); pop();
  if(bobCoin.alpha<=0) bobCoin=null;
}

function tryCollectBobCoin(mx,my){
  if(!bobCoin) return false;
  if(dist(mx,my,bobCoin.x,bobCoin.y) < 40){
    coins += bobCoin.value;
    pushFloating(new FloatingText("+"+formatNumber(bobCoin.value), bobCoin.x, bobCoin.y, false));
    bobCoin = null;
    return true;
  }
  return false;
}

// simple click sound using WebAudio
let audioCtx = null;
function playClickSound(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let o = audioCtx.createOscillator();
    let g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 800;
    o.connect(g); g.connect(audioCtx.destination);
    g.gain.value = 0.0001;
    o.start();
    let now = audioCtx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.2, now + 0.001);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    o.stop(now + 0.1);
  }catch(e){ }
}

// Autosave/load
function saveState(){
  try{
    const state = {
      coins, baseCoin, coinMultiplier, clickCount,
      upgrades, rebirthTokens, rebirthUpgrades,
      prestigePoints, prestigeUpgrades, finalUpgrade,
      critChance, critUpgrade, colorToggle
    };
    localStorage.setItem('one_shot_clicker_v1', JSON.stringify(state));
    lastSaveTime = millis();
  }catch(e){ }
}

function loadState(){
  try{
    const raw = localStorage.getItem('one_shot_clicker_v1');
    if(!raw) return;
    const s = JSON.parse(raw);
    if(typeof s.coins === 'number') coins = s.coins;
    if(typeof s.baseCoin === 'number') baseCoin = s.baseCoin;
    if(typeof s.coinMultiplier === 'number') coinMultiplier = s.coinMultiplier;
    if(typeof s.clickCount === 'number') clickCount = s.clickCount;
    if(s.upgrades) upgrades = s.upgrades;
    if(typeof s.rebirthTokens === 'number') rebirthTokens = s.rebirthTokens;
    if(s.rebirthUpgrades) rebirthUpgrades = s.rebirthUpgrades;
    if(typeof s.prestigePoints === 'number') prestigePoints = s.prestigePoints;
    if(s.prestigeUpgrades) prestigeUpgrades = s.prestigeUpgrades;
    if(s.finalUpgrade) finalUpgrade = s.finalUpgrade;
    if(typeof s.critChance === 'number') critChance = s.critChance;
    if(s.critUpgrade) critUpgrade = s.critUpgrade;
    if(typeof s.colorToggle === 'boolean') colorToggle = s.colorToggle;
  }catch(e){ }
}
