import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  ParamDecoratorEnhancer,
  Type,
} from '@nestjs/common'
import {
  ArgumentMetadata,
  CustomParamFactory,
  PipeTransform,
} from '@nestjs/common/interfaces'
import { GqlExecutionContext } from '@nestjs/graphql'

const BoundParameters = Symbol('@@BoundParameters')

type SymbolContainingObject = { [ k: string | number | symbol ]: any }
function getBoundParameters(target: SymbolContainingObject): any[] {
  return target[ BoundParameters ] ?? []
}

function setBoundParameters(target: SymbolContainingObject, args: any[]) {
  if (BoundParameters in target) {
    target[ BoundParameters ] = args
  }
  else {
    Object.defineProperty(target, BoundParameters, {
      value: args,
      enumerable: false,
      configurable: false,
    })
  }
}

type InjectionDictionary = { [ key: string ]: Type<any> }
type MapToInstanceTypes<T extends object> = {
  [ K in keyof T ]: T[ K ] extends Type<infer I> ? I : never
}

type ExtraGetters = {
  /**
   * The metadata of the argument of the underlying {@link PipeTransform}.
   *
   * @type {ArgumentMetadata}
   */
  metadata: ArgumentMetadata

  /**
   * The request instance.
   *
   * @type {*}
   */
  req: any
}

type ProvidedServices<Injections extends InjectionDictionary>
  = MapToInstanceTypes<Injections>

type HandlerFn<Data, Injections extends InjectionDictionary>
  =
  /**
   * The handler function.
   *
   * The returned value will be passed to the parameter.
   *
   * @param {Data | undefined} data The passed to the decorator.
   * @param {ExecutionContext} context The execution context.
   * @param {ProvidedServices<Injections>} services The injected services.
   * @param {ExtraGetters} extraGetters The extra getters for
   * underlying {@link PipeTransform} class.
   *
   * @return {*} The value that will be passed to the parameter.
   */
  (data: Data | undefined, context: ExecutionContext, services: ProvidedServices<Injections>, extraGetters: ExtraGetters) => any


/**
 * Defines route param decorator with services injected according to the
 * given dependencies object.
 *
 * @export
 * @template Injections The injections object type.
 * @param {HandlerFn<any, Injections>} fn The handler function.
 * @param {Injections} [deps] The optional dependencies. If this parameter is
 * not an object, then {@link createParamDecorator} will be called. Otherwise,
 * this object will contain service classes which will be injected and their
 * instances will be set in their corresponding properties.
 *
 * @param {ParamDecoratorEnhancer[]} [enhancers] The optional parameter
 * enhancers.
 *
 * @return {*} A function that will take data that will be passed down to the
 * inner function or pipes, returning a {@link ParameterDecorator}.
 */
export function createParamDecoratorWithInjections<
  Injections extends InjectionDictionary
>(
  fn: HandlerFn<any, Injections>,
  deps?: Injections,
  enhancers?: ParamDecoratorEnhancer[]
) {

  if (typeof deps !== 'object') {
    return createParamDecorator(fn as CustomParamFactory, enhancers)
  }

  type CarrierArray = [ (...args: any[]) => any, any, ExecutionContext ]

  const keys = Object.keys(deps)
  class HiddenProxy implements PipeTransform {
    constructor(...args: any[]) {
      setBoundParameters(this, args)
    }

    transform(carrier: CarrierArray, metadata: ArgumentMetadata) {
      const [ actualFunction, initialData, ctx ] = carrier
      const boundParameters = getBoundParameters(this)

      const getters = this.getInitialData(ctx, metadata)
      const builtParams = boundParameters.reduce((p, s, i) => {
        p[ keys[ i ] ] = s
        return p
      }, {})

      return actualFunction(initialData, ctx, builtParams, getters)
    }

    getInitialData(ctx: ExecutionContext, metadata: ArgumentMetadata) {
      return {
        metadata,
        get req() {
          const type = ctx.getType() as string
          if (type === 'graphql') {
            const gqlCtx = GqlExecutionContext.create(ctx)
            let request = gqlCtx.getContext()?.req
            request ??= gqlCtx.switchToHttp().getRequest()
            return request
          }

          return ctx.switchToHttp().getRequest()
        },
      }
    }
  }

  const types = keys.map(it => deps[ it ])
  Reflect.defineMetadata('design:paramtypes', types, HiddenProxy)
  Injectable()(HiddenProxy)

  return createParamDecorator((data, ctx) => [ fn, data, ctx ], enhancers)
}
