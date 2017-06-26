export class Band {
  constructor(public indexFrom: number, public indexTo: number, public fontWeight: number) {
  }

  width = (): number => {
    let width = this.indexTo - this.indexFrom;
    return width;
  }
}
