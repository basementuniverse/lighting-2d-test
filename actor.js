class Actor {
  constructor(x, y, w, h) {
    this.position = vec(x, y);
    this.size = vec(w, h);
    this.background = 'transparent';
    this.foreground = 'transparent';
    this.gridSize = 20;

    // Dragging and resizing
    this.hovered = false;
    this.dragging = false;
    this.resizing = false;
    this.dragOffset = null;
    this.disposed = false;
  }

  serialize() {
    return {
      type: this.constructor.name,
      position: this.position,
      size: this.size
    };
  }

  static deserialize(data) {
    const c = eval(data.type);
    return new c(
      data.position.x,
      data.position.y,
      data.size.x,
      data.size.y
    );
  }

  get vertices() {
    return [
      vec(this.position.x, this.position.y),                              // 0 - top left
      vec(this.position.x + this.size.x, this.position.y),                // 1 - top right
      vec(this.position.x + this.size.x, this.position.y + this.size.y),  // 2 - bottom right
      vec(this.position.x, this.position.y + this.size.y)                 // 3 - bottom left
    ];
  }

  get bounds() {
    return {
      top: this.position.y,
      bottom: this.position.y + this.size.y,
      left: this.position.x,
      right: this.position.x + this.size.x
    };
  }

  update() {

    // Check if hovered
    const p = input.mousePosition();
    this.hovered = this.dragging || this.resizing || (
      p.x >= this.position.x &&
      p.x <= this.position.x + this.size.x &&
      p.y >= this.position.y &&
      p.y <= this.position.y + this.size.y
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
    this.position.x = Math.floor(this.position.x / this.gridSize) * this.gridSize;
    this.position.y = Math.floor(this.position.y / this.gridSize) * this.gridSize;

    // Handle resizing
    if (this.resizing) {
      this.size = vec.map(
        vec.sub(p, this.position),
        c => Math.max(this.gridSize, c)
      );
    }
    this.size.x = Math.ceil(this.size.x / this.gridSize) * this.gridSize;
    this.size.y = Math.ceil(this.size.y / this.gridSize) * this.gridSize;

    // Delete
    if (this.hovered && input.keyPressed('Delete')) {
      this.disposed = true;
    }
  }

  draw(context) {
    context.save();
    context.beginPath();
    context.rect(
      this.position.x,
      this.position.y,
      this.size.x,
      this.size.y
    );

    // Fill
    context.fillStyle = this.background;
    context.fill();

    // Stroke if hovered
    if (this.hovered) {
      context.lineWidth = 2;
      context.strokeStyle = this.foreground;
      context.stroke();
    }

    context.restore();
  }
}
