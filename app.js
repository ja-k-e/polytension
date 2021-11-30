// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
class RNG {
  constructor(seed) {
    const seedingFunction = this.xmur3(seed);
    this._random = this.sfc32(
      seedingFunction(),
      seedingFunction(),
      seedingFunction(),
      seedingFunction()
    );
  }

  random() {
    return this._random();
  }

  xmur3(str) {
    for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
      (h = Math.imul(h ^ str.charCodeAt(i), 3432918353)),
        (h = (h << 13) | (h >>> 19));
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }

  sfc32(a, b, c, d) {
    return function () {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      var t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }
}

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
canvas.height = window.innerHeight * 2;
canvas.width = window.innerWidth * 2;
const seedMatch = window.location.search.match(/s=(.+)/);
const seed = seedMatch ? seedMatch[1] : Date.now().toString();
if (!seedMatch) {
  const searchParams = new URLSearchParams(window.location.search);
  searchParams.set("s", seed);
  const path = [
    window.location.protocol,
    "//",
    window.location.host,
    window.location.pathname,
    "?",
    searchParams.toString(),
  ].join("");
  window.history.replaceState({ path }, "", path);
}
const rng = new RNG(seed);

function rotate(cx, cy, x, y, angle) {
  const radians = (Math.PI / 180) * angle;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = cos * (x - cx) + sin * (y - cy) + cx;
  const ny = cos * (y - cy) - sin * (x - cx) + cy;
  return [nx, ny];
}

const generations = Math.floor(rng.random() * 2) + 4;
const jitter = rng.random() * 0.02 + 0.001;
const shapes = {};

let id = 0;
const points = {};
const pointIds = [];
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.id = id++;
    pointIds.push(this.id);
    points[this.id] = this;
  }
}

const angle = rng.random() * 360;
traverse(
  new Point(...rotate(0.5, 0.5, 0.5, 0.1, angle)),
  new Point(...rotate(0.5, 0.5, 0.9, 0.75, angle)),
  new Point(...rotate(0.5, 0.5, 0.1, 0.75, angle))
);

const items = [];
Object.values(shapes).forEach((generation, i) => {
  generation.forEach((item) => {
    items.push({ ...item, generation: i });
  });
});

loop();

function loop() {
  context.fillStyle = "black";
  context.fillRect(0, 0, canvas.width, canvas.height);
  items.forEach(draw);
  pointIds.forEach((id) => morph(points[id]));
  requestAnimationFrame(loop);
}

function morph(item) {
  const clamp = (num) => Math.min(1, Math.max(0, num));
  item.x = clamp(item.x * (rng.random() * jitter + (1 - jitter * 0.5)));
  item.y = clamp(item.y * (rng.random() * jitter + (1 - jitter * 0.5)));
}

function traverse(A, B, C, generation = 0) {
  shapes[generation] = shapes[generation] || [];
  const hue = Math.round(rng.random() * 360);
  shapes[generation].push({ A, B, C, hue });

  const centerOrBisect = generation % 2 === 0 ? "center" : "bisect";
  let newPoint;
  if (centerOrBisect === "center") {
    const randX = rng.random() * 0.4 - 0.2 + 1;
    const randY = rng.random() * 0.4 - 0.2 + 1;
    id++;
    newPoint = new Point(
      ((A.x + B.x + C.x) / 3) * randX,
      ((A.y + B.y + C.y) / 3) * randY
    );
  } else {
    const randX = rng.random() * 0.15 - 0.075 + 1;
    const randY = rng.random() * 0.15 - 0.075 + 1;
    newPoint = new Point(((A.x + B.x) / 2) * randX, ((A.y + B.y) / 2) * randY);
  }
  if (generation >= generations) {
    return;
  }

  traverse(A, C, newPoint, generation + 1);
  traverse(B, C, newPoint, generation + 1);
  if (centerOrBisect === "center") {
    traverse(A, B, newPoint, generation + 1);
  }
}

function draw({ A, B, C, hue, generation }) {
  const contextualize = (x, y) => [x * canvas.width, y * canvas.height];
  context.fillStyle = `hsla(${hue}, 100%, ${
    (generation / generations) * 40 + 20
  }%, 0.2)`;
  context.beginPath();
  context.moveTo(...contextualize(A.x, A.y));
  context.lineTo(...contextualize(B.x, B.y));
  context.lineTo(...contextualize(C.x, C.y));
  context.closePath();
  context.fill();
}
