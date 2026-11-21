(() => {
  "use strict";

  const screen = document.querySelector("#crt-screen");
  const output = screen.getContext("2d", { alpha: false });
  const scene = screen.parentElement;
  const signal = document.createElement("canvas");
  const video = signal.getContext("2d", { alpha: false });
  const curved = document.createElement("canvas");
  const lens = curved.getContext("2d", { alpha: false });
  const bloom = document.createElement("canvas");
  const light = bloom.getContext("2d", { alpha: false });
  const mask = document.createElement("canvas");
  const phosphors = mask.getContext("2d");
  let maskHeight = 0;
  let maskRatio = 0;

  function resize(height, ratio) {
    if (!height || (height === maskHeight && ratio === maskRatio)) return;
    maskHeight = height;
    maskRatio = ratio;
    mask.width = 3;
    mask.height = Math.max(1, Math.round(height * ratio));
    const pixels = phosphors.createImageData(mask.width, mask.height);
    const lines = globalThis.PixiDash.HEIGHT;
    const softness = Math.min(1.35, Math.max(0.65, height / lines * 0.44));
    scene.style.setProperty("--crt-ui-blur", softness + "px");
    const detail = Math.min(1, Math.max(0, (mask.height / lines - 1) / 1.65));

    for (let y = 0; y < mask.height; y++) {
      const row = (y + 0.5) / mask.height;
      const beam = Math.abs(row * lines % 1 - 0.5) * 2;
      const intensity = (1 - 0.45 * detail * beam ** 2) * (1 - 0.09 * (row * 2 - 1) ** 4);
      const active = Math.round(255 * intensity ** (1 / 2.2));
      const inactive = Math.round(255 * (intensity * (1 - 0.34 * detail)) ** (1 / 2.2));
      for (let x = 0; x < mask.width; x++) {
        const i = (y * mask.width + x) * 4;
        pixels.data[i] = x === 0 ? active : inactive;
        pixels.data[i + 1] = x === 1 ? active : inactive;
        pixels.data[i + 2] = x === 2 ? active : inactive;
        pixels.data[i + 3] = 255;
      }
    }
    phosphors.putImageData(pixels, 0, 0);
    scene.style.setProperty("--crt-phosphors", 'url("' + mask.toDataURL() + '")');
    scene.style.setProperty("--crt-mask-width", mask.width / ratio + "px");
  }

  function draw(source) {
    const { width, height } = source;
    if (screen.width !== width || screen.height !== height) {
      screen.width = signal.width = curved.width = width;
      screen.height = signal.height = curved.height = height;
      bloom.width = Math.ceil(width / 4);
      bloom.height = Math.ceil(height / 4);
      light.filter = "contrast(2.8) brightness(1.12) blur(0.9px)";
    }

    video.drawImage(source, 0, 0);
    video.globalAlpha = 0.15;
    video.drawImage(source, 1, 0);
    video.globalAlpha = 0.10;
    video.drawImage(source, -1, 0);
    video.globalAlpha = 1;

    light.drawImage(source, 0, 0, bloom.width, bloom.height);
    video.globalCompositeOperation = "screen";
    video.globalAlpha = 0.24;
    video.drawImage(bloom, 0, 0, width, height);
    video.globalAlpha = 1;
    video.globalCompositeOperation = "source-over";

    for (let y = 0; y < height; y += 8) {
      const rows = Math.min(8, height - y);
      const v = (y + rows / 2) / height * 2 - 1;
      const inset = width * (0.007 * v ** 2 - 0.008);
      lens.drawImage(signal, 0, y, width, rows, inset, y, width - 2 * inset, rows);
    }

    for (let x = 0; x < width; x += 16) {
      const columns = Math.min(16, width - x);
      const u = (x + columns / 2) / width * 2 - 1;
      const inset = height * (0.012 * u ** 2 - 0.013);
      output.drawImage(curved, x, 0, columns, height, x, inset, columns, height - 2 * inset);
    }
  }

  globalThis.PixiCRT = { draw, resize };
})();
