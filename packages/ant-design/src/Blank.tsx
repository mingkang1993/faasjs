import { Typography } from 'antd'
import { isNil } from 'lodash'
import { useConfigContext } from './Config'

export type BlankProps = {
  value?: any;
  text?: string;
}

/**
 * If value is undefined or null, return text, otherwise return value.
 *
 * @param options {object}
 * @param options.value {any}
 * @param options.text {string} Default is 'Empty'
 * @returns {JSX.Element}
 *
 * ```ts
 * <Blank value={undefined} text="Empty" />
 * ```
 */
export function Blank (options?: BlankProps): JSX.Element {
  const { Blank } = useConfigContext()

  return !options ||
    isNil(options.value) ||
    (Array.isArray(options.value) && !options.value.length) ||
    options.value === '' ? <Typography.Text disabled>{options?.text || Blank.text}</Typography.Text> : options.value
}
