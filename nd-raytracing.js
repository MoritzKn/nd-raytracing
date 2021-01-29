const canvas = document.getElementsByTagName("canvas")[0];
const stats = document.getElementById("stats");
const wrapper = document.getElementById("wrapper");
const ctx = canvas.getContext("2d");
let minCanvasDim;
let canvasData;

function drawPixel(x, y, r, g, b, a = 255) {
  const index = (x + y * canvas.width) * 4;

  canvasData.data[index + 0] = r;
  canvasData.data[index + 1] = g;
  canvasData.data[index + 2] = b;
  canvasData.data[index + 3] = 255;
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

    // center of sphere to ray
    const d = Math.sqrt(originToSphereLen * originToSphereLen - tc * tc);

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

function getAllIntersections(objects, origin, ray) {
  const allIntersections = [];

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const point = sphereIntersection(origin, ray, obj.pos, obj.radius);

    if (point) {
      allIntersections.push({
        pos: point,
        center: obj.pos,
        color: obj.color
      });
    }
  }

  function compare(a, b) {
    const aDistToCam = Math.hypot(...subVec(a.pos, origin));
    const bDistToCam = Math.hypot(...subVec(b.pos, origin));

    if (aDistToCam > bDistToCam) {
      return -1;
    }
    if (aDistToCam < bDistToCam) {
      return 1;
    }
    return 0;
  }

  allIntersections.sort(compare);

  return allIntersections;
}

function mixColors(a, b, alpha) {
  return addVec(mulScalar(a, 1 - alpha), mulScalar(b, alpha));
}

function getLightColor(shadowCasters) {
  let lightColor = [255, 255, 255, 255];

  if (shadowCasters.length !== 0) {
    // lightColor = shadowCasters[0].color;
    for (let i = 0; i < shadowCasters.length; i++) {
      const alpha = shadowCasters[i].color[3] / 255;
      lightColor = mixColors(
        lightColor,
        mulScalar(shadowCasters[i].color, 1 - alpha),
        alpha
      );
    }
  }

  return lightColor;
}

function trace(objects, camPos, ray, lightPos) {
  const allIntersections = getAllIntersections(objects, camPos, ray);

  // bg color
  let color = [255, 255, 255, 255];
  for (let i = 0; i < allIntersections.length; i++) {
    const intersection = allIntersections[i];
    const point = intersection.pos;
    const toLight = normalize(subVec(lightPos, point));
    const normal = normalize(subVec(point, intersection.center));
    const angle = dot(toLight, normal);

    const brightness = Math.max(angle * 0.3 + 0.4, 0) + 0.3;
    let colorAtHit = mulScalar(intersection.color, brightness);

    const colorDirectLight = getLightColor(
      getAllIntersections(objects, point, toLight)
    );
    if (colorDirectLight) {
      colorAtHit = mixColors(colorDirectLight, colorAtHit, 0.85);
    }

    const colorIndirectLight = getLightColor(
      getAllIntersections(objects, point, normal)
    );
    if (colorIndirectLight) {
      colorAtHit = mixColors(colorIndirectLight, colorAtHit, 0.95);
    }

    const alpha = intersection.color[3] / 255;
    if (color) {
      color = addVec(mulScalar(color, 1 - alpha), mulScalar(colorAtHit, alpha));
    } else {
      color = colorAtHit;
    }
  }

  return color;
}

function initAxisControls(dimensions) {
  let html = "";
  const names = ["X", "Y", "Z", "W", "V", "U", "T", "S", "R", "Q"];
  for (let i = 0; i < dimensions; i++) {
    html += `
        <label>
            Camera ${names[i]}:
            <input type="range" id="axis-${i}" name="axis-${i}" min="-8" max="6" step="0.01" />
        </label>
        `;
  }

  // let timeout;
  // let userControl = false;
  // function resetTimer() {
  //   userControl = true;
  //   if (timeout) {
  //     clearTimeout(timeout);
  //   }
  //   timeout = setTimeout(function() {
  //     userControl = false;
  //   }, 1000);
  // }

  let updated = false;
  document.getElementById("axis").innerHTML = html;
  for (let i = 0; i < dimensions; i++) {
    document.getElementById(`axis-${i}`).addEventListener("input", () => {
      updated = true;
      document.getElementById("animation").checked = false;
    });
  }

  return {
    set(camPos) {
      for (let i = 0; i < dimensions; i++) {
        document.getElementById(`axis-${i}`).value = camPos[i] || -6;
      }
    },
    userControl() {
      return !document.getElementById("animation").checked;
    },
    getUpdated() {
      const hadUpdate = updated;
      updated = false;
      return hadUpdate;
    },
    get() {
      const camPos = [];
      for (let i = 0; i < dimensions; i++) {
        camPos[i] = parseFloat(document.getElementById(`axis-${i}`).value, 10);
      }
      return camPos;
    }
  };
}

let camPos = [];

let lastT = 0;
let sampleResolution = 20;
let dtAvg = 16;
function start(dimensions) {
  sampleResolution = 20;
  let sopped = false;

  function padVec(vec, filler = 0, dim = dimensions) {
    const res = [];
    for (let i = 0; i < dim; i++) {
      res[i] = vec[i] === undefined ? filler : vec[i];
    }
    return res;
  }

  function stackSpheres(dim) {
    const objects = [];
    const count = 2 ** dim;
    const outerR = 1;
    for (let i = 0; i < count; i++) {
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
        color: [40, 90, 255, 200]
      });
    }
    objects.push({
      pos: padVec([], 0),
      radius: Math.sqrt(dim) - outerR,
      color: [255, 90, 40, 160]
    });
    return objects;
  }

  const lightBasePos = padVec([0, 0, 4], -3);

  const objectsOrg = stackSpheres(dimensions);

  const axisControls = initAxisControls(dimensions);
  axisControls.set(camPos);

  function draw(t) {
    const dt = t - lastT;
    dtAvg = (dtAvg * 30 + dt) / 31;
    lastT = t;

    if (!axisControls.userControl()) {
      if (dtAvg < 26) {
        sampleResolution = Math.min(sampleResolution * 1.1, 500);
      } else if (dt > 33) {
        sampleResolution = Math.max(sampleResolution * 0.9, 20);
      }
    } else if (axisControls.getUpdated()) {
      sampleResolution = 40;
    } else if (sampleResolution < 240) {
      sampleResolution *= 1.25;
    }

    const lightPos = addVec(
      lightBasePos,
      padVec(mulScalar(getRotation(t, 20 * 1000), 2), 0)
    );

    if (axisControls.userControl()) {
      camPos = axisControls.get();
    } else {
      camPos = addVec(
        padVec([...mulScalar(getRotation(t, 12 * 1000), 8), 0, -8], -8),
        padVec([0, 0, ...mulScalar(getRotation(t, 6 * 1000), 2)], 0)
      );
      axisControls.set(camPos);
    }

    const objects = [
      ...objectsOrg
      // {
      //   pos: lightPos,
      //   radius: 0.1,
      //   color: [230, 0, 0, 20]
      // }
    ];

    const offsetY = (minCanvasDim - canvas.height) / 2;
    const offsetX = (minCanvasDim - canvas.width) / 2;

    function scaleCenter(n, m) {
      return n * m - m / 2;
    }

    let sampleCount = 0;
    function sample(x, y) {
      sampleCount++;
      const camDir = normalize(
        subVec(padVec([], 0, Math.min(dimensions, 3)), camPos)
      );
      const ortCamDir = [-camDir[1], camDir[0]];
      const posOnScree = [
        ...mulScalar(ortCamDir, scaleCenter(x, 0.8)),
        scaleCenter(y, 0.8)
      ];
      const dir = addVec(camDir, padVec(posOnScree, 0));

      // FIXME: the current impl would probably look something like this... just not quite...
      // const camDir = normalize(subVec(padVec([], 0), camPos));
      // const ortCamDirXy = normalize([-camDir[1], camDir[0]]);
      // const posOnScreeY = [...mulScalar(ortCamDirXy, x - 0.5), 0];
      // const ortCamDirYz = normalize([camDir[2], -camDir[1]]);
      // const posOnScreeX = [0, ...mulScalar(ortCamDirYz, y - 0.5)];
      // const dir = addVec(addVec(camDir, posOnScreeX), posOnScreeY);

      const ray = normalize(padVec(dir, 1));
      // const rayO = normalize(padVec([1, x - 0.5, y - 0.5], 1));
      return trace(objects, camPos, ray, lightPos);
    }

    const sampleResolutionRound = Math.round(sampleResolution / 10) * 10;
    const step = Math.round(minCanvasDim / sampleResolutionRound);
    for (let y = 0; y < canvas.height; y += step) {
      const relY = 1 - (y + offsetY) / minCanvasDim;

      for (let x = 0; x < canvas.width; x += step * 4) {
        const relX = (x + offsetX) / minCanvasDim;
        const color = sample(relX, relY);
        drawPixels(step, x, y, ...color);
      }

      for (let x = step * 1; x < canvas.width; x += step * 4) {
        const prev = getPixel(x - step * 1, y);
        const next = getPixel(x + step * 3, y);

        if (colorEq(prev, next)) {
          drawPixels(step, x, y, ...prev);
        } else {
          const relX = (x + offsetX) / minCanvasDim;
          const color = sample(relX, relY);
          drawPixels(step, x, y, ...color);
        }
      }

      for (let x = step * 2; x < canvas.width; x += step * 4) {
        const prev = getPixel(x - step * 2, y);
        const next = getPixel(x + step * 2, y);

        if (colorEq(prev, next)) {
          drawPixels(step, x, y, ...prev);
        } else {
          const relX = (x + offsetX) / minCanvasDim;
          const color = sample(relX, relY);
          drawPixels(step, x, y, ...color);
        }
      }

      for (let x = step * 3; x < canvas.width; x += step * 4) {
        const prev = getPixel(x - step * 3, y);
        const next = getPixel(x + step * 1, y);

        if (colorEq(prev, next)) {
          drawPixels(step, x, y, ...prev);
        } else {
          const relX = (x + offsetX) / minCanvasDim;
          const color = sample(relX, relY);
          drawPixels(step, x, y, ...color);
        }
      }
    }

    stats.innerText = `Stats: dt: ${dt.toFixed(2)} ms, avg: ${dtAvg.toFixed(
      2
    )} ms, samples: ${sampleCount}, res: ${sampleResolutionRound}`;

    if (!sopped) {
      updateCanvas();
      requestAnimationFrame(draw);
    }
  }

  requestAnimationFrame(draw);

  return () => {
    sopped = true;
  };
}

function resize() {
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
  minCanvasDim = Math.min(canvas.height, canvas.width);

  canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);
}

resize();
window.addEventListener("resize", resize);

let stop = start(4);
document
  .getElementsByName("dimensions")[0]
  .addEventListener("change", event => {
    const dimensions = Math.max(Math.round(event.target.value), 2);
    event.target.value = dimensions;
    stop();
    stop = start(dimensions);
  });
