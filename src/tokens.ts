
require('dotenv').config()
const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('token', {
    string: true,
    demandOption: true,
  })
  .argv

const fs = require('fs');
// const _ = require('lodash')
import _ from 'lodash'
import { getTokenholders } from './utils'

export const main = async () => {
  let address, limit
  if(argv.token){
    address = argv.token
  }else{
    throw('--token token address is missing')
  }
  if(argv.limit){
    limit = argv.limit
  }
  console.log({address})
  const holders = await getTokenholders(address)
  console.log({holders})
}
console.log(argv)
main()
