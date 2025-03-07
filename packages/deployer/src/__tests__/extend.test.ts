import { Deployer } from '../index'
import { execSync } from 'child_process'

test('extend', async function () {
  const deployer = new Deployer({
    root: __dirname,
    filename: __dirname + '/funcs/extend.func.ts',
    env: 'testing',
    config: {},
    dependencies: {}
  })

  try {
    await deployer.deploy()
  // eslint-disable-next-line no-empty
  } catch (error) {}

  const res = execSync(`node -e "const handler = require('${deployer.deployData.tmp}index.js').handler;(async function invoke(){console.log('|'+JSON.stringify(await handler(0))+'|');})(handler);"`, { cwd: deployer.deployData.tmp }).toString()

  expect(res.match(/([^|]+)|$/g)[1]).toEqual('2')
})
