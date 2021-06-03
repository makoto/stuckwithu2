require('dotenv').config()
const argv = require('yargs/yargs')(process.argv.slice(2))
  .option('user', {
    string: true,
    demandOption: true,
  })
  .argv

const fs = require('fs');
// const _ = require('lodash')
import _ from 'lodash'
import { fetchTokenBalances } from './utils'

export const main = async () => {
  let address, limit
  if(argv.user){
    address = argv.user
  }else{
    throw('--token user address is missing')
  }
  if(argv.limit){
    limit = argv.limit
  }
  console.log({address})
  const balances = await fetchTokenBalances(address)
  console.log({balances})
}
console.log(argv)
main()
