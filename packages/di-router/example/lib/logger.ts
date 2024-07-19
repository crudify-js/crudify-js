export class Logger {
  constructor(readonly prefix: string) {}

  log(...items: unknown[]) {
    console.log(`Logger(${this.prefix})`, ...items)
  }
}
