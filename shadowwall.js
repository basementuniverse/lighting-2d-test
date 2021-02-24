class ShadowWall extends Actor {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.background = '#aaa';
    this.foreground = 'red';
  }

  get bottom() {
    return this.position.y + this.size.y;
  }
}
