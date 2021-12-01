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

class Polytension {
  constructor() {
    this.reset();
  }

  reset() {
    delete this.points;
    delete this.pointIds;
    delete this.rng;
    delete this.shapes;
    this.points = {};
    this.pointIds = [];
    this.id = 0;
    this.shapes = [];
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  createPoint(x, y) {
    this.id++;
    const point = { x, y, id: this.id };
    this.pointIds.push(point.id);
    this.points[point.id] = point;
    return point;
  }

  getAndSaveSeed(forceSeed) {
    const seedMatch = window.location.search.match(/s=(.+)/);
    const seed = seedMatch && !forceSeed ? seedMatch[1] : Date.now().toString();
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("s", seed);
    const { protocol, host, pathname } = window.location;
    const path = [
      protocol,
      "//",
      host,
      pathname,
      "?",
      searchParams.toString(),
    ].join("");
    window.history.replaceState({ path }, "", path);
    return seed;
  }

  animationLoop() {
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);
    this.shapes.forEach(this.drawShape.bind(this));
    this.pointIds.forEach(this.morphPoint.bind(this));
    this.animationFrame = requestAnimationFrame(this.animationLoop.bind(this));
  }

  morphPoint(pointId) {
    const point = this.points[pointId];
    const clamp = (num) => Math.min(1, Math.max(0, num));
    const morphInt = (int) =>
      int * (this.rng.random() * this.jitter + (1 - this.jitter * 0.5));
    point.x = clamp(morphInt(point.x));
    point.y = clamp(morphInt(point.y));
  }

  drawShape({ A, B, C, hue, generation }) {
    const contextualize = (x, y) => [x * canvas.width, y * canvas.height];
    context.fillStyle = `hsla(${hue}, 100%, ${
      (generation / this.generations) * 40 + 20
    }%, 0.2)`;
    context.beginPath();
    context.moveTo(...contextualize(A.x, A.y));
    context.lineTo(...contextualize(B.x, B.y));
    context.lineTo(...contextualize(C.x, C.y));
    context.closePath();
    context.fill();
  }

  permuteForGenerations(A, B, C, generation = 0) {
    const hue = Math.round(this.rng.random() * 360);
    const shape = { A, B, C, hue, generation };
    this.shapes.push(shape);

    const centerOrBisect = generation % 2 === 0 ? "center" : "bisect";
    let newPoint;
    if (centerOrBisect === "center") {
      const randX = this.rng.random() * 0.4 - 0.2 + 1;
      const randY = this.rng.random() * 0.4 - 0.2 + 1;
      newPoint = this.createPoint(
        ((A.x + B.x + C.x) / 3) * randX,
        ((A.y + B.y + C.y) / 3) * randY
      );
    } else {
      const randX = this.rng.random() * 0.15 - 0.075 + 1;
      const randY = this.rng.random() * 0.15 - 0.075 + 1;
      newPoint = this.createPoint(
        ((A.x + B.x) / 2) * randX,
        ((A.y + B.y) / 2) * randY
      );
    }
    if (generation >= this.generations) {
      return;
    }

    this.permuteForGenerations(A, C, newPoint, generation + 1);
    this.permuteForGenerations(B, C, newPoint, generation + 1);
    if (centerOrBisect === "center") {
      this.permuteForGenerations(A, B, newPoint, generation + 1);
    }
  }

  run(forceSeed = false) {
    this.reset();

    this.rng = new RNG(this.getAndSaveSeed(forceSeed));

    this.generations = Math.floor(this.rng.random() * 2) + 4;
    this.jitter = this.rng.random() * 0.02 + 0.001;
    this.angle = this.rng.random() * 360;

    const shapes = this.randomShapes();
    shapes.forEach((points) => this.permuteForGenerations(...points));

    this.animationLoop();
  }

  randomShapes() {
    const rand = this.rng.random();
    if (rand <= 0.5) {
      return [
        [
          this.createPoint(
            ...this.rotateCoordinates(0.5, 0.5, 0.5, 0.1, this.angle)
          ),
          this.createPoint(
            ...this.rotateCoordinates(0.5, 0.5, 0.9, 0.75, this.angle)
          ),
          this.createPoint(
            ...this.rotateCoordinates(0.5, 0.5, 0.1, 0.75, this.angle)
          ),
        ],
      ];
    } else {
      const pointA = this.createPoint(
        ...this.rotateCoordinates(0.5, 0.5, 0.9, 0.5, this.angle)
      );
      const pointB = this.createPoint(
        ...this.rotateCoordinates(0.5, 0.5, 0.1, 0.5, this.angle)
      );
      return [
        [
          pointA,
          pointB,
          this.createPoint(
            ...this.rotateCoordinates(0.5, 0.5, 0.5, 0.1, this.angle)
          ),
        ],
        [
          pointA,
          pointB,
          this.createPoint(
            ...this.rotateCoordinates(0.5, 0.5, 0.5, 0.9, this.angle)
          ),
        ],
      ];
    }
  }

  rotateCoordinates(cx, cy, x, y, angle) {
    const radians = (Math.PI / 180) * angle;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = cos * (x - cx) + sin * (y - cy) + cx;
    const ny = cos * (y - cy) - sin * (x - cx) + cy;
    return [nx, ny];
  }
}

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
canvas.height = window.innerHeight * 2;
canvas.width = window.innerWidth * 2;

const polytension = new Polytension();

polytension.run();

canvas.addEventListener("click", () => polytension.run(true));
