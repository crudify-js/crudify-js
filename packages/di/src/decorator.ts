import 'reflect-metadata'

export function Inject() {
  return function (target: any) {
    return target
  }
}
