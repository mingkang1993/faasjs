import {
  Plugin, InvokeData, MountData, DeployData, Next, usePlugin, UseifyPlugin
} from '@faasjs/func'
import { deepMerge } from '@faasjs/deep_merge'
import { Logger } from '@faasjs/logger'
import { Cookie, CookieOptions } from './cookie'
import { Session, SessionOptions } from './session'
import {
  Validator, ValidatorOptions, ValidatorRuleOptions, ValidatorConfig
} from './validator'
import {
  gzipSync, deflateSync, brotliCompressSync
} from 'zlib'

export {
  Cookie, CookieOptions,
  Session, SessionOptions,
  Validator, ValidatorConfig, ValidatorOptions, ValidatorRuleOptions
}

export const ContentType: {
  [key: string]: string
} = {
  plain: 'text/plain',
  html: 'text/html',
  xml: 'application/xml',
  csv: 'text/csv',
  css: 'text/css',
  javascript: 'application/javascript',
  json: 'application/json',
  jsonp: 'application/javascript'
}

export type HttpConfig<
  TParams extends Record<string, any> = any,
  TCookie extends Record<string, string> = any,
  TSession extends Record<string, string> = any
> = {
  [key: string]: any
  name?: string
  config?: {
    [key: string]: any
    /** POST as default */
    method?: 'BEGIN' | 'GET' | 'POST' | 'DELETE' | 'HEAD' | 'PUT' | 'OPTIONS' | 'TRACE' | 'PATCH' | 'ANY'
    timeout?: number
    /** file relative path as default */
    path?: string
    ignorePathPrefix?: string
    functionName?: string
    cookie?: CookieOptions
  }
  validator?: ValidatorConfig<TParams, TCookie, TSession>
}

export type Response = {
  statusCode?: number
  headers?: {
    [key: string]: string
  }
  body?: string
  message?: string
}

export class HttpError extends Error {
  public readonly statusCode: number
  public readonly message: string

  constructor ({
    statusCode,
    message
  }: {
    statusCode?: number
    message: string
  }) {
    super(message)

    if (Error.captureStackTrace) Error.captureStackTrace(this, HttpError)

    this.statusCode = statusCode || 500
    this.message = message
  }
}

const Name = 'http'

export class Http<TParams extends Record<string, any> = any,
  TCookie extends Record<string, string> = any,
  TSession extends Record<string, string> = any
> implements Plugin {
  public readonly type: string = Name
  public readonly name: string = Name

  public headers: {
    [key: string]: string
  }
  public body: any

  public params: TParams
  public cookie: Cookie<TCookie, TSession>
  public session: Session<TSession, TCookie>
  public config: HttpConfig<TParams, TCookie, TSession>
  private readonly validatorOptions?: ValidatorConfig<TParams, TCookie, TSession>
  private response?: Response
  private validator?: Validator<TParams, TCookie, TSession>

  constructor (config?: HttpConfig<TParams, TCookie, TSession>) {
    this.name = config?.name || this.type
    this.config = ((config?.config)) || Object.create(null)
    if ((config?.validator)) this.validatorOptions = config.validator

    this.headers = Object.create(null)
    this.cookie = new Cookie(this.config.cookie || {})
    this.session = this.cookie.session
  }

  public async onDeploy (data: DeployData, next: Next): Promise<void> {
    data.dependencies['@faasjs/http'] = '*'

    await next()

    const logger = new Logger(this.name)
    logger.debug('Generate api gateway\'s config')
    logger.debug('%j', data)

    const config = data.config.plugins ?
      deepMerge(data.config.plugins[this.name || this.type], { config: this.config }) :
      { config: this.config }

    // generate path from file path
    if (!config.config.path) {
      config.config.path = '/' + data.name?.replace(/_/g, '/').replace(/\/index$/, '')
      if (config.config.path === '/index') config.config.path = '/'
      if (config.config.ignorePathPrefix) {
        config.config.path = config.config.path.replace(new RegExp('^' + config.config.ignorePathPrefix), '')
        if (config.config.path === '') config.config.path = '/'
      }
    }

    logger.debug('Api gateway\'s config: %j', config)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Provider = require(config.provider.type).Provider
    const provider = new Provider(config.provider.config)

    await provider.deploy(this.type, data, config)
  }

  public async onMount (data: MountData, next: Next): Promise<void> {
    data.logger.debug('[onMount] merge config')
    if (data.config.plugins && data.config.plugins[this.name || this.type])
      this.config = deepMerge(this.config, data.config.plugins[this.name || this.type].config)

    data.logger.debug('[onMount] prepare cookie & session')
    this.cookie = new Cookie(this.config.cookie || {})
    this.session = this.cookie.session

    if (this.validatorOptions) {
      data.logger.debug('[onMount] prepare validator')
      this.validator = new Validator<TParams, TCookie, TSession>(this.validatorOptions)
    }

    await next()
  }

  public async onInvoke (data: InvokeData, next: Next): Promise<void> {
    this.headers = data.event.headers || Object.create(null)
    this.body = data.event.body
    this.params = Object.create(null)
    this.response = { headers: Object.create(null) }

    if (data.event.body) {
      if (data.event.headers && data.event.headers['content-type'] && data.event.headers['content-type'].includes('application/json')) {
        data.logger.debug('[onInvoke] Parse params from json body')
        this.params = JSON.parse(data.event.body)
      } else {
        data.logger.debug('[onInvoke] Parse params from raw body')
        this.params = data.event.body
      }
      data.logger.debug('[onInvoke] Params: %j', this.params)
    } else if (data.event.queryString) {
      data.logger.debug('[onInvoke] Parse params from queryString')
      this.params = data.event.queryString
      data.logger.debug('[onInvoke] Params: %j', this.params)
    }

    this.cookie.invoke(this.headers.cookie)
    if (this.headers.cookie) {
      data.logger.debug('[onInvoke] Cookie: %j', this.cookie.content)
      data.logger.debug('[onInvoke] Session: %j', this.session.content)
    }

    try {
      if (this.validator) {
        data.logger.debug('[onInvoke] Valid request')

        await this.validator.valid({
          headers: this.headers,
          params: this.params,
          cookie: this.cookie,
          session: this.session,
        }, data.logger)
      }
      await next()
    } catch (error) {
      data.response = error
    }

    // update session
    this.session.update()

    // generate body
    if (data.response)
      // generate error response
      if (data.response instanceof Error || data.response.constructor?.name === 'Error') {
        data.logger.error(data.response)
        this.response.body = JSON.stringify({ error: { message: data.response.message } })
        try {
          this.response.statusCode = data.response.statusCode || 500
        } catch (error) {
          this.response.statusCode = 500
        }
      } else if (Object.prototype.toString.call(data.response) === '[object Object]' && data.response.statusCode && data.response.headers)
        // for directly response
        this.response = data.response
      else
        this.response.body = JSON.stringify({ data: data.response })

    // generate statusCode
    if (!this.response.statusCode)
      this.response.statusCode = this.response.body ? 200 : 201

    // generate headers
    this.response.headers = Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store'
    }, this.cookie.headers(), this.response.headers)

    data.response = Object.assign({}, data.response, this.response)

    const originBody = data.response.body
    data.response.originBody = originBody

    // convert response body to string
    if (originBody && !data.response.isBase64Encoded && typeof originBody !== 'string')
      data.response.body = JSON.stringify(originBody)

    // determine if the body needs to be compressed
    if (
      !data.response.body ||
      data.response.isBase64Encoded ||
      typeof data.response.body !== 'string' ||
      data.response.body.length < 1024
    ) return

    const acceptEncoding = this.headers['accept-encoding'] || this.headers['Accept-Encoding']
    if (!acceptEncoding || !/(br|gzip|deflate)/.test(acceptEncoding)) return

    try {
      if (acceptEncoding.includes('br')) {
        data.response.headers['Content-Encoding'] = 'br'
        data.response.body = brotliCompressSync(originBody).toString('base64')
      } else if (acceptEncoding.includes('gzip')) {
        data.response.headers['Content-Encoding'] = 'gzip'
        data.response.body = gzipSync(originBody).toString('base64')
      } else if (acceptEncoding.includes('deflate')) {
        data.response.headers['Content-Encoding'] = 'deflate'
        data.response.body = deflateSync(originBody).toString('base64')
      } else throw Error('No matched compression.')

      data.response.isBase64Encoded = true
    } catch (error) {
      console.error(error)
      // restore the original body
      data.response.body = originBody
      delete data.response.headers['Content-Encoding']
    }
  }

  /**
   * set header
   * @param key {string} key
   * @param value {*} value
   */
  public setHeader (key: string, value: string): Http<TParams, TCookie, TSession> {
    this.response.headers[key] = value
    return this
  }

  /**
   * set Content-Type
   * @param type {string} 类型
   * @param charset {string} 编码
   */
  public setContentType (type: string, charset: string = 'utf-8'): Http<TParams, TCookie, TSession> {
    if (ContentType[type])
      this.setHeader('Content-Type', `${ContentType[type]}; charset=${charset}`)
    else
      this.setHeader('Content-Type', `${type}; charset=${charset}`)
    return this
  }

  /**
   * set status code
   * @param code {number} 状态码
   */
  public setStatusCode (code: number): Http<TParams, TCookie, TSession> {
    this.response.statusCode = code
    return this
  }

  /**
   * set body
   * @param body {*} 内容
   */
  public setBody (body: string): Http<TParams, TCookie, TSession> {
    this.response.body = body
    return this
  }
}

export function useHttp<TParams extends Record<string, any> = any,
  TCookie extends Record<string, string> = any,
  TSession extends Record<string, string> = any
> (
  config?: HttpConfig<TParams, TCookie, TSession>):
  Http<TParams, TCookie, TSession> & UseifyPlugin
{
  return usePlugin(new Http<TParams, TCookie, TSession>(config))
}
