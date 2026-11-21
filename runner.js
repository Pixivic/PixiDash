(() => {
  "use strict";

  const { frames, pose, contact } = globalThis.PixiSprites;
  const TILE = 16;
  const HEIGHT = 352;
  const LOWEST = HEIGHT - 4 * TILE;
  const HIGHEST = 11 * TILE;
  const START_SPEED = 156;
  const MAX_SPEED = 308;
  const ACCELERATION = 1.05;
  const GRAVITY = 1000;
  const JUMP_SPEED = Math.sqrt(2 * GRAVITY * 3 * TILE);
  const PAD_SPEED = Math.sqrt(2 * GRAVITY * 5 * TILE);
  const TAP_SPEED = 195;
  const PLAYER_LEFT = 8;
  const PLAYER_RIGHT = 17;
  const PLAYER_HEIGHT = 36;
  const COYOTE_TIME = 0.05;
  const BUFFER_TIME = 0.12;
  const BEE_SPEED = 42;
  const BEE_ALTITUDE = 60;
  const BEE_ENGAGE_LEAD = 4 * TILE;
  const BOAR_SPEED = 30;
  const BOAR_PATROL = TILE;
  const CORNER_CORRECTION = 3;
  const STEP = 1 / 120;
  const FRAME_TIME = 0.05;
  const JUMP_FRAMES = 3;
  const LANDING_FRAMES = frames.runner.length - JUMP_FRAMES;
  const BEE_FRAME_TIME = FRAME_TIME / 2;
  const BEE_TRANSITION_FRAME_TIME = 0.05;
  const BOAR_FRAME_TIME = 0.1;
  const PAD_IDLE_TIME = 0.1;
  const IDLE_PAD_FRAMES = 6;
  const PLAYER_SPRITE_LEFT = 35;
  const PLAYER_SPRITE_TOP = 49;
  const DEATH_GRAVITY = 420;
  const IMPACT_FALL_SPEED = 75;
  const MAX_DEATH_FALL_SPEED = 180;
  const GROUND_SLIDE_TIME = 0.72;
  const AIR_SLIDE_DRAG = 0.75;

  const PLATFORM_STYLES = {
    stone: { tiles: [4, 6], spacing: [0.14, 0.23] },
    shelf: { tiles: [7, 10], spacing: [0.17, 0.28] },
    ledge: { tiles: [9, 14], spacing: [0.27, 0.39] },
    clearing: { tiles: [16, 22], spacing: [0.19, 0.31] },
  };

  const SECTIONS = [
    [[1, "shelf"], [1, "stone"], [1, "clearing"]],
    [[-2, "ledge"], [0, "stone"], [1, "shelf"], [1, "clearing"]],
    [[2, "shelf"], [0, "stone"], [-1, "ledge"], [1, "clearing"]],
    [[0, "ledge"], [1, "stone"], [0, "stone"], [-1, "clearing"]],
    [[1, "ledge"], [1, "shelf"], [0, "clearing"], [-2, "shelf"]],
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const tileUp = (value) => Math.ceil(value / TILE) * TILE;
  const speedAt = (x) => Math.min(MAX_SPEED, Math.sqrt(START_SPEED ** 2 + 2 * ACCELERATION * Math.max(0, x)));
  const cameraAnchor = (width) => Math.round(clamp(width * 0.235, 56, 176));

  function deathFallDistance(velocity, dt) {
    const accelerating = Math.min(dt, (MAX_DEATH_FALL_SPEED - velocity) / DEATH_GRAVITY);
    return velocity * dt + DEATH_GRAVITY * accelerating * (dt - accelerating / 2);
  }

  function timeAt(x) {
    const speed = speedAt(x);
    const rampTime = (speed - START_SPEED) / ACCELERATION;
    const rampDistance = (speed + START_SPEED) * rampTime / 2;
    return rampTime + Math.max(0, x - rampDistance) / MAX_SPEED;
  }

  function makePlatform(x, end, y) {
    return { x, end, y, landingRoom: 0, pad: null, spike: null, bee: null, boar: null, bushes: [] };
  }

  function groundFrame(platform, x, y) {
    const column = x === platform.x ? 0 : x === platform.end - TILE ? 2 : 1;
    const row = y === platform.y ? 0 : y === HEIGHT - TILE ? 2 : 1;
    return frames.grass[row * 3 + column];
  }

  const obstacleApproach = (speed) => tileUp(speed * 0.37);
  const obstacleRecovery = (speed) => tileUp(speed * 0.55 + 1.5 * TILE);
  const lengthBonus = ({ x, end }) => clamp((end - x - 4 * TILE) / (32 * TILE), 0, 1);

  class Terrain {
    constructor(random) {
      this.random = random;
      this.platforms = [];
      this.descending = false;
      this.section = [];
      this.lastSection = null;
      this.direction = 1;
      this.lastPad = -Infinity;
      this.spikeWait = 2;
    }

    start(x, end) {
      const platform = makePlatform(x, end, LOWEST);
      this.addBushes(platform, [], true);
      this.platforms.push(platform);
    }

    extend(limit) {
      while (this.platforms.at(-1).end < limit) {
        const previous = this.platforms.at(-1);
        const next = this.nextPlatform(previous);
        if (this.platforms.length > 1 || previous.x >= 0) this.decorate(previous);
        this.platforms.push(next);
      }
    }

    nextPlatform(previous) {
      const { end, y } = previous;
      if (y === HIGHEST) this.descending = true;
      if (y === LOWEST) this.descending = false;

      const pad = this.section.length === 0 && y >= LOWEST - 2 * TILE && previous.x >= 0
        && end - previous.x - previous.landingRoom >= 4 * TILE
        && end - this.lastPad > 1100 && this.random() < 0.42;
      if (!pad && this.section.length === 0) this.startSection(y);
      const [step, kind] = pad ? [4, "ledge"] : this.section.shift();
      let change = pad ? step : step * this.direction;
      if ((y === LOWEST && change < 0) || (y === HIGHEST && change > 0)) change = -change;
      const top = clamp(y - change * TILE, HIGHEST, LOWEST);
      const style = PLATFORM_STYLES[kind];
      const isShort = kind === "stone" || kind === "shelf";
      const rise = y - top;
      const lift = pad ? PAD_SPEED : JUMP_SPEED;
      const speedAtHeight = Math.sqrt(lift ** 2 - 2 * GRAVITY * rise);
      const earliest = Math.max(0, (lift - speedAtHeight) / GRAVITY);
      const latest = (lift + speedAtHeight) / GRAVITY;
      const gap = this.pickGap(end, earliest, latest, style.spacing, isShort, pad);
      const landingRoom = tileUp(Math.max(TILE, speedAt(end + 160) * latest - gap - (pad ? 26 : 0)));
      const speed = speedAt(end + 480);
      const runway = !isShort
        ? landingRoom + obstacleApproach(speed) + obstacleRecovery(speed) + (kind === "clearing" ? 6 : 3) * TILE
        : landingRoom + 3 * TILE;
      const length = Math.max(runway, this.randomTiles(style.tiles));

      if (pad) {
        previous.pad = { x: end - 2 * TILE, used: -1 };
        this.lastPad = end;
      }

      const next = makePlatform(end + gap, end + gap + length, top);
      next.landingRoom = landingRoom;
      return next;
    }

    randomTiles([min, max]) {
      return (min + Math.floor(this.random() * (max - min + 1))) * TILE;
    }

    startSection(y) {
      const options = SECTIONS.filter((section) => section !== this.lastSection);
      this.lastSection = options[Math.floor(this.random() * options.length)];
      this.section = [...this.lastSection];
      const firstStep = this.section[0][0];
      if (y >= LOWEST - TILE && firstStep < 0) this.direction = -1;
      else if (y <= HIGHEST + TILE && firstStep < 0) this.direction = 1;
      else this.direction = this.descending ? -1 : 1;
    }

    pickGap(edge, earliest, latest, spacing, isShort, pad) {
      const minOffset = pad ? -30 : -24;
      const maxOffset = pad ? -26 : -16;
      const minGap = Math.max(isShort ? TILE : 2 * TILE, tileUp(
        maxOffset + PLAYER_RIGHT + 4 + speedAt(edge + 160) * earliest
      ));
      const maxGap = Math.min(144, Math.floor(
        (minOffset - 12 + speedAt(edge - 32) * latest) / TILE
      ) * TILE);
      const preferred = pad
        ? speedAt(edge) * (0.31 + this.random() * 0.06) - 17
        : speedAt(edge) * (spacing[0] + this.random() * (spacing[1] - spacing[0])) - 4;
      return clamp(tileUp(preferred), minGap, maxGap);
    }

    decorate(platform) {
      const { x, end, y, pad } = platform;
      const speed = speedAt(end);
      const first = x + platform.landingRoom + obstacleApproach(speed);
      const last = end - obstacleRecovery(speed);
      const reserved = [];

      if (pad) {
        reserved.push([pad.x - TILE, pad.x + 2 * TILE]);
      } else if (last >= first) {
        const room = (last - first) / TILE;
        const choose = this.random();
        const bonus = lengthBonus(platform);
        const spikeChance = 0.28 + 0.28 * bonus;
        const boarChance = 0.15 + 0.16 * bonus;
        const spike = this.spikeWait >= 2 || choose < spikeChance;
        const patrol = !spike && choose < spikeChance + boarChance && room >= 2;
        const inset = patrol ? 1 : 0;
        const slot = inset + Math.floor((room + 1 - 2 * inset) * this.random());
        const center = first + slot * TILE + TILE / 2;
        if (spike) {
          platform.spike = { x: center - TILE / 2, y, height: this.random() < 0.23 ? 32 : 16 };
          this.spikeWait = 0;
          reserved.push([center - TILE, center + TILE]);
        } else if (patrol) {
          platform.boar = { x: center, y, home: center, direction: -1 };
          reserved.push([center - 2 * TILE, center + 2 * TILE]);
        } else if (choose < 0.94) {
          platform.bee = {
            x: Infinity, crossing: center, crossingTime: timeAt(center), engageStart: null,
            phase: this.random() * Math.PI * 2,
          };
        }
        if (!platform.spike) this.spikeWait++;
      }

      this.addBushes(platform, reserved);
    }

    addBushes(platform, reserved, starting = false) {
      const patch = this.random();
      const bonus = lengthBonus(platform);
      const bareChance = (platform.spike ? 0.03 : 0.015) * (1 - 0.8 * bonus);
      if (!starting && patch < bareChance) return;
      const clustered = starting || patch >= 0.52;
      const density = starting ? 0.48
        : (clustered ? 0.34 : 0.23) + 0.09 * bonus + (platform.spike ? 0 : 0.05);
      const flowerChance = patch > 0.79 ? 0.5 : 0.34;
      const flowerColors = [1, 2, 3, 4];
      let remainingFlowers = [...flowerColors];
      let lastFlower = 0;
      const pickFlower = () => {
        if (this.random() >= flowerChance) return 0;
        if (!remainingFlowers.length) remainingFlowers = [...flowerColors];
        const choices = remainingFlowers.filter((color) => color !== lastFlower);
        lastFlower = choices[Math.floor(this.random() * choices.length)];
        remainingFlowers.splice(remainingFlowers.indexOf(lastFlower), 1);
        return lastFlower;
      };
      const available = (x, width) => x + width <= platform.end - TILE
        && reserved.every(([left, right]) => x + width <= left || x >= right);
      let firstOpen;
      let afterBig = false;
      let nextToBush = false;
      for (let x = platform.x + TILE; x < platform.end - TILE; x += TILE) {
        const fits = available(x, TILE);
        if (fits) firstOpen ??= x;
        const chance = density + (nextToBush && clustered ? 0.26 : 0);
        if (!fits || this.random() > chance) {
          afterBig = false;
          nextToBush = false;
          continue;
        }
        const big = available(x, 2 * TILE) && this.random() < (afterBig ? 0.18 : 0.45);
        const variant = Number(this.random() < 0.5);
        const flower = pickFlower();
        platform.bushes.push({ x, big, variant, flower });
        if (big) x += TILE;
        afterBig = big;
        nextToBush = true;
      }
      if (platform.bushes.length === 0 && firstOpen !== undefined) {
        platform.bushes.push({ x: firstOpen, big: false, variant: Number(this.random() < 0.5), flower: pickFlower() });
      }
    }

    trim(left) {
      while (this.platforms.length > 1 && this.platforms[0].end < left) {
        this.platforms.shift();
      }
    }
  }

  class Runner {
    constructor(width, random = Math.random, playSound = () => {}) {
      this.width = width;
      this.random = random;
      this.playSound = playSound;
      this.reset();
    }

    reset() {
      this.mode = "title";
      this.time = 0;
      this.courseTime = 0;
      this.deathTime = 0;
      this.deathSpeed = 0;
      this.deathDrag = 0;
      this.camera = 0;
      this.entryTarget = cameraAnchor(this.width);
      this.distance = 0;
      this.buffer = 0;
      this.coyote = 0;
      this.held = false;
      this.terrain = new Terrain(this.random);
      this.terrain.start(-12 * TILE, tileUp(Math.max(704, this.width * 0.86)));
      this.terrain.extend(this.width + 512);
      this.player = {
        x: -30, feet: LOWEST, velocity: 0, support: this.terrain.platforms[0],
        jump: -1, landing: -1, run: 0, bounced: false, stepOffY: null,
      };
    }

    start() {
      if (this.mode === "title") this.mode = "entering";
    }

    pressJump() {
      if (this.mode !== "running" && this.mode !== "entering") return;
      this.held = true;
      this.buffer = BUFFER_TIME;
    }

    releaseJump() {
      this.held = false;
      this.cutJump();
    }

    cutJump() {
      const player = this.player;
      if (!player.bounced && player.velocity < -TAP_SPEED) player.velocity = -TAP_SPEED;
    }

    get score() {
      return Math.floor(this.distance / 8);
    }

    resize(width) {
      this.width = width;
      if (this.mode === "title") this.entryTarget = cameraAnchor(width);
      if (this.mode === "running") this.followPlayer();
    }

    followPlayer() {
      this.camera = Math.max(0, this.player.x - cameraAnchor(this.width));
    }

    update(dt) {
      if (this.mode === "title") return;
      if (this.mode === "dead") {
        this.updateDeath(dt);
        return;
      }

      const player = this.player;
      const entering = this.mode === "entering";
      const speed = entering ? START_SPEED : speedAt(player.x);
      const previousTime = this.time;
      const previousPlayer = this.playerPose();
      this.time += dt;
      player.run += dt * (1 + (speed - START_SPEED) * 0.004);
      if (entering) {
        player.x = Math.min(this.entryTarget, player.x + speed * dt);
        if (player.x === this.entryTarget) {
          this.courseTime = timeAt(player.x);
          this.mode = "running";
        }
        return;
      }

      this.courseTime += dt;
      this.terrain.extend(this.camera + this.width + 640);
      if (player.support) this.coyote = COYOTE_TIME;
      this.tryJump();
      this.movePlayer(speed * dt, dt);
      if (this.mode === "dead") return;

      this.distance += speed * dt;
      this.followPlayer();
      this.coyote = Math.max(0, this.coyote - dt);
      this.buffer = Math.max(0, this.buffer - dt);
      if (player.jump >= 0) player.jump += dt;
      if (player.landing >= 0) {
        player.landing += dt;
        if (player.landing >= LANDING_FRAMES * FRAME_TIME) {
          player.landing = -1;
          player.run = 0;
        }
      }

      this.tryPad();
      this.tryJump();
      const playerPose = this.playerPose();
      if (!this.checkWalls(previousPlayer, playerPose)) {
        this.checkObjects(previousPlayer, playerPose, previousTime, dt);
      }
      this.terrain.trim(this.camera - 240);
    }

    updateDeath(dt) {
      this.deathTime += dt;
      for (const { bee, boar } of this.terrain.platforms) {
        if (bee) this.moveBee(bee);
        if (boar) this.moveBoar(boar, dt);
      }

      const player = this.player;
      if (player.feet > HEIGHT + PLAYER_SPRITE_TOP) return;

      const deceleration = this.deathDrag * (player.support ? 1 : AIR_SLIDE_DRAG);
      const slideTime = Math.min(dt, this.deathSpeed / deceleration);
      let dx = this.deathSpeed * slideTime - deceleration * slideTime * slideTime / 2;
      this.deathSpeed = Math.max(0, this.deathSpeed - deceleration * dt);

      const front = player.x + PLAYER_RIGHT;
      for (const platform of this.terrain.platforms) {
        if (platform.x >= front + dx) break;
        if (platform.x < front) continue;

        const distance = platform.x - front;
        const timeToWall = slideTime * distance / dx;
        const feetAtWall = player.support ? player.feet
          : player.feet + deathFallDistance(player.velocity, timeToWall);
        if (feetAtWall <= platform.y || feetAtWall - PLAYER_HEIGHT >= HEIGHT) continue;
        dx = distance;
        this.deathSpeed = 0;
        break;
      }
      this.movePlayer(dx, dt);
    }

    tryJump() {
      if (this.buffer > 0 && this.coyote > 0 && !this.player.bounced) {
        this.launch(JUMP_SPEED, false);
        if (!this.held) this.cutJump();
      }
    }

    launch(speed, bounced) {
      const player = this.player;
      player.velocity = -speed;
      player.support = null;
      player.stepOffY = null;
      player.jump = 0;
      player.landing = -1;
      player.bounced = bounced;
      this.coyote = 0;
      this.buffer = 0;
      this.playSound("jump");
    }

    movePlayer(dx, dt) {
      const player = this.player;
      const fromX = player.x;
      const fromY = player.feet;
      const nextX = fromX + dx;
      const wasGrounded = player.support !== null;

      if (wasGrounded && nextX - PLAYER_LEFT < player.support.end) {
        player.x = nextX;
        return;
      }
      player.support = null;

      if (wasGrounded) player.stepOffY = fromY;

      const dead = this.mode === "dead";
      let nextY = fromY + (dead ? deathFallDistance(player.velocity, dt)
        : player.velocity * dt + GRAVITY * dt * dt / 2);
      player.velocity = dead ? Math.min(MAX_DEATH_FALL_SPEED, player.velocity + DEATH_GRAVITY * dt)
        : player.velocity + GRAVITY * dt;
      for (const platform of this.terrain.platforms) {
        if (nextX + PLAYER_RIGHT <= platform.x) break;
        if (fromX - PLAYER_LEFT >= platform.end) continue;

        const top = platform.y;
        if (top <= (player.stepOffY ?? -Infinity)) continue;
        if (fromX + PLAYER_RIGHT <= platform.x) {
          const contact = (platform.x - fromX - PLAYER_RIGHT) / dx;
          const footAtWall = fromY + (nextY - fromY) * contact;
          const overlap = footAtWall - top;
          if (overlap > 0 && overlap <= CORNER_CORRECTION) {
            if (player.velocity >= 0) {
              this.land(platform, nextX, wasGrounded);
              return;
            }
            nextY -= overlap;
          }
        }

        if (fromY <= top && nextY >= top && nextY > fromY) {
          const contact = (top - fromY) / (nextY - fromY);
          const landingX = fromX + dx * contact;
          if (landingX + PLAYER_RIGHT >= platform.x && nextX - PLAYER_LEFT < platform.end) {
            this.land(platform, nextX, wasGrounded);
            return;
          }
        }
      }

      player.x = nextX;
      player.feet = nextY;
      if (player.jump < 0) {
        player.jump = (JUMP_FRAMES - 1) * FRAME_TIME;
        player.landing = -1;
      }
      if (!dead && player.feet > HEIGHT + PLAYER_HEIGHT + 8) this.die("fall");
    }

    land(platform, x, wasGrounded) {
      const player = this.player;
      player.x = x;
      player.feet = platform.y;
      player.velocity = 0;
      player.support = platform;
      player.stepOffY = null;
      player.bounced = false;
      if (!wasGrounded) player.landing = 0;
      player.jump = -1;
      this.coyote = COYOTE_TIME;
    }

    tryPad() {
      const player = this.player;
      const pad = player.support?.pad;
      if (pad && pad.used < 0 && player.x >= pad.x + 2 && player.x <= pad.x + 14) {
        pad.used = this.time;
        this.launch(PAD_SPEED, true);
      }
    }

    beeY(platform, time) {
      const bee = platform.bee;
      let y = platform.y - BEE_ALTITUDE;
      for (const ground of this.terrain.platforms) {
        const distance = Math.max(0, ground.x - bee.x - 19, bee.x - 19 - ground.end);
        y = Math.min(y, ground.y - BEE_ALTITUDE + distance * 2);
      }
      return y + Math.sin(time * 6 + bee.phase) * 2;
    }

    playerPose() {
      const { x, feet } = this.player;
      const frame = this.mode === "dead" ? frames.death[0] : frames.runner[this.playerFrame()];
      return pose(frame, x - PLAYER_SPRITE_LEFT, feet - PLAYER_SPRITE_TOP);
    }

    beePose(platform, time = this.time + this.deathTime) {
      const { bee } = platform;
      let frame = frames.bee[Math.floor(time / BEE_FRAME_TIME) % frames.bee.length];
      if (bee.engageStart !== null && time >= bee.engageStart) {
        const elapsed = time - bee.engageStart;
        const transition = frames.beeTransition;
        const engagedTime = Math.max(0, elapsed - transition.length * BEE_TRANSITION_FRAME_TIME);
        frame = transition[Math.floor(elapsed / BEE_TRANSITION_FRAME_TIME)]
          ?? frames.engaged[Math.floor(engagedTime / BEE_FRAME_TIME) % frames.engaged.length];
      }
      return pose(frame, bee.x - 19, this.beeY(platform, time) - 23);
    }

    boarPose(boar, time = this.time + this.deathTime) {
      const frame = frames.boar[Math.floor(time / BOAR_FRAME_TIME) % frames.boar.length];
      const flipped = boar.direction > 0;
      return pose(frame, boar.x - (flipped ? 15 : 14), boar.y - 17, flipped);
    }

    spikePose(spike) {
      return pose(frames.spikes[spike.height === 32 ? 0 : 1], spike.x, spike.y - 31);
    }

    checkWalls(previous, player) {
      const left = Math.min(previous.left, player.left);
      const right = Math.max(previous.x, player.x) + player.frame.width;
      const top = Math.floor(Math.min(previous.y, player.y) / TILE) * TILE;
      const bottom = Math.min(HEIGHT, Math.max(previous.y, player.y) + player.frame.height);
      const feet = Math.max(previous.y, player.y) + PLAYER_SPRITE_TOP;
      for (const platform of this.terrain.platforms) {
        if (platform.x >= right) break;
        const correction = platform.y <= (this.player.stepOffY ?? -Infinity) ? 0 : CORNER_CORRECTION;
        if (platform.x < left || platform === this.player.support || feet <= platform.y + correction) continue;
        for (let x = platform.x; x < Math.min(right, platform.end); x += TILE) {
          for (let y = Math.max(top, platform.y); y < bottom; y += TILE) {
            const tile = pose(groundFrame(platform, x, y), x, y);
            if (this.hitSprite("wall", previous, player, tile, tile, platform.x)) return true;
          }
        }
      }
      return false;
    }

    moveBee(bee) {
      bee.x = bee.crossing + BEE_SPEED * (bee.crossingTime - (this.courseTime + this.deathTime));
      if (bee.engageStart === null && bee.x - this.camera <= this.width / 2 + BEE_ENGAGE_LEAD) {
        bee.engageStart = this.time + this.deathTime;
      }
    }

    moveBoar(boar, dt) {
      boar.x += BOAR_SPEED * boar.direction * dt;
      if (Math.abs(boar.x - boar.home) >= BOAR_PATROL) {
        boar.x = boar.home + BOAR_PATROL * boar.direction;
        boar.direction *= -1;
      }
    }

    checkObjects(previous, player, time, dt) {
      for (const platform of this.terrain.platforms) {
        const { spike, bee, boar } = platform;
        if (bee) {
          const before = Number.isFinite(bee.x) ? this.beePose(platform, time) : null;
          this.moveBee(bee);
          const current = this.beePose(platform);
          if (this.hitSprite("bee", previous, player, before ?? current, current)) return;
        }
        if (boar) {
          const before = this.boarPose(boar, time);
          this.moveBoar(boar, dt);
          if (this.hitSprite("boar", previous, player, before, this.boarPose(boar))) return;
        }
        if (spike) {
          const current = this.spikePose(spike);
          if (this.hitSprite("spikes", previous, player, current, current)) return;
        }
      }
    }

    hitSprite(cause, previous, player, from, to, wallX = Infinity) {
      const impact = contact(previous, player, from, to);
      if (!impact) return false;
      const body = this.player;
      body.x = Math.min(impact.first.x + PLAYER_SPRITE_LEFT, wallX - PLAYER_RIGHT);
      body.feet = impact.first.y + PLAYER_SPRITE_TOP;
      if (body.support && (body.feet !== body.support.y || body.x + PLAYER_RIGHT <= body.support.x
        || body.x - PLAYER_LEFT >= body.support.end)) body.support = null;
      this.die(cause);
      return true;
    }

    die(cause) {
      this.mode = "dead";
      this.deathTime = 0;
      const speed = speedAt(this.player.x);
      this.deathSpeed = cause === "wall" || cause === "fall" ? 0 : speed;
      this.deathDrag = speed / GROUND_SLIDE_TIME;
      this.player.velocity = clamp(this.player.velocity, 0, IMPACT_FALL_SPEED);
      this.cause = cause;
      this.playSound("dead");
    }

    playerFrame() {
      const { jump, landing, run } = this.player;
      if (jump >= 0) return Math.min(JUMP_FRAMES - 1, Math.floor(jump / FRAME_TIME));
      if (landing >= 0) return Math.min(frames.runner.length - 1, JUMP_FRAMES + Math.floor(landing / FRAME_TIME));
      return Math.floor(run / FRAME_TIME) % frames.runner.length;
    }

    padFrame(pad) {
      if (pad.used >= 0) return Math.min(8, Math.floor((this.time - pad.used) / FRAME_TIME));
      return Math.floor(this.time / PAD_IDLE_TIME) % IDLE_PAD_FRAMES;
    }
  }

  globalThis.PixiDash = { Runner, TILE, HEIGHT, STEP, groundFrame };
})();
