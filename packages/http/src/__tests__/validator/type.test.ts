import { Func } from '@faasjs/func'
import { Http } from '../..'
import { ValidatorRuleOptionsType } from '../../validator'

describe('validator/type', function () {
  describe('params', function () {
    describe('normal', function () {
      test.each<[ValidatorRuleOptionsType, any]>([
        ['string', '"string"'],
        ['boolean', 'false'],
        ['number', '0'],
        ['array', '[]']
      ])('is %p', async function (type: ValidatorRuleOptionsType, value) {
        const http = new Http({ validator: { params: { rules: { key: { type } } } } })
        const handler = new Func({ plugins: [http] }).export().handler

        const res = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: `{"key":${value}}`
        })

        expect(res.statusCode).toEqual(201)

        const res2 = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"key":{}}'
        })

        expect(res2.statusCode).toEqual(500)
        expect(res2.body).toEqual(`{"error":{"message":"[params] key must be a ${type}."}}`)
      })
    })

    describe('onError', function () {
      test('no return', async function () {
        const http = new Http({ validator: { params: { rules: { key: { type: 'boolean' } } } } })
        const handler = new Func({ plugins: [http] }).export().handler

        const res = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"key":1}'
        })

        expect(res.statusCode).toEqual(500)
        expect(res.body).toEqual('{"error":{"message":"[params] key must be a boolean."}}')
      })

      test('return message', async function () {
        const http = new Http({
          validator: {
            params: {
              rules: { key: { type: 'boolean' } },
              onError: function (type, key, value) {
                return { message: `${type} ${key} ${value}` }
              }
            }
          }
        })
        const handler = new Func({ plugins: [http] }).export().handler

        const res = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"key":1}'
        })

        expect(res.statusCode).toEqual(500)
        expect(res.body).toEqual('{"error":{"message":"params.rule.type key 1"}}')
      })

      test('return all', async function () {
        const http = new Http({
          validator: {
            params: {
              rules: { key: { type: 'boolean' } },
              onError: function (type, key, value) {
                return {
                  statusCode: 401,
                  message: `${type} ${key} ${value}`
                }
              }
            }
          }
        })
        const handler = new Func({ plugins: [http] }).export().handler

        const res = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"key":1}'
        })

        expect(res.statusCode).toEqual(401)
        expect(res.body).toEqual('{"error":{"message":"params.rule.type key 1"}}')
      })
    })

    describe('array', function () {
      test.each<[ValidatorRuleOptionsType, any]>([
        ['string', '"string"'],
        ['boolean', 'false'],
        ['number', '0'],
        ['array', '[]']
      ])('is %p', async function (type: ValidatorRuleOptionsType, value) {
        const http = new Http({ validator: { params: { rules: { key: { config: { rules: { sub: { type } } } } } } } })
        const handler = new Func({ plugins: [http] }).export().handler

        const res = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: `{"key":[{"sub":${value}}]}`
        })

        expect(res.statusCode).toEqual(201)

        const res2 = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"key":[{"sub":{}}]}'
        })

        expect(res2.statusCode).toEqual(500)
        expect(res2.body).toEqual(`{"error":{"message":"[params] key.sub must be a ${type}."}}`)
      })
    })

    describe('object', function () {
      test.each<[ValidatorRuleOptionsType, any]>([
        ['string', '"string"'],
        ['boolean', 'false'],
        ['number', '0'],
        ['array', '[]']
      ])('is %p', async function (type: ValidatorRuleOptionsType, value) {
        const http = new Http({ validator: { params: { rules: { key: { config: { rules: { sub: { type } } } } } } } })
        const handler = new Func({ plugins: [http] }).export().handler

        const res = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: `{"key":{"sub":${value}}}`
        })

        expect(res.statusCode).toEqual(201)

        const res2 = await handler({
          httpMethod: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"key":{"sub":{}}}'
        })

        expect(res2.statusCode).toEqual(500)
        expect(res2.body).toEqual(`{"error":{"message":"[params] key.sub must be a ${type}."}}`)
      })
    })
  })

  test('cookie should not work', async function () {
    const http = new Http({ validator: { cookie: { rules: { key: { type: 'number' } } } } })
    const handler = new Func({ plugins: [http] }).export().handler

    const res = await handler({
      httpMethod: 'POST',
      headers: { cookie: 'key=a' }
    })

    expect(res.statusCode).toEqual(201)
  })

  describe('session', function () {
    describe('normal', function () {
      test.each<[ValidatorRuleOptionsType, any]>([
        ['boolean', false],
        ['number', 0],
        ['array', []],
        ['object', {}]
      ])('is %p', async function (type: ValidatorRuleOptionsType, value) {
        const http = new Http({ validator: { session: { rules: { key: { type } } } } })
        const handler = new Func({ plugins: [http] }).export().handler

        await handler({})

        const res = await handler({
          httpMethod: 'POST',
          headers: { cookie: `key=${http.session.encode({ key: value })}` }
        })

        expect(res.statusCode).toEqual(201)

        const res2 = await handler({
          httpMethod: 'POST',
          headers: { cookie: `key=${http.session.encode({ key: '' })}` }
        })

        expect(res2.statusCode).toEqual(500)
        expect(res2.body).toEqual(`{"error":{"message":"[session] key must be a ${type}."}}`)
      })
    })

    describe('array', function () {
      test.each<[ValidatorRuleOptionsType, any]>([
        ['boolean', false],
        ['number', 0],
        ['array', []],
        ['object', {}]
      ])('is %p', async function (type: ValidatorRuleOptionsType, value) {
        const http = new Http({ validator: { session: { rules: { key: { config: { rules: { sub: { type } } } } } } } })
        const handler = new Func({ plugins: [http] }).export().handler

        await handler({ httpMethod: 'POST' })

        const res = await handler({
          httpMethod: 'POST',
          headers: { cookie: `key=${http.session.encode({ key: [{ sub: value }] })}` }
        })

        expect(res.statusCode).toEqual(201)

        const res2 = await handler({
          httpMethod: 'POST',
          headers: { cookie: `key=${http.session.encode({ key: [{ sub: '' }] })}` }
        })

        expect(res2.statusCode).toEqual(500)
        expect(res2.body).toEqual(`{"error":{"message":"[session] key.sub must be a ${type}."}}`)
      })
    })

    describe('object', function () {
      test.each<[ValidatorRuleOptionsType, any]>([
        ['string', 'string'],
        ['boolean', false],
        ['number', 0],
        ['array', []],
        ['object', {}]
      ])('is %p', async function (type: ValidatorRuleOptionsType, value) {
        const http = new Http({ validator: { session: { rules: { key: { config: { rules: { sub: { type } } } } } } } })
        const handler = new Func({ plugins: [http] }).export().handler

        await handler({ httpMethod: 'POST' })

        const res = await handler({
          httpMethod: 'POST',
          headers: { cookie: `key=${http.session.encode({ key: { sub: value } })}` }
        })

        expect(res.statusCode).toEqual(201)

        const res2 = await handler({
          httpMethod: 'POST',
          headers: { cookie: `key=${http.session.encode({ key: { sub: null } })}` }
        })

        expect(res2.statusCode).toEqual(201)
      })
    })
  })
})
