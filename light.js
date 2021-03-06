class Light {
  static COLOURS = [
    '#fff',
    '#f00',
    '#0f0',
    '#00f',
    '#ff0',
    '#f0f',
    '#0ff'
  ];

  /*
   * Light circle will be offset upwards by this amount on walls
   */
  static WALL_Y_OFFSET = 50;

  /*
   * Shadow length is based on distance to shadow base & wall height, then multiplied by this value
   */
  static WALL_SHADOW_LENGTH = 1.5;

  /*
   * Walls are only lit when a light is below them, but light will fade out smoothly when light is above them
   * and within this y-offset
   */
  static WALL_SHADOW_CUTOFF_DISTANCE = 50;

  constructor(x, y, r, c = 0) {
    this.position = vec(x, y);
    this.radius = r;
    this.c = c;

    // Each light has its own floor lightmap canvas
    this.floorShadowMapCanvas = document.createElement('canvas');
    this.floorShadowMapContext = this.floorShadowMapCanvas.getContext('2d');

    // Each light has its own wall lightmap canvas
    this.wallShadowMapCanvas = document.createElement('canvas');
    this.wallShadowMapContext = this.wallShadowMapCanvas.getContext('2d');

    // Dragging
    this.hovered = false;
    this.dragging = false;
    this.dragOffset = null;
    this.hoverSize = 8;
    this.disposed = false;
  }

  get colour() {
    return Light.COLOURS[this.c];
  }

  nextColour() {
    this.c++;
    if (this.c >= Light.COLOURS.length) {
      this.c = 0;
    }
  }

  prevColour() {
    this.c--;
    if (this.c < 0) {
      this.c = Light.COLOURS.length - 1;
    }
  }

  serialize() {
    return {
      position: this.position,
      radius: this.radius,
      colour: this.c
    };
  }

  static deserialize(data) {
    return new Light(
      data.position.x,
      data.position.y,
      data.radius,
      data.colour
    );
  }

  update() {

    // Check if hovered
    const p = input.mousePosition();
    this.hovered = this.dragging || (
      p.x >= this.position.x - this.hoverSize &&
      p.x <= this.position.x + this.hoverSize &&
      p.y >= this.position.y - this.hoverSize &&
      p.y <= this.position.y + this.hoverSize
    );

    // Start dragging or resizing
    if (this.hovered && input.mouseClicked()) {
      if (input.keyDown('Control')) {
        this.resizing = true;
      } else {
        this.dragging = true;
      }
      this.dragOffset = vec.sub(p, this.position);
    }

    // Stop dragging or resizing
    if ((this.dragging || this.resizing) && !input.mouseDown()) {
      this.dragging = false;
      this.resizing = false;
      this.dragOffset = null;
    }

    // Handle dragging
    if (this.dragging) {
      this.position = vec.sub(p, this.dragOffset);
    }

    // Handle resizing
    if (this.resizing) {
      this.radius = Math.max(20, vec.len(vec.sub(p, this.position)));
    }
    this.floorShadowMapCanvas.width = this.floorShadowMapCanvas.height = this.radius * 2;
    this.wallShadowMapCanvas.width = this.wallShadowMapCanvas.height = this.radius * 2;

    // Delete
    if (this.hovered && input.keyPressed('Delete')) {
      this.disposed = true;
    }

    // Change colour
    if (this.hovered && input.keyPressed('a')) {
      this.nextColour();
    }
    if (this.hovered && input.keyPressed('z')) {
      this.prevColour();
    }
  }

  draw(context) {

    // Draw light marker on main canvas
    context.save();
    context.strokeStyle = '#ff0';
    context.lineWidth = 2;
    context.beginPath();
    cross(context, this.position.x, this.position.y);
    context.stroke();
    if (this.hovered || this.resizing) {
      context.beginPath();
      context.rect(
        this.position.x - this.hoverSize,
        this.position.y - this.hoverSize,
        this.hoverSize * 2,
        this.hoverSize * 2
      );
      context.moveTo(
        this.position.x + this.radius,
        this.position.y
      );
      context.arc(
        this.position.x,
        this.position.y,
        this.radius,
        0,
        Math.PI * 2
      );
      context.stroke();
    }
    context.restore();
  }

  drawLightMaps(globalLightMapContext, actors) {
    this.floorShadowMapContext.save();
    this.wallShadowMapContext.save();

    this.floorShadowMapContext.clearRect(0, 0, this.radius * 2, this.radius * 2);
    this.wallShadowMapContext.clearRect(0, 0, this.radius * 2, this.radius * 2);

    // Fill lightmaps with darkness
    // Floor
    this.floorShadowMapContext.fillStyle = 'white';
    this.floorShadowMapContext.fillRect(0, 0, this.radius * 2, this.radius * 2);
    // Wall
    this.wallShadowMapContext.fillStyle = 'black';
    this.wallShadowMapContext.fillRect(0, 0, this.radius * 2, this.radius * 2);

    // Add light to wall lightmap
    this.wallShadowMapContext.beginPath();
    this.wallShadowMapContext.rect(0, 0, this.radius * 2, this.radius * 2);
    const wallGradient = this.wallShadowMapContext.createRadialGradient(
      this.radius,
      this.radius,
      0,
      this.radius,
      this.radius,
      this.radius
    );
    wallGradient.addColorStop(0, this.colour);
    wallGradient.addColorStop(1, 'black');
    this.wallShadowMapContext.fillStyle = wallGradient;
    this.wallShadowMapContext.fill();

    // Subtract shadows from lightmap
    this.drawShadows(actors);

    // Add light to floor lightmap
    this.floorShadowMapContext.beginPath();
    this.floorShadowMapContext.rect(0, 0, this.radius * 2, this.radius * 2);
    const floorGradient = this.floorShadowMapContext.createRadialGradient(
      this.radius,
      this.radius,
      0,
      this.radius,
      this.radius,
      this.radius
    );
    floorGradient.addColorStop(0, this.colour);
    floorGradient.addColorStop(1, 'black');
    this.floorShadowMapContext.fillStyle = floorGradient;
    this.floorShadowMapContext.globalCompositeOperation = 'multiply';
    this.floorShadowMapContext.fill();

    this.floorShadowMapContext.restore();
    this.wallShadowMapContext.restore();

    // Draw this light's shadowmaps onto global lightmap
    // Floor
    globalLightMapContext.save();
    globalLightMapContext.globalCompositeOperation = 'screen';
    globalLightMapContext.drawImage(
      this.floorShadowMapCanvas,
      this.position.x - this.radius,
      this.position.y - this.radius
    );
    // Wall
    globalLightMapContext.beginPath();
    actors.filter(actor => actor instanceof ShadowWall).forEach(actor => {
      polygon(globalLightMapContext, ...actor.vertices);
    });
    globalLightMapContext.clip();
    globalLightMapContext.globalCompositeOperation = 'screen';
    globalLightMapContext.drawImage(
      this.wallShadowMapCanvas,
      this.position.x - this.radius,
      this.position.y - this.radius - Light.WALL_Y_OFFSET
    );
    globalLightMapContext.restore();
  }

  drawShadows(actors) {

    // Prepare floor lightmap
    this.floorShadowMapContext.save();
    this.floorShadowMapContext.translate(
      -this.position.x + this.radius,
      -this.position.y + this.radius
    );
    this.floorShadowMapContext.fillStyle = 'black';
    this.floorShadowMapContext.strokeStyle = 'black';

    // Prepare wall lightmap
    this.wallShadowMapContext.save();
    this.wallShadowMapContext.translate(
      -this.position.x + this.radius,
      -this.position.y + this.radius + Light.WALL_Y_OFFSET
    );
    this.wallShadowMapContext.fillStyle = 'black';
    this.wallShadowMapContext.strokeStyle = 'black';

    // Get a list of walls
    const walls = actors.filter(actor => actor instanceof ShadowWall);

    // If the wall is below the light, it is in shadow
    walls.forEach(wall => {
      const wallY = wall.bottom;
      if (wallY > this.position.y) {
        this.wallShadowMapContext.save();
        this.wallShadowMapContext.beginPath();
        polygon(this.wallShadowMapContext, ...wall.vertices);

        // Fade shadow in when light goes above the wall
        if (wallY < this.position.y + Light.WALL_SHADOW_CUTOFF_DISTANCE) {
          this.wallShadowMapContext.globalAlpha = (wallY - this.position.y) / Light.WALL_SHADOW_CUTOFF_DISTANCE;
        }
        this.wallShadowMapContext.fill();
        this.wallShadowMapContext.stroke();
        this.wallShadowMapContext.restore();
      }
    });

    // Cast shadows from each shadow base onto the floor lightmap
    actors.filter(actor => actor instanceof ShadowBase).forEach(shadowBase => {
      const vertices = shadowBase.vertices;

      // If this shadow base is offset from the floor, render a shadow using the shadow base's profile
      let shadowY = shadowBase.bottom;
      if (shadowBase.offset > 0) {
        this.floorShadowMapContext.beginPath();
        polygon(this.floorShadowMapContext, ...shadowBase.vertices.map(v => {
          const d = vec.sub(v, this.position);
          return vec.add(v, vec.mul(d, shadowBase.offset));
        }));
        this.floorShadowMapContext.fill();
        this.floorShadowMapContext.stroke();
        shadowY += (shadowY - this.position.y) * shadowBase.offset;
      }

      // Render a shadow volume for each pair of vertices
      for (let i = 0; i < vertices.length; i++) {
        const previous = vertices[(i === 0 ? vertices.length : i) - 1];
        const current = vertices[i];
        const edge = vec.nor(vec.sub(current, previous));
        const edgeNormal = vec(-edge.y, edge.x);
        const lightNormal = vec.nor(vec.sub(
          vec.mul(vec.add(previous, current), 0.5),
          this.position
        ));

        // Check if edge is facing away from the light
        if (vec.dot(edgeNormal, lightNormal) < 0) {
          this.projectShadow(previous, current, shadowBase, walls, shadowY);
        }
      }
    });

    // Subtract walls from floor shadowmap
    this.floorShadowMapContext.fillStyle = 'black';
    walls.forEach(wall => {
      this.floorShadowMapContext.beginPath();
      polygon(this.floorShadowMapContext, ...wall.vertices);
      this.floorShadowMapContext.fill();
    });

    this.floorShadowMapContext.restore();
    this.wallShadowMapContext.restore();
  }

  projectShadow(a, b, shadowBase, walls, shadowOffset) {
    const aDelta = vec.sub(a, this.position);
    const bDelta = vec.sub(b, this.position);
    let v1 = vec(a);
    let v4 = vec(b);

    // If this shadow base is offset from the floor, offset the starting vertices for this shadow volume
    if (shadowBase.offset > 0) {
      v1 = vec.add(v1, vec.mul(aDelta, shadowBase.offset));
      v4 = vec.add(v4, vec.mul(bDelta, shadowBase.offset));
    }

    // Length of shadow based on distance to light source
    const v2 = vec.add(v1, vec.mul(aDelta, shadowBase.depth));
    const v3 = vec.add(v4, vec.mul(bDelta, shadowBase.depth));

    // Create floor shadow shape
    this.floorShadowMapContext.beginPath();
    polygon(this.floorShadowMapContext, v1, v2, v3, v4);
    this.floorShadowMapContext.fill();
    this.floorShadowMapContext.stroke();

    // Extend shadow onto walls
    walls.forEach(wall => {
      const wallY = wall.bottom;

      // Check if the shadow begins below the wall and extends beyond the wall's lower edge
      if (!(a.y >= wallY && b.y >= wallY && (v2.y < wallY || v3.y < wallY))) {
        return;
      }

      // Get intersection of shadow edge segments to an infinite line coplanar to the wall's bottom edge
      const v2Intersection = vec(
        Math.clamp(
          Math.lerp(v1.x, v2.x, Math.unlerp(v1.y, v2.y, wallY)),
          Math.min(v1.x, v2.x),
          Math.max(v1.x, v2.x)
        ),
        wallY
      );
      const v3Intersection = vec(
        Math.clamp(
          Math.lerp(v4.x, v3.x, Math.unlerp(v4.y, v3.y, wallY)),
          Math.min(v4.x, v3.x),
          Math.max(v4.x, v3.x)
        ),
        wallY
      );

      // Calculate shadow min/max boundaries (ie. min = left and max = right)
      let min = v2Intersection.x, max = v3Intersection.x;

      // Check if the shadow edge falls short of the wall edge
      if (v2.y >= wallY) {
        min = v2.x;
      }
      if (v3.y >= wallY) {
        max = v3.x;
      }

      // Calculate shadow height
      const height = Math.max(0, wallY - Math.min(v2.y, v3.y)) * Light.WALL_SHADOW_LENGTH;

      // Calculate shadow offset
      const offset = Math.max(0, wallY - shadowOffset) * Light.WALL_SHADOW_LENGTH;

      // If the wall shadow height or width is 0, don't draw the shadow
      if (height === 0 || min - max === 0) {
        return;
      }

      // Create a clipping mask for the wall's boundaries
      this.wallShadowMapContext.save();
      this.wallShadowMapContext.beginPath();
      polygon(this.wallShadowMapContext, ...wall.vertices);

      // Subtract other walls below this one so we don't draw this wall's shadow onto them
      walls.filter(w => w.bottom > wallY).forEach(w => {
        const overlap = this.overlap2d(w.bounds, wall.bounds);
        if (overlap) {
          polygon(this.wallShadowMapContext, ...this.overlapVertices(overlap).reverse());
        }
      });
      this.wallShadowMapContext.clip();

      // Create wall shadow shape
      this.wallShadowMapContext.beginPath();
      polygon(
        this.wallShadowMapContext,
        vec(min, Math.max(wallY - offset, wall.position.y)),
        vec(max, Math.max(wallY - offset, wall.position.y)),
        vec(max, Math.max(wallY - height, wall.position.y)),
        vec(min, Math.max(wallY - height, wall.position.y))
      );
      this.wallShadowMapContext.fill();
      this.wallShadowMapContext.stroke();
      this.wallShadowMapContext.restore();
    });
  }

  // Get a's overlap on b, return start and length
  overlap1d(a1, a2, b1, b2) {
    if (a2 < b1 || a1 > b2) {
      return false;
    }
    return { start: Math.max(a1, b1), length: Math.min(a2, b2) - Math.max(a1, b1) };
  }

  overlap2d(a, b) {
    const xOverlap = this.overlap1d(a.left, a.right, b.left, b.right);
    const yOverlap = this.overlap1d(a.top, a.bottom, b.top, b.bottom);
    if (xOverlap && yOverlap) {
      return {
        start: vec(xOverlap.start, yOverlap.start),
        size: vec(xOverlap.length, yOverlap.length)
      };
    }
    return false;
  }

  overlapVertices(o) {
    return [
      o.start,
      vec(o.start.x + o.size.x, o.start.y),
      vec(o.start.x + o.size.x, o.start.y + o.size.y),
      vec(o.start.x, o.start.y + o.size.y)
    ];
  }
}
