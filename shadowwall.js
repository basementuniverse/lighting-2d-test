class ShadowWall extends Actor {
  constructor(x, y, w, h) {
    super(x, y, w, h);
    this.background = '#aaa';
    this.foreground = 'red';
  }

  static deserialize(data) {
    return new ShadowWall(
      data.position.x,
      data.position.y,
      data.size.x,
      data.size.y
    );
  }
}
