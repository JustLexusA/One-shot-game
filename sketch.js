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
let rebirthTokens = 0;
let rebirthUpgrades = { // permanent multipliers bought with tokens
  coinMulti: { level: 0, cost: 1, mult: 1.5 },
  tokenMulti: { level: 0, cost: 2, mult: 1.25 }
};

let prestigePoints = 0;
let prestigeUpgrades = {
  coinMulti: { level: 0, cost: 1, mult: 2.0 },
  tokenMulti: { level: 0, cost: 2, mult: 1.5 },
  prestigeGain: { level: 0, cost: 3, mult: 1.25 }
};

// final click-count upgrade
let finalUpgrade = { bought: false, cost: 1e12 };

// critical
let critChance = 2.5; // percent
let critChanceMax 
let critUpgradeCost = 1; // token cost
let critUpgrade = { level: 0, cost: 1 };

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

function setup(){
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('canvas-holder');
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
  resizeCanvas(windowWidth, windowHeight);
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
  // left panel (taller to fit rebirth/prestige purchases)
  push();
  fill(0,160);
  noStroke();
  rect(12,12,320,600,8);
  fill(255);
  textSize(26);
  textStyle(BOLD);
  text("Stats & Upgrades",22,40);

  // Coins
  fill(255,215,0);
  textSize(22);
  text("Coins: "+formatNumber(coins),22,72);
  textSize(18);
  fill(200);
  text("Coin/Click: "+formatNumber(getCoinPerClick()),22,102);
  text("Clicks: "+clickCount,22,128);

  // Rebirth tokens with icon
  push();
  fill(144,238,144); noStroke(); ellipse(34,150,20,20); fill(0); textSize(12); textAlign(CENTER,CENTER); text("R",34,150);
  fill(255); textAlign(LEFT); textSize(16); text("Rebirth Tokens: "+rebirthTokens,50,156);
  // Prestige icon
  fill(135,206,235); noStroke(); ellipse(34,176,20,20); fill(0); textSize(12); textAlign(CENTER,CENTER); text("P",34,176);
  fill(255); textAlign(LEFT); textSize(16); text("Prestige Points: "+prestigePoints,50,182);
  pop();

  // Upgrades header
  fill(255);
  textSize(22);
  text("Upgrades",22,216);

  // base upgrade button
  let x=22,yBase=236,w=280,h=36;
  drawUpgradeButton(x,yBase,w,h,"Increase base (+1)","Cost: "+upgrades.baseCost);

  // multiplier upgrade
  let yMult = yBase + 44;
  drawUpgradeButton(x,yMult,w,h,"Increase mult (+10%)","Cost: "+upgrades.multCost);

  // final upgrade display
  let yFinal = yMult + 56;
  if(!finalUpgrade.bought){
    drawUpgradeButton(x,yFinal,w,h,"Final: x clicks","Cost: "+formatNumber(finalUpgrade.cost));
  } else {
    fill(180); textSize(14); text("Final click multiplier bought",x+6,yFinal+22);
  }

  // Rebirth permanent upgrades (buy with tokens)
  let yReb = yFinal + 56;
  fill(255); textSize(16); text("Rebirth Upgrades (tokens)",x,yReb-8);
  // coin multiplier permanent
  drawUpgradeButton(x,yReb+12,w,36,"Permanent coin x2","Cost: "+rebirthUpgrades.coinMulti.cost+" Tkns");
  // token gain multiplier
  drawUpgradeButton(x,yReb+64,w,36,"Increase token gain","Cost: "+rebirthUpgrades.tokenMulti.cost+" Tkns");
  // crit upgrade
  drawUpgradeButton(x,yReb+116,w,36,"Crit chance +0.5%","Cost: "+critUpgrade.cost+" Tkns");

  // Prestige Upgrades
  let yPre = yReb + 180;
  fill(255); textSize(16); text("Prestige Upgrades (pts)",x,yPre-8);
  drawUpgradeButton(x,yPre+12,w,36,"Prestige: coin x3","Cost: "+prestigeUpgrades.coinMulti.cost+" pts");
  drawUpgradeButton(x,yPre+64,w,36,"Prestige: token x2","Cost: "+prestigeUpgrades.tokenMulti.cost+" pts");
  drawUpgradeButton(x,yPre+116,w,36,"Prestige: prestige+","Cost: "+prestigeUpgrades.prestigeGain.cost+" pts");

  // Rebirth & Prestige buttons (actions)
  let yAction = yPre + 170;
  drawSmallButton(x,yAction,130,36,"Rebirth",() => { attemptRebirth(); });
  drawSmallButton(x+150,yAction,130,36,"Prestige",() => { attemptPrestige(); });

  pop();
}

function drawUpgradeButton(x,y,w,h,label,cost,cb){
  fill(40);
  stroke(255,8);
  rect(x,y,w,h,8);
  noStroke();
  fill(255);
  textSize(18);
  text(label,x+8,y+22);
  fill(200);
  text(cost,x+w-110,y+22);
}

function drawSmallButton(x,y,w,h,label,cb){
  fill(30);
  rect(x,y,w,h,8);
  fill(255);
  textSize(18);
  text(label,x+10,y+24);
}

function drawButton(){
  // bottom centered button
  let bw = 360;
  let bh = 110;
  let bx = width/2 - bw/2;
  let by = height - bh - 28;

  if(colorToggle && millis() - lastButtonColorChange > 1000){
    lastButtonColorChange = millis();
  }
  let t = (colorToggle && floor(millis()/1000)%2==0) ? color(255,140,0) : color(200,80,40);

  fill(t);
  stroke(255);
  strokeWeight(2);
  rect(bx,by,bw,bh,16);
  noStroke();
  fill(255,235,120);
  textSize(48);
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
  
  // Save/Load buttons and status
  let sbx = rx, sby = ry + rh + 8, sbw = 60, sbh = 28;
  // Save
  fill(30); stroke(255,30); rect(sbx, sby, sbw, sbh,6);
  noStroke(); fill(255); textSize(14); textAlign(CENTER, CENTER); text("Save", sbx+sbw/2, sby+sbh/2);
  // Load
  fill(30); stroke(255,30); rect(sbx+sbw+8, sby, sbw, sbh,6);
  noStroke(); fill(255); textSize(14); textAlign(CENTER, CENTER); text("Load", sbx+sbw+8+sbw/2, sby+sbh/2);

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

  // check button click
  let bw = 360;
  let bh = 110;
  let bx = width/2 - bw/2;
  let by = height - bh - 28;
  if(mouseX>bx && mouseX<bx+bw && mouseY>by && mouseY<by+bh){
    doClick();
    return;
  }

  // try collecting Bob's coin if clicked nearby
  if(tryCollectBobCoin(mouseX, mouseY)) return;

  // check upgrade buttons in left panel (positional checks match drawUI)
  // base
  if(mouseX>22 && mouseX<302 && mouseY>236 && mouseY<236+36){
    if(coins>=upgrades.baseCost){ coins-=upgrades.baseCost; upgrades.baseLevel++; baseCoin+=1; upgrades.baseCost = Math.floor(upgrades.baseCost*1.6); }
  }
  // mult
  if(mouseX>22 && mouseX<302 && mouseY>280 && mouseY<280+36){
    if(coins>=upgrades.multCost){ coins-=upgrades.multCost; upgrades.multLevel++; coinMultiplier += 0.1; upgrades.multCost = Math.floor(upgrades.multCost*1.8); }
  }
  // final
  if(mouseX>22 && mouseX<302 && mouseY>336 && mouseY<336+36){
    if(!finalUpgrade.bought && coins>=finalUpgrade.cost){ coins-=finalUpgrade.cost; finalUpgrade.bought=true; }
  }

  // Rebirth permanent purchases
  // coinMulti permanent at yReb+12 -> y in [?]
  let yRebTop = 336 + 56; // 392
  if(mouseX>22 && mouseX<302 && mouseY>yRebTop+12 && mouseY<yRebTop+12+36){
    if(rebirthTokens>=rebirthUpgrades.coinMulti.cost){ rebirthTokens -= rebirthUpgrades.coinMulti.cost; rebirthUpgrades.coinMulti.level++; rebirthUpgrades.coinMulti.cost = Math.ceil(rebirthUpgrades.coinMulti.cost*2); }
  }
  // token gain multiplier
  if(mouseX>22 && mouseX<302 && mouseY>yRebTop+64 && mouseY<yRebTop+64+36){
    if(rebirthTokens>=rebirthUpgrades.tokenMulti.cost){ rebirthTokens -= rebirthUpgrades.tokenMulti.cost; rebirthUpgrades.tokenMulti.level++; rebirthUpgrades.tokenMulti.cost = Math.ceil(rebirthUpgrades.tokenMulti.cost*2); }
  }
  // crit upgrade
  if(mouseX>22 && mouseX<302 && mouseY>yRebTop+116 && mouseY<yRebTop+116+36){
    if(rebirthTokens>=critUpgrade.cost && critChance < critChanceMax){ rebirthTokens -= critUpgrade.cost; critUpgrade.level++; critChance = min(critChance+0.5, critChanceMax); critUpgrade.cost = Math.ceil(critUpgrade.cost*1.8); }
  }

  // Prestige purchases
  // compute yPre top position
  let yPreTop = yRebTop + 180; // matches drawUI
  if(mouseX>22 && mouseX<302 && mouseY>yPreTop+12 && mouseY<yPreTop+12+36){
    if(prestigePoints>=prestigeUpgrades.coinMulti.cost){ prestigePoints -= prestigeUpgrades.coinMulti.cost; prestigeUpgrades.coinMulti.level++; prestigeUpgrades.coinMulti.cost = Math.ceil(prestigeUpgrades.coinMulti.cost*2); }
  }
  if(mouseX>22 && mouseX<302 && mouseY>yPreTop+64 && mouseY<yPreTop+64+36){
    if(prestigePoints>=prestigeUpgrades.tokenMulti.cost){ prestigePoints -= prestigeUpgrades.tokenMulti.cost; prestigeUpgrades.tokenMulti.level++; prestigeUpgrades.tokenMulti.cost = Math.ceil(prestigeUpgrades.tokenMulti.cost*2); }
  }
  if(mouseX>22 && mouseX<302 && mouseY>yPreTop+116 && mouseY<yPreTop+116+36){
    if(prestigePoints>=prestigeUpgrades.prestigeGain.cost){ prestigePoints -= prestigeUpgrades.prestigeGain.cost; prestigeUpgrades.prestigeGain.level++; prestigeUpgrades.prestigeGain.cost = Math.ceil(prestigeUpgrades.prestigeGain.cost*2); }
  }

  // action buttons (Rebirth & Prestige)
  let yAction = yPreTop + 170;
  if(mouseX>22 && mouseX<152 && mouseY>yAction && mouseY<yAction+36){ attemptRebirth(); }
  if(mouseX>172 && mouseX<302 && mouseY>yAction && mouseY<yAction+36){ attemptPrestige(); }

  // right-side toggle (button color)
  let rx = width - 140, ry = 12, rw = 128, rh = 48;
  // Save/Load buttons coords (match drawButton)
  let sbx = rx, sby = ry + rh + 8, sbw = 60, sbh = 28;
  // Save clicked
  if(mouseX>sbx && mouseX<sbx+sbw && mouseY>sby && mouseY<sby+sbh){ saveState(); pushFloating(new FloatingText("Saved", mouseX, mouseY, false)); return; }
  // Load clicked
  if(mouseX>sbx+sbw+8 && mouseX<sbx+sbw+8+sbw && mouseY>sby && mouseY<sby+sbh){ loadState(); lastLoadTime = millis(); pushFloating(new FloatingText("Loaded", mouseX, mouseY, false)); return; }
  // Toggle clicked
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
  update(){ this.y -= 0.8; this.alpha -= 3; if(this.alpha<=0) this.dead=true; }
  draw(){ push(); textSize(this.critical?40:28); fill(255,215,0,this.alpha); textAlign(CENTER); textStyle(BOLD); text("💰 "+this.txt,this.x,this.y); pop(); }
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
  // require at least 1 rebirth token to prestige
  if(rebirthTokens <= 0) return;
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
