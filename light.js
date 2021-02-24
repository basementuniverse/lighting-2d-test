class Light {
  static colours = [
    '#fff',
    '#f00',
    '#0f0',
    '#00f',
    '#ff0',
    '#f0f',
    '#0ff'
  ];

  constructor(x, y, r, c = 0) {
    this.position = vec(x, y);
    this.radius = r;
    this.c = c;
    this.wallYOffset = 50;

    // Each light has its own floor lightmap canvas
    this.floorLightMapCanvas = document.createElement('canvas');
    this.floorLightMapContext = this.floorLightMapCanvas.getContext('2d');

    // Each light has its own wall lightmap canvas
    this.wallLightMapCanvas = document.createElement('canvas');
    this.wallLightMapContext = this.wallLightMapCanvas.getContext('2d');

    // Dragging
    this.hovered = false;
    this.dragging = false;
    this.dragOffset = null;
    this.hoverSize = 8;
    this.disposed = false;
  }

  get colour() {
    return Light.colours[this.c];
  }

  nextColour() {
    this.c++;
    if (this.c >= Light.colours.length) {
      this.c = 0;
    }
  }

  prevColour() {
    this.c--;
    if (this.c < 0) {
      this.c = Light.colours.length - 1;
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
    this.floorLightMapCanvas.width = this.floorLightMapCanvas.height = this.radius * 2;
    this.wallLightMapCanvas.width = this.wallLightMapCanvas.height = this.radius * 2;

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

  drawLightMaps(globalFloorLightMapContext, globalWallLightMapContext, actors) {
    this.floorLightMapContext.clearRect(0, 0, this.radius * 2, this.radius * 2);
    this.wallLightMapContext.clearRect(0, 0, this.radius * 2, this.radius * 2);

    // Fill lightmaps with darkness
    // Floor
    this.floorLightMapContext.fillStyle = 'black';
    this.floorLightMapContext.fillRect(0, 0, this.radius * 2, this.radius * 2);
    // Wall
    this.wallLightMapContext.fillStyle = 'black';
    this.wallLightMapContext.fillRect(0, 0, this.radius * 2, this.radius * 2);

    // Add light to lightmap
    // Floor
    this.floorLightMapContext.beginPath();
    this.floorLightMapContext.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    const floorGradient = this.floorLightMapContext.createRadialGradient(
      this.radius,
      this.radius,
      0,
      this.radius,
      this.radius,
      this.radius
    );
    floorGradient.addColorStop(0, this.colour);
    floorGradient.addColorStop(1, 'transparent');
    this.floorLightMapContext.fillStyle = floorGradient;
    this.floorLightMapContext.fill();
    // Wall
    this.wallLightMapContext.beginPath();
    this.wallLightMapContext.arc(this.radius, this.radius, this.radius, 0, Math.PI * 2);
    const wallGradient = this.wallLightMapContext.createRadialGradient(
      this.radius,
      this.radius,
      0,
      this.radius,
      this.radius,
      this.radius
    );
    wallGradient.addColorStop(0, this.colour);
    wallGradient.addColorStop(1, 'transparent');
    this.wallLightMapContext.fillStyle = wallGradient;
    this.wallLightMapContext.fill();

    // Subtract shadows from lightmap
    this.drawShadows(actors);

    // Draw this light's lightmaps onto global lightmaps
    // Floor
    globalFloorLightMapContext.save();
    globalFloorLightMapContext.globalCompositeOperation = 'screen';
    globalFloorLightMapContext.drawImage(
      this.floorLightMapCanvas,
      this.position.x - this.radius,
      this.position.y - this.radius
    );
    globalFloorLightMapContext.restore();
    // Wall
    globalWallLightMapContext.save();
    globalWallLightMapContext.globalCompositeOperation = 'screen';
    globalWallLightMapContext.drawImage(
      this.wallLightMapCanvas,
      this.position.x - this.radius,
      this.position.y - this.radius - this.wallYOffset
    );
    globalWallLightMapContext.restore();
  }

  drawShadows(actors) {

    // Prepare floor lightmap
    this.floorLightMapContext.save();
    this.floorLightMapContext.translate(
      -this.position.x + this.radius,
      -this.position.y + this.radius
    );
    this.floorLightMapContext.fillStyle = 'black';
    this.floorLightMapContext.strokeStyle = 'black';

    // Prepare wall lightmap
    this.wallLightMapContext.save();
    this.wallLightMapContext.translate(
      -this.position.x + this.radius,
      -this.position.y + this.radius + this.wallYOffset
    );
    this.wallLightMapContext.fillStyle = 'black';
    this.wallLightMapContext.strokeStyle = 'black';

    // Get a list of walls
    const walls = actors.filter(actor => actor instanceof ShadowWall);

    // Cast shadows from each shadow base onto the floor lightmap
    actors.filter(actor => actor instanceof ShadowBase).forEach(shadowBase => {
      const vertices = shadowBase.vertices;
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
          this.projectShadow(previous, current, shadowBase, walls);
        }
      }
    });
    this.floorLightMapContext.restore();
  }

  projectShadow(a, b, shadowBase, walls) {
    const d1 = vec.sub(a, this.position);
    const d2 = vec.sub(b, this.position);

    // Length of shadow based on distance to light source
    const v1 = vec.add(a, vec.mul(d1, shadowBase.depth));
    const v2 = vec.add(b, vec.mul(d2, shadowBase.depth));

    // Create floor shadow shape
    this.floorLightMapContext.beginPath();
    polygon(this.floorLightMapContext, a, v1, v2, b);
    this.floorLightMapContext.fill();
    this.floorLightMapContext.stroke();

    // Extend shadow onto walls
    walls.forEach(wall => {
      const wallY = wall.bottom;

      // If the wall is below the light, it is in shadow
      if (wallY > this.position.y) {
        this.wallLightMapContext.save();
        this.wallLightMapContext.beginPath();
        polygon(this.wallLightMapContext, ...wall.vertices);
        this.wallLightMapContext.fill();
        this.wallLightMapContext.stroke();
        this.wallLightMapContext.restore();
        return;
      }

      // Check if the shadow begins below the wall and extends beyond the wall's lower edge
      if (!(a.y >= wallY && b.y >= wallY && (v1.y < wallY || v2.y < wallY))) {
        return;
      }

      // Get intersection of shadow edge segments to an infinite line coplanar to the wall's bottom edge
      const v1Intersection = vec(
        Math.lerp(a.x, v1.x, Math.unlerp(a.y, v1.y, wallY)),
        wallY
      );
      const v2Intersection = vec(
        Math.lerp(b.x, v2.x, Math.unlerp(b.y, v2.y, wallY)),
        wallY
      );

      // Calculate shadow min/max boundaries (ie. min = left and max = right)
      let min = v1Intersection.x, max = v2Intersection.x;

      // Check if the shadow edge falls short of the wall
      if (v1.y > wallY) {
        min = v1.x;
      }
      if (v2.y > wallY) {
        max = v2.x;
      }

      // Calculate shadow height
      const h = Math.max(
        v1.y <= wallY ? (v1Intersection.y - v1.y) : 0,
        v2.y <= wallY ? (v2Intersection.y - v2.y) : 0
      ) * 1.4;

      // If the wall shadow height or width is 0, don't draw the shadow
      if (h === 0 || min - max === 0) {
        return;
      }

      // Create a clipping mask for the wall's boundaries
      this.wallLightMapContext.save();
      this.wallLightMapContext.beginPath();
      polygon(this.wallLightMapContext, ...wall.vertices);

      // Subtract other walls below this one so we don't draw this wall's shadow onto them
      walls.filter(w => w.bottom > wallY).forEach(w => {
        const overlap = this.overlap2d(w.bounds, wall.bounds);
        if (overlap) {
          polygon(this.wallLightMapContext, ...this.overlapVertices(overlap).reverse());
        }
      });
      this.wallLightMapContext.clip();

      // Create wall shadow shape
      this.wallLightMapContext.beginPath();
      polygon(
        this.wallLightMapContext,
        vec(min, wallY),
        vec(max, wallY),
        vec(max, Math.max(wallY - h, wall.position.y)),
        vec(min, Math.max(wallY - h, wall.position.y))
      );
      this.wallLightMapContext.fill();
      this.wallLightMapContext.stroke();
      this.wallLightMapContext.restore();
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
