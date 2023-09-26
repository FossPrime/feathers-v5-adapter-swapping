// To be completely hookless, it should be done right after this hook, while this hook is the first around app-hook.

import type {
  AroundHookFunction,
  Application,
  HookContext,
  NextFunction,
} from '@feathersjs/feathers'

interface HooklessError extends Error {
  hookless?: Symbol
}

export const hooklessStart =
  (id: Symbol) => async (ctx: HookContext, next: NextFunction) => {
    try {
      await next()
    } catch (unknownError) {
      const error = unknownError as HooklessError
      if (error.hookless === id) {
        const params = {
          disableHookless: id,
          query: ctx.params.query,
        }
        const callFn = ctx.service['_' + ctx.method].bind(ctx.service)
        switch (ctx.method) {
          case 'get':
          case 'remove':
            ctx.result = await callFn(ctx.id, params)
            break
          case 'create':
            debugger
            ctx.result = await callFn(ctx.data, params)
            debugger
            break
          case 'update':
          case 'patch':
            ctx.result = await callFn(ctx.id, ctx.data, params)
            break
          default:
            throw new Error('Unexpected method used in hookless call')
        }
      }
    }
  }

export const hooklessStop =
  (id: Symbol, predicate: Function) =>
  async (ctx: HookContext, next?: NextFunction) => {
    if (ctx.params.disableHookless !== id && (await predicate(ctx))) {
      const error: HooklessError = new Error(`This is a Hookless call`)
      error.hookless = id
      throw error
    } else if (next) {
      return next()
    }
  }

export const hooklessSetup = <ServiceTypes = any, Service = any>(
  predicate: Function
): AroundHookFunction<Application<ServiceTypes, any>, Service>[] => {
  const hooklessId = Symbol('hookless')
  return [hooklessStart(hooklessId), hooklessStop(hooklessId, predicate)]
}
