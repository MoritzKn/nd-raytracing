const canvas = document.getElementsByTagName("canvas")[0];
const ctx = canvas.getContext("2d");
let canvasData;
let buffers = {};

function drawPixel(x, y, r, g, b, a = 255) {
  const index = (x + y * canvas.width) * 4;

  canvasData.data[index + 0] = r;
  canvasData.data[index + 1] = g;
  canvasData.data[index + 2] = b;
  canvasData.data[index + 3] = a;
}

function getPixel(x, y) {
  const index = (x + y * canvas.width) * 4;

  return [
    canvasData.data[index + 0],
    canvasData.data[index + 1],
    canvasData.data[index + 2],
    canvasData.data[index + 3]
  ];
}

function drawPixels(step, x, y, r, g, b, a) {
  for (let i = 0; i <= step; i++) {
    for (let j = 0; j <= step; j++) {
      drawPixel(x + i, y + j, r, g, b, a);
    }
  }
}

function updateCanvas() {
  ctx.putImageData(canvasData, 0, 0);
}

function normalize(vec) {
  const len = Math.hypot(...vec);
  return vec.map(e => e / len);
}

function dot(a, b) {
  let product = 0;
  for (let i = 0; i < a.length; i++) {
    product += a[i] * b[i];
  }

  return product;
}

function mulScalar(vec, scalar) {
  const res = [];
  for (let i = 0; i < vec.length; i++) {
    res[i] = vec[i] * scalar;
  }
  return res;
}

function mulVec(vecA, vecB) {
  const res = [];
  for (let i = 0; i < vecA.length; i++) {
    res[i] = vecA[i] * vecB[i];
  }
  return res;
}

function subVec(vecA, vecB) {
  const res = [];
  for (let i = 0; i < vecA.length; i++) {
    res[i] = vecA[i] - vecB[i];
  }
  return res;
}

function addVec(vecA, vecB) {
  const res = [];
  for (let i = 0; i < vecA.length; i++) {
    res[i] = vecA[i] + vecB[i];
  }
  return res;
}

function colorEq(colorA, colorV) {
  return (
    colorA[0] === colorV[0] &&
    colorA[1] === colorV[1] &&
    colorA[2] === colorV[2]
  );
}

function sphereIntersection(origin, ray, spherePos, sphereR) {
  const originToSphere = subVec(spherePos, origin);

  // len of ray to the point where it's closest to the sphere center
  const tc = dot(ray, originToSphere);

  // if sphere is in front of us
  if (tc > 0) {
    const originToSphereLen = Math.hypot(...originToSphere);

    // throw { originToSphereLen, tc, originToSphere };

    // center of sphere to ray
    const d = Math.sqrt(originToSphereLen * originToSphereLen - tc * tc);

    // return originToSphereLen - tc;

    // if we hit the sphere
    if (d < sphereR) {
      // length from intersection to the point where d hits the ray (i.e. end of tc)
      const t1c = Math.sqrt(sphereR * sphereR - d * d);

      // length to first intersection
      const tc1 = tc - t1c;

      // point of first intersection on the ray
      const intersection = mulScalar(ray, tc1);

      return addVec(origin, intersection);
    }
  }
  return null;
}

function getRotation(t, loopTime) {
  // 0 .. 1 -> 0 .. 1
  const offset = (t % loopTime) / loopTime;

  const posOnCircle = [
    Math.cos(Math.PI * (offset * 2 - 1)),
    Math.sin(Math.PI * (offset * 2 - 1))
  ];

  return posOnCircle;
}

function clear() {
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      drawPixel(x, y, 255, 255, 255, 0);
    }
  }
}

function lightIntensityDist(dist) {
  const tmp = dist / 20 + 1;
  return 1 / (tmp * tmp);
}

function stackSpheres(dim) {
  const objects = [];
  const count = 2 ** dim;
  const outerR = 1;
  for (var i = 0; i < count; i++) {
    // this is so dumm but it works
    const pos = i
      .toString(2)
      .padStart(dim, "0")
      .split("")
      .map(Number)
      .map(n => n * 2 - 1);

    objects.push({
      pos,
      radius: outerR,
      color: [40, 90, 255]
    });
  }
  objects.push({
    pos: padVec([], 0),
    radius: Math.sqrt(dim) - outerR,
    color: [255, 90, 40]
  });
  return objects;
}

function trace(objects, camPos, ray, lightPos) {
  const allIntersections = [];

  for (var i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const point = sphereIntersection(camPos, ray, obj.pos, obj.radius);

    if (point) {
      allIntersections.push({
        pos: point,
        center: obj.pos,
        color: obj.color
      });
    }
  }

  let firstIntersection = null;
  let minDistToCam = Infinity;

  for (var i = 0; i < allIntersections.length; i++) {
    const intersection = allIntersections[i];
    const toCam = subVec(intersection.pos, camPos);
    const distToCam = Math.hypot(...toCam);

    if (minDistToCam > distToCam) {
      minDistToCam = distToCam;
      firstIntersection = intersection;
    }
  }

  if (firstIntersection) {
    const point = firstIntersection.pos;
    const toLight = subVec(lightPos, point);
    const normal = normalize(subVec(point, firstIntersection.center));
    const angle = dot(normalize(toLight), normal);

    const brightness = Math.max(angle * 0.7 + 0.1, 0) + 0.2;

    return mulScalar(firstIntersection.color, brightness);
  }

  // bg color
  return [220, 220, 220, 255];
}

const dimension = 4;

function padVec(vec, filler = 0, dim = dimension) {
  const res = [];
  for (var i = 0; i < dim; i++) {
    res[i] = vec[i] === undefined ? filler : vec[i];
  }
  return res;
}

let camPos = padVec([-10, 0, 0], -10);
const lightBasePos = padVec([-4, 0, 4], -3);

const objects = stackSpheres(dimension);

let lastT = 0;
let sampleResolution = 80;
let dtAvg = 16;
function draw(t) {
  let dt = t - lastT;
  dtAvg = (dtAvg * 60 + dt) / 61;
  lastT = t;

  if (dtAvg < 22) {
    sampleResolution = Math.min(sampleResolution * 1.01, 500);
  } else if (dt > 40) {
    sampleResolution = Math.max(sampleResolution * 0.99, 20);
  }

  const lightPos = addVec(
    lightBasePos,
    padVec(mulScalar(getRotation(t, 2000), 2), 0)
  );

  camPos = addVec(
    padVec([...mulScalar(getRotation(t, 10000), 10), 0], -10),
    padVec([0, 0, getRotation(t, 6000)[1] * 2], 0)
  );

  let maxCanvasDim = Math.max(canvas.height, canvas.width);
  let offsetY = (maxCanvasDim - canvas.height) / 2;
  let offsetX = (maxCanvasDim - canvas.width) / 2;

  let sampleCount = 0;
  function sample(x, y) {
    sampleCount++;
    const camDir = normalize(
      subVec(padVec([], 0, Math.min(dimension, 3)), camPos)
    );
    const ortCamDir = [-camDir[1], camDir[0]];
    const posOnScree = [...mulScalar(ortCamDir, x - 0.5), y - 0.5];
    const dir = addVec(camDir, padVec(posOnScree, 0));

    // const camDir = normalize(subVec(padVec([], 0), camPos));
    // const ortCamDirXy = normalize([-camDir[1], camDir[0]]);
    // const posOnScreeY = [...mulScalar(ortCamDirXy, x - 0.5), 0];
    // const ortCamDirYz = normalize([camDir[2], -camDir[1]]);
    // const posOnScreeX = [0, ...mulScalar(ortCamDirYz, y - 0.5)];
    // const dir = addVec(addVec(camDir, posOnScreeX), posOnScreeY);

    const ray = normalize(padVec(dir, 1));
    const rayO = normalize(padVec([1, x - 0.5, y - 0.5], 1));
    return trace(objects, camPos, ray, lightPos);
  }

  const sampleResolutionRound = Math.round(sampleResolution / 10) * 10;
  let step = Math.round(maxCanvasDim / sampleResolutionRound);
  for (let y = 0; y < canvas.height; y += step) {
    const relY = 1 - (y + offsetY) / maxCanvasDim;

    for (let x = 0; x < canvas.width; x += step * 4) {
      const relX = (x + offsetX) / maxCanvasDim;
      const color = sample(relX, relY);
      drawPixels(step, x, y, ...color);
    }

    for (let x = step * 1; x < canvas.width; x += step * 4) {
      let prev = getPixel(x - step * 1, y);
      let next = getPixel(x + step * 3, y);

      if (colorEq(prev, next)) {
        drawPixels(step, x, y, ...prev);
      } else {
        const relX = (x + offsetX) / maxCanvasDim;
        const color = sample(relX, relY);
        drawPixels(step, x, y, ...color);
      }
    }

    for (let x = step * 2; x < canvas.width; x += step * 4) {
      let prev = getPixel(x - step * 2, y);
      let next = getPixel(x + step * 2, y);

      if (colorEq(prev, next)) {
        drawPixels(step, x, y, ...prev);
      } else {
        const relX = (x + offsetX) / maxCanvasDim;
        const color = sample(relX, relY);
        drawPixels(step, x, y, ...color);
      }
    }

    for (let x = step * 3; x < canvas.width; x += step * 4) {
      let prev = getPixel(x - step * 3, y);
      let next = getPixel(x + step * 1, y);

      if (colorEq(prev, next)) {
        drawPixels(step, x, y, ...prev);
      } else {
        const relX = (x + offsetX) / maxCanvasDim;
        const color = sample(relX, relY);
        drawPixels(step, x, y, ...color);
      }
    }
  }

  console.log(
    `stats: dt: ${dt.toFixed(2)}, avg: ${dtAvg.toFixed(
      2
    )}, samples: ${sampleCount}, res: ${sampleResolutionRound}`
  );

  updateCanvas();
  requestAnimationFrame(draw);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let maxCanvasDim = Math.max(canvas.height, canvas.width);

  canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

resize();
window.addEventListener("resize", resize);

requestAnimationFrame(draw);
