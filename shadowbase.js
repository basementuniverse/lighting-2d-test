class ShadowBase extends Actor {
  constructor(x, y, w, h, d = 1, o = 0) {
    super(x, y, w, h);
    this.offset = o;
    this.depth = d;
    this.background = '#333';
    this.foreground = 'red';
  }

  update() {
    super.update();

    // Change depth
    const DEPTH_STEP_SIZE = 0.2;
    if (this.hovered && input.keyPressed('a')) {
      this.depth += DEPTH_STEP_SIZE;
    }
    if (this.hovered && input.keyPressed('z')) {
      this.depth -= DEPTH_STEP_SIZE;
    }
    this.depth = Math.max(DEPTH_STEP_SIZE, this.depth);

    // Change offset
    const OFFSET_STEP_SIZE = 0.2;
    if (this.hovered && input.keyPressed('s')) {
      this.offset += OFFSET_STEP_SIZE;
    }
    if (this.hovered && input.keyPressed('x')) {
      this.offset -= OFFSET_STEP_SIZE;
    }
    this.offset = Math.max(0, this.offset);
  }

  draw(context) {
    context.save();
    super.draw(context);
    context.fillStyle = 'yellow';
    context.textBaseline = 'top';
    context.font = '10px bold monospace';
    context.fillText(`${this.depth} / ${this.offset}`, this.position.x + 5, this.position.y + 5);
    context.restore();
  }
}
